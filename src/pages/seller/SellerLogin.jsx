import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiPackage, FiTrendingUp, FiDollarSign, FiAward } from 'react-icons/fi';
import { useSellerStore } from '../../store/sellerStore';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import AuthLayout, { AuthInput, AuthButton, AuthError, AuthDivider } from '../../components/auth/AuthLayout';

const PERKS = [
  { icon: FiPackage, text: 'List rings, necklaces & bridal sets with variants' },
  { icon: FiAward, text: 'Hallmark, HUID & certificate on every listing' },
  { icon: FiTrendingUp, text: 'Live gold-rate pricing, updated automatically' },
  { icon: FiDollarSign, text: 'Earnings & payouts straight to your bank' },
];

export default function SellerLogin() {
  const navigate = useNavigate();
  const { login, isLoading } = useSellerStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form);
    if (result.success) {
      toast.success('Welcome back to your jeweller dashboard!');
      navigate('/seller/dashboard');
    } else {
      setError(result.message || 'Login failed');
    }
  };

  return (
    <AuthLayout
      image="/jewelry/gold-detail.jpg"
      eyebrow="Jeweller portal"
      title={<>Bring your <em>showroom</em> online.</>}
      subtitle="Manage your catalogue, orders and earnings — and let customers nearby discover your store."
      perks={PERKS}
      footnote="For registered jewellers and showrooms"
      formTitle="Jeweller sign in"
      formSubtitle="Access your store dashboard."
    >
      <div className="flex justify-end -mt-4 mb-4"><LanguageSwitcher /></div>
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput icon={FiMail} label="Email address" type="email" required autoComplete="email"
          value={form.email} onChange={set('email')} placeholder="store@example.com" />
        <AuthInput icon={FiLock} label="Password" type={showPass ? 'text' : 'password'} required autoComplete="current-password"
          value={form.password} onChange={set('password')} placeholder="Your password"
          right={(
            <button type="button" onClick={() => setShowPass((v) => !v)} className="auth-muted hover:opacity-80" aria-label="Show password">
              {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          )} />
        <AuthButton type="submit" loading={isLoading} className="!mt-6">
          Open dashboard <FiArrowRight className="w-4 h-4" />
        </AuthButton>
      </form>

      <AuthDivider>New jeweller?</AuthDivider>
      <Link to="/seller/register" className="auth-btn-ghost w-full !text-sm !py-3">
        Register your jewellery store <FiArrowRight className="w-4 h-4" />
      </Link>

      <div className="flex items-center justify-center gap-4 mt-6 text-xs auth-muted">
        <Link to="/login" className="hover:underline">← Customer login</Link>
        <span>·</span>
        <Link to="/" className="hover:underline">Back to store</Link>
      </div>
    </AuthLayout>
  );
}
