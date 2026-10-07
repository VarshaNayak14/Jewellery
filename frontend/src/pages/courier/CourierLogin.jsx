import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiMapPin, FiClock, FiPackage, FiShield } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import AuthLayout, { AuthInput, AuthButton, AuthError } from '../../components/auth/AuthLayout';

const PERKS = [
  { icon: FiPackage, text: 'Every parcel assigned to you, in one place' },
  { icon: FiMapPin, text: 'Full pickup & drop addresses' },
  { icon: FiShield, text: 'Sealed, insured handover for high-value pieces' },
  { icon: FiClock, text: 'Mark picked up, in transit and delivered' },
];

export default function CourierLogin() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form);
    if (result.success) {
      const role = useAuthStore.getState().user?.role;
      if (role !== 'courier') {
        useAuthStore.getState().logout();
        setError('This account is not registered as a courier partner.');
        return;
      }
      toast.success('Welcome back!');
      navigate('/courier');
    } else {
      setError(result.message || 'Login failed');
    }
  };

  return (
    <AuthLayout
      image="/jewelry/campaign.jpg"
      eyebrow="Delivery partner"
      title={<>Every piece, <em>delivered safely</em>.</>}
      subtitle="Your deliveries, returns and earnings — all in one place."
      perks={PERKS}
      footnote="Courier accounts are created by Admin or your jeweller — contact support if you need one."
      formTitle="Courier sign in"
      formSubtitle="Manage your assigned orders & delivery status."
    >
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput icon={FiMail} label="Email address" type="email" required autoComplete="email"
          value={form.email} onChange={set('email')} placeholder="courier@example.com" />
        <AuthInput icon={FiLock} label="Password" type={showPass ? 'text' : 'password'} required autoComplete="current-password"
          value={form.password} onChange={set('password')} placeholder="Your password"
          right={(
            <button type="button" onClick={() => setShowPass((v) => !v)} className="auth-muted hover:opacity-80" aria-label="Show password">
              {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          )} />
        <AuthButton type="submit" loading={isLoading} className="!mt-6">
          Sign in <FiArrowRight className="w-4 h-4" />
        </AuthButton>
      </form>

      <div className="flex items-center justify-center gap-4 mt-6 text-xs auth-muted">
        <Link to="/login" className="hover:underline">← Customer login</Link>
        <span>·</span>
        <Link to="/seller/login" className="hover:underline">Jeweller portal</Link>
        <span>·</span>
        <Link to="/" className="hover:underline">Store</Link>
      </div>
    </AuthLayout>
  );
}
