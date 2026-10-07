import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiSave, FiPlus, FiTrash2, FiMapPin, FiCamera, FiPhone, FiMail, FiEdit2, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { userAPI } from '../../services/api';
import ToggleSwitch from '../../components/common/ToggleSwitch';

const INPUT_CLS = 'w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

export default function MyProfile() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', avatar: '' });
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addrForm, setAddrForm] = useState({ name: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', avatar: user.avatar || '' });
      setAddresses(user.addresses || []);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await userAPI.updateProfile(form);
      setUser(data.user);
      toast.success('Profile updated successfully!');
      setEditingProfile(false);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      const data = await userAPI.addAddress(addrForm);
      setAddresses(data.addresses || []);
      setAddrForm({ name: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false });
      setShowAddrForm(false);
      toast.success('Address saved!');
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information and addresses</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-rose-400 via-blue-400 to-fuchsia-400 relative">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        {/* Avatar + Info */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg bg-gray-100 overflow-hidden">
                {form.avatar
                  ? <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-rose-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-rose-500 rounded-lg flex items-center justify-center shadow-md">
                <FiCamera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex-1 pb-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{user?.name}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <button onClick={() => setEditingProfile(!editingProfile)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                editingProfile ? 'bg-gray-100 text-gray-700' : 'bg-rose-500 text-white shadow-md shadow-rose-200'
              }`}>
              {editingProfile ? <><FiCheck className="w-4 h-4" /> Cancel</> : <><FiEdit2 className="w-4 h-4" /> Edit</>}
            </button>
          </div>

          {/* Static Info Display */}
          {!editingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <FiUser className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Full Name</p>
                  <p className="text-sm font-semibold text-gray-900">{form.name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <FiPhone className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Mobile</p>
                  <p className="text-sm font-semibold text-gray-900">{form.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl sm:col-span-2">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <FiMail className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Email Address</p>
                  <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Profile Photo URL</label>
                <input type="url" value={form.avatar}
                  onChange={e => setForm({ ...form, avatar: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Full Name</label>
                  <input type="text" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Mobile Number</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className={INPUT_CLS} />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-60 shadow-md shadow-rose-200">
                <FiSave className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </motion.form>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">
              <FiMapPin className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Saved Addresses</h3>
              <p className="text-xs text-gray-400">{addresses.length} address{addresses.length !== 1 ? 'es' : ''} saved</p>
            </div>
          </div>
          <button onClick={() => setShowAddrForm(!showAddrForm)}
            className="flex items-center gap-1.5 bg-rose-500 text-white px-3.5 py-2 rounded-2xl text-xs font-semibold hover:bg-rose-600 transition-colors shadow-md shadow-rose-200">
            <FiPlus className="w-3.5 h-3.5" /> Add New
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Add Address Form */}
          <AnimatePresenceWrapper show={showAddrForm}>
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} onSubmit={handleAddAddress}
              className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-3 overflow-hidden">
              <p className="text-sm font-bold text-gray-900 mb-3">Add New Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Full Name', key: 'name', type: 'text' },
                  { label: 'Mobile', key: 'phone', type: 'tel' },
                  { label: 'Street / Area', key: 'street', type: 'text' },
                  { label: 'City', key: 'city', type: 'text' },
                  { label: 'State', key: 'state', type: 'text' },
                  { label: 'Pincode', key: 'pincode', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={LABEL_CLS}>{f.label}</label>
                    <input type={f.type} value={addrForm[f.key]}
                      onChange={e => setAddrForm({ ...addrForm, [f.key]: e.target.value })}
                      required className={INPUT_CLS} />
                  </div>
                ))}
              </div>
              <ToggleSwitch checked={addrForm.isDefault}
                onChange={val => setAddrForm({ ...addrForm, isDefault: val })}
                label="Set as default address" color="bg-rose-500" />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={savingAddr}
                  className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-60">
                  <FiSave className="w-3.5 h-3.5" />
                  {savingAddr ? 'Saving...' : 'Save Address'}
                </button>
                <button type="button" onClick={() => setShowAddrForm(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
              </div>
            </motion.form>
          </AnimatePresenceWrapper>

          {/* Address List */}
          {addresses.length === 0 && !showAddrForm ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FiMapPin className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No saved addresses</p>
              <p className="text-xs text-gray-400 mt-1">Add an address for faster checkout</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr, idx) => (
                <motion.div key={addr._id || idx}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`relative p-4 rounded-2xl border transition-all ${
                    addr.isDefault ? 'border-rose-200 bg-rose-50/50' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
                  }`}>
                  {addr.isDefault && (
                    <span className="absolute top-3 right-12 px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-semibold rounded-full">
                      Default
                    </span>
                  )}
                  <button onClick={() => handleDeleteAddress(addr._id)}
                    className="absolute top-3 right-3 p-1.5 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start gap-3 pr-16">
                    <div className="w-8 h-8 bg-white rounded-xl border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                      <FiMapPin className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{addr.name}</p>
                      <p className="text-sm text-gray-600">{addr.phone}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple animation wrapper
function AnimatePresenceWrapper({ show, children }) {
  if (!show) return null;
  return children;
}