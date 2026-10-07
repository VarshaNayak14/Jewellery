import { Navigate, useLocation } from 'react-router-dom';
import { useSellerStore } from '../../store/sellerStore';

// Pages an expired-plan seller can still open (to renew / manage account).
const EXPIRED_ALLOWED = ['/seller/plan', '/seller/profile', '/seller/support'];

export default function SellerRoute({ children }) {
  const { isSellerAuthenticated, seller } = useSellerStore();
  const { pathname } = useLocation();
  if (!isSellerAuthenticated) return <Navigate to="/seller/login" replace />;
  const expired = seller?.planExpiresAt && new Date(seller.planExpiresAt) <= new Date();
  if (expired && !EXPIRED_ALLOWED.includes(pathname)) return <Navigate to="/seller/plan" replace />;
  return children;
}
