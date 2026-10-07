import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiLock, FiShield, FiAlertTriangle, FiEye, FiEyeOff, FiCheck, FiKey, FiRefreshCw, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',       ok: /[a-z]/.test(password) },
    { label: 'Number',                 ok: /[0-9]/.test(password) },
    { label: 'Special character',      ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const pct = (score / checks.length) * 100;
  const label = score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color = score <= 1 ? 'bg-blue-400' : score <= 3 ? 'bg-amber-400' : score === 4 ? 'bg-blue-400' : 'bg-emerald-400';
  const textColor = score <= 1 ? 'text-blue-600' : score <= 3 ? 'text-amber-600' : score === 4 ? 'text-blue-600' : 'text-emerald-600';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-bold ml-3 ${textColor}`}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 text-xs transition-colors ${c.ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              {c.ok && <FiCheck className="w-2 h-2 text-emerald-600" />}
            </div>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, placeholder = '••••••••' }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-2xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          {show ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const { logout } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword)
      return toast.error('New passwords do not match');
    if (form.newPassword.length < 8)
      return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await authAPI.updatePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const SECURITY_TIPS = [
    { icon: FiKey, tip: 'Use a unique password that you don\'t use elsewhere' },
    { icon: FiEyeOff, tip: 'Never share your password with anyone' },
    { icon: FiRefreshCw, tip: 'Change your password every 3–6 months' },
    { icon: FiMail, tip: 'Watch out for phishing emails from fake LuxeFit addresses' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account security and password</p>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">
            <FiLock className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Change Password</h3>
            <p className="text-xs text-gray-400">Update your account password</p>
          </div>
        </div>

        <div className="p-5">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <PasswordInput label="Current Password" value={form.currentPassword}
              onChange={e => setForm({ ...form, currentPassword: e.target.value })} />

            <div>
              <PasswordInput label="New Password" value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })} />
              <PasswordStrength password={form.newPassword} />
            </div>

            <div>
              <PasswordInput label="Confirm New Password" value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
              {form.confirmPassword && form.newPassword && (
                <p className={`text-xs mt-1.5 font-semibold flex items-center gap-1 ${
                  form.newPassword === form.confirmPassword ? 'text-emerald-600' : 'text-blue-500'
                }`}>
                  {form.newPassword === form.confirmPassword
                    ? <><FiCheck className="w-3.5 h-3.5" /> Passwords match</>
                    : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <button type="submit" disabled={saving || form.newPassword !== form.confirmPassword}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-md shadow-rose-200">
              <FiLock className="w-4 h-4" />
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
            <FiAlertTriangle className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Account Security</h3>
            <p className="text-xs text-gray-400">Manage active sessions</p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            If you suspect unauthorized access to your account, immediately log out from all devices to secure your account.
          </p>
          <button
            onClick={() => { logout(); toast.success('Logged out from all sessions'); }}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-colors shadow-md shadow-blue-200">
            <FiAlertTriangle className="w-4 h-4" />
            Logout From All Devices
          </button>
        </div>
      </div>

      {/* 2FA Coming Soon */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
            <FiShield className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm">Two-Factor Authentication</h3>
            <p className="text-xs text-gray-400">Extra layer of security for your account</p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Coming Soon</span>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Two-factor authentication is not available for this account.
          </p>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex items-center gap-3">
            <FiLock className="w-5 h-5 text-violet-500 shrink-0" aria-hidden="true" />
            <p className="text-sm text-violet-700 font-medium">2FA via SMS and authenticator apps will be available soon.</p>
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <FiShield className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-white text-sm">Security Tips</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECURITY_TIPS.map((tip, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-start gap-3 bg-white/10 rounded-2xl p-3 border border-white/10">
              <tip.icon className="w-5 h-5 shrink-0 text-amber-300" aria-hidden="true" />
              <p className="text-xs text-gray-300 leading-relaxed">{tip.tip}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}