import { useState, useEffect } from 'react';
import { FiStar } from 'react-icons/fi';
import { reviewAPI } from '../../services/api';
import { ReviewMedia } from '../../components/common/ReviewMedia';

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewAPI.getMyReviews().then(d => setReviews(d.reviews || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">My Reviews</h2>
      {loading ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div> :
      reviews.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiStar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">You haven't reviewed any products yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Reviews can only be submitted for purchased and delivered products</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-start gap-4">
                {r.product?.images?.[0] && <img src={r.product.images[0]} alt="" className="w-16 h-16 object-cover rounded-xl shrink-0" />}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{r.product?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">{[1,2,3,4,5].map(s => <FiStar key={s} className={`w-4 h-4 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}`} />)}</div>
                    {r.isVerifiedPurchase && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">✓ Verified Purchase</span>}
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm mt-2">{r.title}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{r.comment}</p>
                  <ReviewMedia images={r.images} videos={r.videos} className="mt-2" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
