import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiAlertCircle, FiRefreshCw, FiUpload, FiTrash2 } from 'react-icons/fi';
import { useSellerStore } from '../../store/sellerStore';
import { sellerAPI, sellerApi } from '../../services/api';
import SellerLayout from './SellerLayout';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';

const inputClass = 'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100';

export default function SellerProfile() {
  const { seller, sellerUser, updateSellerUser } = useSellerStore();
  const [profileForm, setProfileForm] = useState({ name: sellerUser?.name || '', email: sellerUser?.email || '', phone: sellerUser?.phone || '', avatar: sellerUser?.avatar || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Photo changes save straight away so the top-bar avatar updates at once.
  const [avatarBusy, setAvatarBusy] = useState(false);
  const saveAvatar = async (avatar) => {
    const data = await sellerApi.put('/auth/profile', { avatar });
    updateSellerUser({ ...sellerUser, ...data.user });
    setProfileForm(p => ({ ...p, avatar }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      // /auth/* accepts any valid user JWT, so the seller token works here.
      const data = await sellerApi.put('/auth/profile', profileForm);
      updateSellerUser(data.user);
      toast.success('Profile updated successfully!');
    } catch (err) { toast.error(err.message || 'Failed to update profile'); }
    finally { setProfileSaving(false); }
  };

  const set = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (error) setError('');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) { setError('New passwords do not match'); return; }
    if (form.newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }

    setSaving(true);
    try {
      await sellerApi.put('/auth/update-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SellerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5 flex items-center gap-2">
            <FiUser className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Account Information
          </h3>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                {profileForm.avatar
                  ? <img src={profileForm.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-gray-400">{profileForm.name?.charAt(0)?.toUpperCase() || 'S'}</span>}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Photo</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white ${avatarBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                    <FiUpload className="w-4 h-4" /> {avatarBusy ? 'Please wait…' : profileForm.avatar ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setAvatarBusy(true);
                      try { const data = await sellerAPI.uploadImage(file); await saveAvatar(data.url); toast.success('Profile photo updated'); }
                      catch (error) { toast.error(error.message || 'Photo upload failed'); }
                      finally { setAvatarBusy(false); }
                    }} />
                  </label>
                  {profileForm.avatar && (
                    <button type="button" disabled={avatarBusy} onClick={async () => {
                      setAvatarBusy(true);
                      try { await saveAvatar(''); toast.success('Profile photo removed'); }
                      catch (error) { toast.error(error.message || 'Could not remove photo'); }
                      finally { setAvatarBusy(false); }
                    }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">
                      <FiTrash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
            </div>
            <button disabled={profileSaving} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-60"><FiSave /> {profileSaving ? 'Saving...' : 'Save Profile'}</button>
          </form>
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl space-y-1">
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">Shop: {seller?.shopName}</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Status: <span className="capitalize font-semibold">{seller?.status}</span></p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Slug: /{seller?.shopSlug}</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Plan: {seller?.planSnapshot?.name || '—'} · Expires: {seller?.planExpiresAt ? new Date(seller.planExpiresAt).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <Link to="/seller/plan"
            className="mt-4 flex items-center justify-between gap-2 px-4 py-3 border border-indigo-200 dark:border-indigo-500/30 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Renew or change plan</span>
            <FiRefreshCw className="w-4 h-4 text-indigo-600" />
          </Link>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5 flex items-center gap-2">
            <FiLock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Change Password
          </h3>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { label: 'Current Password', field: 'currentPassword', placeholder: 'Enter current password' },
              { label: 'New Password', field: 'newPassword', placeholder: 'Min 6 characters' },
              { label: 'Confirm New Password', field: 'confirmPassword', placeholder: 'Re-enter new password' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <PasswordInput value={form[field]} onChange={set(field)} required
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800" />
              </div>
            ))}
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 text-sm transition-colors">
              <FiSave className="w-4 h-4" /> {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </SellerLayout>
  );
}
