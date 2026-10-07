import { useState } from 'react';
import { FiLock, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import PasswordInput from '../../components/common/PasswordInput';

export default function SecuritySettings() {
  const { logout } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await authAPI.updatePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Security Settings</h2>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><FiLock className="w-4 h-4" /> Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {[
            { label: 'Current Password', key: 'currentPassword' },
            { label: 'New Password', key: 'newPassword' },
            { label: 'Confirm New Password', key: 'confirmPassword' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{f.label}</label>
              <PasswordInput value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
            <FiLock className="w-4 h-4" /> {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Logout All Devices */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2"><FiShield className="w-4 h-4" /> Account Security</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">If you suspect unauthorized access to your account, log out from all devices immediately.</p>
        <button onClick={() => { logout(); toast.success('Logged out from all sessions'); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          <FiAlertTriangle className="w-4 h-4" /> Logout From All Devices
        </button>
      </div>

    </div>
  );
}