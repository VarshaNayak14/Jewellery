import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function CourierRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/courier/login" replace />;
  if (user?.role !== 'courier') return <Navigate to="/" replace />;
  return children;
}
