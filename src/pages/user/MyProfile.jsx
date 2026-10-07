import { useState, useEffect } from 'react';
import { FiUser, FiSave, FiPlus, FiTrash2, FiMapPin, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authAPI, userAPI } from '../../services/api';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import AddressFields, { EMPTY_ADDRESS, validateAddress, withStreet } from '../../components/common/AddressFields';

export default function MyProfile() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '' });
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addrForm, setAddrForm] = useState({ ...EMPTY_ADDRESS, isDefault: false });
  const [pinInfo, setPinInfo] = useState(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '', avatar: user.avatar || '' });
      setAddresses(user.addresses || []);
    }
  }, [user]);

  // Photo changes save straight away so the navbar avatar updates at once.
  const [avatarBusy, setAvatarBusy] = useState(false);
  const saveAvatar = async (avatar) => {
    const data = await authAPI.updateProfile({ avatar });
    updateUser(data.user);
    setForm(p => ({ ...p, avatar }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authAPI.updateProfile(form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    const error = validateAddress(addrForm, pinInfo);
    if (error) { toast.error(error); return; }
    setSavingAddr(true);
    try {
      const data = await userAPI.addAddress(withStreet(addrForm));
      setAddresses(data.addresses || []);
      setAddrForm({ ...EMPTY_ADDRESS, isDefault: false });
      setShowAddrForm(false);
      toast.success('Address added!');
    } catch (err) { toast.error(err.message); }
    finally { setSavingAddr(false); }
  };

  const handleDeleteAddress = async (id) => {
    try {
      const data = await userAPI.deleteAddress(id);
      setAddresses(data.addresses || []);
      toast.success('Address removed');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Profile</h2>

      {/* Profile Form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><FiUser className="w-4 h-4" /> Personal Information</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
              {form.avatar ? <img src={form.avatar} alt="" className="w-full h-full object-cover" /> : <FiUser className="w-6 h-6 text-gray-400 dark:text-gray-500" />}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Profile Photo</label>
              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600 ${avatarBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                  <FiUpload className="w-4 h-4" /> {avatarBusy ? 'Please wait…' : form.avatar ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setAvatarBusy(true);
                    try { const data = await userAPI.uploadAvatar(file); await saveAvatar(data.url); toast.success('Profile photo updated'); }
                    catch (err) { toast.error(err.message || 'Photo upload failed'); }
                    finally { setAvatarBusy(false); }
                  }} />
                </label>
                {form.avatar && (
                  <button type="button" disabled={avatarBusy} onClick={async () => {
                    setAvatarBusy(true);
                    try { await saveAvatar(''); toast.success('Profile photo removed'); }
                    catch (err) { toast.error(err.message || 'Could not remove photo'); }
                    finally { setAvatarBusy(false); }
                  }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">
                    <FiTrash2 className="w-4 h-4" /> Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Mobile Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required className="w-full border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '-'}</span>
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
            <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Addresses */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FiMapPin className="w-4 h-4" /> Saved Addresses</h3>
          <button onClick={() => setShowAddrForm(!showAddrForm)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
            <FiPlus className="w-4 h-4" /> Add Address
          </button>
        </div>
        {showAddrForm && (
          <form onSubmit={handleAddAddress} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 mb-4 space-y-3">
            <AddressFields value={addrForm} onChange={setAddrForm} onPinInfo={setPinInfo} />
            <ToggleSwitch checked={addrForm.isDefault} onChange={val => setAddrForm({ ...addrForm, isDefault: val })} label="Set as default address" />
            <div className="flex gap-2">
              <button type="submit" disabled={savingAddr}
                className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                {savingAddr ? 'Saving...' : 'Save Address'}
              </button>
              <button type="button" onClick={() => setShowAddrForm(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            </div>
          </form>
        )}
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No saved addresses</p>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr._id} className="flex items-start justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{addr.name}</p>
                    {addr.isDefault && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-medium">Default</span>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{addr.phone}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{[addr.street, addr.city, addr.district, addr.state].filter(Boolean).join(', ')} - {addr.pincode}</p>
                </div>
                <button onClick={() => handleDeleteAddress(addr._id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}