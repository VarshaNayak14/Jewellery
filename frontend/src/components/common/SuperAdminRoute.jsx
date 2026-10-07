import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function SuperAdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/" replace />;
  return children;
}