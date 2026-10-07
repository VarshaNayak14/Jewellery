import { useState } from 'react';
import { FiUser, FiSave, FiLock, FiEye, FiEyeOff, FiCamera, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authAPI, userAPI } from '../../services/api';

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
const cardClass = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm';

const ROLE_LABELS = { superadmin: 'Super Admin', admin: 'Admin', courier: 'Courier Partner', seller: 'Seller', user: 'Customer' };

function PasswordInput({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} required minLength={6} className={`${inputClass} pr-10`} />
        <button type="button" onClick={onToggle} tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          {show ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// Profile + change-password cards for any panel logged in with the main user
// token (admin, super admin, courier, customer). Seller panel has its own
// token and uses SellerProfile instead.
export default function AccountSettings() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', avatar: user?.avatar || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({});
  const [changingPw, setChangingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authAPI.updateProfile(form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (error) { toast.error(error.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await userAPI.uploadAvatar(file);
      await saveAvatar(data.url);
      toast.success('Profile photo updated');
    } catch (error) { toast.error(error.message || 'Photo upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  // Photo changes save straight away so the panel avatar updates at once.
  const saveAvatar = async (avatar) => {
    const data = await authAPI.updateProfile({ avatar });
    updateUser(data.user);
    setForm(p => ({ ...p, avatar }));
  };

  const removePhoto = async () => {
    setUploading(true);
    try { await saveAvatar(''); toast.success('Profile photo removed'); }
    catch (error) { toast.error(error.message || 'Could not remove photo'); }
    finally { setUploading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('New passwords do not match');
    setChangingPw(true);
    try {
      await authAPI.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPw({});
    } catch (error) { toast.error(error.message || 'Failed to change password'); }
    finally { setChangingPw(false); }
  };

  const setPw = key => e => setPwForm(p => ({ ...p, [key]: e.target.value }));
  const togglePw = key => () => setShowPw(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={cardClass}>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
          <FiUser className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Account Information
        </h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                {form.avatar
                  ? <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-gray-400 dark:text-gray-500">{form.name?.charAt(0)?.toUpperCase() || <FiUser />}</span>}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow hover:bg-blue-700">
                <FiCamera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[user?.role] || user?.role}</p>
              {uploading && <p className="text-xs text-blue-600 mt-1">Please wait...</p>}
              {!uploading && form.avatar && (
                <button type="button" onClick={removePhoto} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                  <FiTrash2 className="w-3 h-3" /> Remove photo
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Full Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Phone</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
          </div>
          <button disabled={saving || uploading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-60">
            <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className={`${cardClass} h-fit`}>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
          <FiLock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Change Password
        </h3>
        <form onSubmit={changePassword} className="space-y-4">
          <PasswordInput label="Current Password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} show={showPw.currentPassword} onToggle={togglePw('currentPassword')} />
          <PasswordInput label="New Password (min 6 characters)" value={pwForm.newPassword} onChange={setPw('newPassword')} show={showPw.newPassword} onToggle={togglePw('newPassword')} />
          <PasswordInput label="Confirm New Password" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} show={showPw.confirmPassword} onToggle={togglePw('confirmPassword')} />
          <button disabled={changingPw} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-60">
            <FiLock className="w-4 h-4" /> {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
