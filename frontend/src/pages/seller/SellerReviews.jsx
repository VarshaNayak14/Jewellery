import { useState, useEffect } from 'react';
import { FiStar, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { sellerAPI } from '../../services/api';
import SellerLayout from './SellerLayout';
import { ReviewMedia } from '../../components/common/ReviewMedia';

const StarRating = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <FiStar key={s} className={`w-4 h-4 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}`} />
    ))}
  </div>
);

export default function SellerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    sellerAPI.getReviews().then(d => setReviews(d.reviews || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return toast.error('Enter reply text');
    setSubmitting(true);
    try {
      await sellerAPI.replyToReview(reviewId, { reply: replyText });
      toast.success('Reply posted!');
      setReplyingId(null);
      setReplyText('');
      const data = await sellerAPI.getReviews();
      setReviews(data.reviews || []);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reviews & Ratings</h1>
        <div className="flex items-center gap-2">
          <FiStar className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{avgRating}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">({reviews.length} reviews)</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiStar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {r.user?.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{r.user?.name}</p>
                      {r.isVerifiedPurchase && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">✓ Verified</span>}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <StarRating rating={r.rating} />
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm mt-2">{r.title}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{r.comment}</p>
                  {r.product && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Product: {r.product.name}</p>}
                  <ReviewMedia images={r.images} videos={r.videos} className="mt-2" />

                  {/* Seller Reply */}
                  {r.sellerReply ? (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">Your Reply:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">{r.sellerReply}</p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      {replyingId === r._id ? (
                        <div className="space-y-2">
                          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3}
                            placeholder="Write your reply to the customer..."
                            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleReply(r._id)} disabled={submitting}
                              className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                              {submitting ? 'Posting...' : 'Post Reply'}
                            </button>
                            <button onClick={() => { setReplyingId(null); setReplyText(''); }}
                              className="border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setReplyingId(r._id); setReplyText(''); }}
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                          <FiMessageSquare className="w-4 h-4" /> Reply to Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </SellerLayout>
  );
}
