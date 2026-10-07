import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getStoreSlugFromPath, getStorePath } from '../../utils/subdomain';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const storeSlug = getStoreSlugFromPath(location.pathname);
  const storeBasePath = storeSlug ? getStorePath(storeSlug) : '';
  const loginPath = storeBasePath ? `${storeBasePath}/login` : '/login';
  const isCustomer = user?.role === 'user';

  // Only customer accounts can access wishlist / checkout flows. Admins,
  // superadmins, couriers and guest users are blocked from these shopper paths.
  if (!isAuthenticated) return <Navigate to={loginPath} replace state={{ from: location }} />;
  if (!isCustomer) return <Navigate to={storeBasePath || '/'} replace />;
  return children;
}
