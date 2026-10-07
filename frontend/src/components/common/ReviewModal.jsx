import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { reviewAPI } from '../../services/api';
import { ReviewMediaUploader } from './ReviewMedia';

// Shared review-submission modal — used both by the auto post-delivery
// popup (ReviewPopup) and the "Rate & Review" button on My Orders, so the
// same form/validation/upload logic isn't duplicated between them.
export default function ReviewModal({
  product,
  heading = 'Rate your order',
  subheading = 'Your product has been delivered. How was it?',
  cancelLabel = 'Cancel',
  onClose,
  onSubmitted,
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);
    try {
      const data = await reviewAPI.create({ productId: product.productId, rating, title, comment, images: media.images, videos: media.videos });
      toast.success('Thanks for your review!');
      onSubmitted?.(data.review);
    } catch (err) {
      // Already reviewed (e.g. an earlier attempt was saved but the response
      // was an error): nothing left to submit, so close instead of leaving the
      // user stuck on a form that can never succeed.
      if (/already reviewed/i.test(err.message || '')) {
        toast('You have already reviewed this product');
        onSubmitted?.();
      } else {
        toast.error(err.message || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FiX />
          </button>

          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{heading}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subheading}</p>

            <Link
              to={`/product/${product.productId}`}
              onClick={onClose}
              className="flex items-center gap-3 mb-5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {product.image && (
                <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
              )}
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{product.name}</span>
            </Link>

            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-all hover:scale-110 ${star <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    <FiStar className={star <= rating ? 'fill-current' : ''} />
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Review title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                placeholder="Tell us about the product..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Add photos / videos (optional)</label>
                <ReviewMediaUploader images={media.images} videos={media.videos} onChange={setMedia} />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
