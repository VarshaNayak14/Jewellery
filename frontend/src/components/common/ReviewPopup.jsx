import { useState, useEffect } from 'react';
import { reviewAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import ReviewModal from './ReviewModal';

// Auto-prompt shown once per login when the customer has a delivered order
// item they haven't reviewed yet — surfaces the review flow instead of
// waiting for them to find the passive form on the product page.
export default function ReviewPopup() {
  const { isAuthenticated } = useAuthStore();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const dismissedIds = JSON.parse(sessionStorage.getItem('reviewPopupDismissed') || '[]');
    reviewAPI.getPending()
      .then((data) => {
        if (data.pending && !dismissedIds.includes(data.pending.productId)) {
          setPending(data.pending);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const close = () => {
    if (pending) {
      const dismissedIds = JSON.parse(sessionStorage.getItem('reviewPopupDismissed') || '[]');
      sessionStorage.setItem('reviewPopupDismissed', JSON.stringify([...dismissedIds, pending.productId]));
    }
    setPending(null);
  };

  if (!pending) return null;

  return (
    <ReviewModal
      product={pending}
      cancelLabel="Maybe Later"
      onClose={close}
      onSubmitted={() => setPending(null)}
    />
  );
}
