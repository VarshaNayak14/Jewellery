import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiPackage } from 'react-icons/fi';
import { reviewAPI } from '../../services/api';
import { ReviewMedia } from '../../components/common/ReviewMedia';

function StarRow({ rating, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <FiStar key={s} className={`${sz} ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-4 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof reviewAPI.getMyReviews !== 'function') { setLoading(false); return; }
    reviewAPI.getMyReviews()
      .then(d => setReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({
    label: n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">My Reviews</h2>
        <p className="text-sm text-gray-500 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''} submitted</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse flex gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                <div className="h-12 bg-gray-100 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiStar className="w-9 h-9 text-amber-200" />
          </div>
          <p className="font-bold text-gray-700 mb-1">No reviews yet</p>
          <p className="text-sm text-gray-400">Reviews can only be submitted for delivered products</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-black text-gray-900 leading-none">{avgRating}</p>
                <StarRow rating={Math.round(avgRating)} size="md" />
                <p className="text-xs text-gray-400 mt-1">{reviews.length} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingCounts.map(r => (
                  <RatingBar key={r.label} label={r.label} count={r.count} total={reviews.length} />
                ))}
              </div>
            </div>
          </div>

          {/* Review Cards */}
          {reviews.map((r, idx) => (
            <motion.div key={r._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                  {r.product?.images?.[0]
                    ? <img src={r.product.images[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-6 h-6 text-gray-300" />
                      </div>}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Product Name */}
                  <p className="font-bold text-gray-900 text-sm truncate">{r.product?.name}</p>

                  {/* Rating + Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <StarRow rating={r.rating} />
                    <span className="text-xs font-bold text-amber-600">{r.rating}.0</span>
                    {r.isVerifiedPurchase && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  {/* Review Title */}
                  {r.title && (
                    <p className="text-sm font-bold text-gray-900 mt-2">{r.title}</p>
                  )}

                  {/* Review Comment */}
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.comment}</p>

                  {/* Review photos & videos */}
                  <ReviewMedia images={r.images} videos={r.videos} className="mt-3" />

                  {/* Date */}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
