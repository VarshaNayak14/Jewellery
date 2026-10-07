import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiArrowRight, FiCheck,
  FiHeart, FiPackage, FiBell, FiAward,
} from 'react-icons/fi';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { consumePendingActions } from '../utils/pendingAction';
import toast from 'react-hot-toast';
import AuthLayout, { AuthInput, AuthButton, AuthError } from '../components/auth/AuthLayout';

const PERKS = [
  { icon: FiHeart, text: 'Save favourites to your wishlist' },
  { icon: FiPackage, text: 'Track every order to your door' },
  { icon: FiBell, text: 'First look at new collections & offers' },
  { icon: FiAward, text: 'Keep your hallmark certificates in one place' },
];

const STRENGTH = [
  { label: 'Too short', cls: 'bg-red-400' },
  { label: 'Weak', cls: 'bg-orange-400' },
  { label: 'Fair', cls: 'bg-amber-400' },
  { label: 'Strong', cls: 'bg-emerald-500' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    return s;
  })();

  const mismatch = form.confirmPassword && form.password !== form.confirmPassword;
  const matches = form.confirmPassword && form.password === form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    const result = await registerUser({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    if (result.success) {
      const replayed = consumePendingActions({
        addToCart: useCartStore.getState().addToCart,
        toggleWishlist: useWishlistStore.getState().toggleWishlist,
      });
      toast.success(replayed ? 'Account created! Item added to your cart.' : 'Account created — welcome!');
      navigate('/');
    } else setError(result.message || 'Registration failed');
  };

  const eye = (shown, toggle) => (
    <button type="button" onClick={toggle} className="auth-muted hover:opacity-80" aria-label="Show password">
      {shown ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
    </button>
  );

  return (
    <AuthLayout
      image="/jewelry/earrings.jpg"
      eyebrow="Join us"
      title={<>Begin your own <em>collection</em>.</>}
      subtitle="Create a free account in under a minute and shop fine jewellery from trusted jewellers near you."
      perks={PERKS}
      footnote="Free forever · No card needed"
      formTitle="Create your account"
      formSubtitle="It only takes a minute."
    >
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput icon={FiUser} label="Full name" required autoComplete="name"
          value={form.name} onChange={set('name')} placeholder="Your full name" />
        <div className="grid sm:grid-cols-2 gap-4">
          <AuthInput icon={FiMail} label="Email" type="email" required autoComplete="email"
            value={form.email} onChange={set('email')} placeholder="you@example.com" />
          <AuthInput icon={FiPhone} label="Phone" type="tel" required autoComplete="tel"
            value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
        </div>

        <div>
          <AuthInput icon={FiLock} label="Password" type={showPass ? 'text' : 'password'} required autoComplete="new-password"
            value={form.password} onChange={set('password')} placeholder="Min 6 characters"
            right={eye(showPass, () => setShowPass((v) => !v))} />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? STRENGTH[strength - 1].cls : 'auth-hair'}`} />
                ))}
              </div>
              <span className="text-xs auth-muted">{STRENGTH[strength - 1]?.label || ''}</span>
            </div>
          )}
        </div>

        <AuthInput icon={FiLock} label="Confirm password" type={showConfirmPass ? 'text' : 'password'} required autoComplete="new-password"
          value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" invalid={mismatch}
          right={(
            <span className="flex items-center gap-2">
              {matches && <FiCheck className="w-4 h-4 text-emerald-500" />}
              {eye(showConfirmPass, () => setShowConfirmPass((v) => !v))}
            </span>
          )} />

        <AuthButton type="submit" loading={isLoading} className="!mt-6">
          Create account <FiArrowRight className="w-4 h-4" />
        </AuthButton>
      </form>

      <p className="text-center text-sm auth-muted mt-6">
        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
      </p>
      <p className="text-center text-xs auth-muted mt-3">
        Own a jewellery shop? <Link to="/seller/register" className="auth-link">Sell with us</Link>
      </p>
    </AuthLayout>
  );
}
