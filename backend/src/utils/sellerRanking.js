const Seller = require('../models/Seller');
const { RANKING_SORT_FIELD } = require('./planCapabilities');

// ─────────────────────────────────────────────────────────────────────────
// Who comes first when several shops reach the same location.
//
//   1. Plan search ranking   Platinum (state-level top) > Gold (city-level
//                            top) > Silver (priority) > Basic (standard)
//   2. Rating score          Bayesian average — a shop's rating pulled
//                            toward a neutral PRIOR until it has enough
//                            reviews, so one 5★ review can't beat a steady
//                            4.7★ over 200 reviews
//   3. Verified shop
//   4. Number of reviews
//   5. Daily rotation        shops still exactly equal take turns at the
//                            top, one order per day — the oldest shop is
//                            not always first
// ─────────────────────────────────────────────────────────────────────────

const PRIOR_RATING = 3.5;   // what a shop with no reviews is assumed to be
const PRIOR_WEIGHT = 5;     // how many reviews that assumption is worth

const rankScoreOf = (avgRating = 0, numRatings = 0) =>
  Number(((PRIOR_WEIGHT * PRIOR_RATING + numRatings * avgRating) / (PRIOR_WEIGHT + numRatings)).toFixed(4));

const ROTATION_PRIME = 1000003;

// Seller docs matching `filter`, in ranking order, as plain objects.
async function findRankedSellers(filter, { fields, skip = 0, limit = 20 } = {}) {
  const day = Math.floor(Date.now() / 86400000);
  const daySeed = (day % (ROTATION_PRIME - 2)) + 2;
  const project = fields
    ? Object.fromEntries(fields.split(/\s+/).filter(Boolean).map(f => [f, 1]))
    : null;
  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        _rankScore: { $ifNull: ['$rankScore', PRIOR_RATING] },
        // Same for everyone today, different tomorrow.
        _rotation: {
          $mod: [{ $multiply: [{ $mod: [{ $toLong: { $toDate: '$_id' } }, ROTATION_PRIME] }, daySeed] }, ROTATION_PRIME],
        },
      },
    },
    { $sort: { [RANKING_SORT_FIELD]: -1, _rankScore: -1, isVerified: -1, numRatings: -1, _rotation: 1, _id: 1 } },
    { $skip: skip },
    { $limit: limit },
  ];
  if (project) pipeline.push({ $project: project });
  return Seller.aggregate(pipeline);
}

module.exports = { findRankedSellers, rankScoreOf, PRIOR_RATING };
