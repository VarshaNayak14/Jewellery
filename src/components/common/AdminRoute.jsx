import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// `permission` is an AVAILABLE_PERMISSIONS key (see superAdminController.js).
// A regular 'admin' staff account without that grant gets bounced to /admin;
// 'superadmin' always has full access regardless of the permissions array.
export default function AdminRoute({ children, permission }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return <Navigate to="/" replace />;
  if (permission && user.role !== 'superadmin' && !user.permissions?.includes(permission)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
