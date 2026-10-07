import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiAward,
  FiRefreshCcw, FiShield, FiHome, FiTruck, FiGift,
} from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { consumePendingActions } from '../utils/pendingAction';
import toast from 'react-hot-toast';
import AuthLayout, { AuthInput, AuthButton, AuthError, AuthDivider } from '../components/auth/AuthLayout';

const PERKS = [
  { icon: FiAward, text: 'BIS hallmarked gold & certified diamonds' },
  { icon: FiGift, text: 'Gift-ready packaging on every order' },
  { icon: FiRefreshCcw, text: 'Easy exchange & lifetime buyback' },
  { icon: FiShield, text: 'Insured, 100% secure delivery' },
];

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || { pathname: '/' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form);
    if (result.success) {
      const role = useAuthStore.getState().user?.role;
      if (role === 'user') {
        const replayed = consumePendingActions({
          addToCart: useCartStore.getState().addToCart,
          toggleWishlist: useWishlistStore.getState().toggleWishlist,
        });
        toast.success(replayed ? 'Welcome back! Item added.' : 'Welcome back!');
      } else {
        toast.success('Welcome back!');
      }
      if (role === 'superadmin') navigate('/superadmin', { replace: true });
      else if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'courier') navigate('/courier', { replace: true });
      else navigate(`${from.pathname || '/'}${from.search || ''}`, { replace: true });
    } else {
      setError(result.message || 'Invalid email or password');
    }
  };

  return (
    <AuthLayout
      image="/jewelry/necklace.jpg"
      eyebrow="Welcome back"
      title={<>Pieces made to be <em>treasured</em>, every day.</>}
      subtitle="Sign in to see your wishlist, track orders and pick up right where you left off."
      perks={PERKS}
      footnote="Hallmarked · Certified · Insured shipping across India"
      formTitle="Sign in"
      formSubtitle="Good to see you again."
    >
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          icon={FiMail} label="Email address" type="email" required autoComplete="email"
          value={form.email} placeholder="you@example.com"
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <AuthInput
          icon={FiLock} label="Password" type={showPass ? 'text' : 'password'} required autoComplete="current-password"
          value={form.password} placeholder="Your password"
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          right={(
            <button type="button" onClick={() => setShowPass((v) => !v)} className="auth-muted hover:opacity-80" aria-label="Show password">
              {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          )}
        />
        <AuthButton type="submit" loading={isLoading} className="!mt-6">
          Sign in <FiArrowRight className="w-4 h-4" />
        </AuthButton>
      </form>

      <AuthDivider>Partners</AuthDivider>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/seller/login" className="auth-btn-ghost"><FiHome className="w-3.5 h-3.5" /> Jeweller login</Link>
        <Link to="/courier/login" className="auth-btn-ghost"><FiTruck className="w-3.5 h-3.5" /> Courier login</Link>
      </div>

      <p className="text-center text-sm auth-muted">
        New here? <Link to="/register" className="auth-link">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
