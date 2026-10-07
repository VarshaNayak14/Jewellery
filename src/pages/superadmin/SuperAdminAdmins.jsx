import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiTrash2, FiShield, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import { SuperAdminPageWrapper } from './SuperAdminLayout';
import { formatDateShort } from '../../utils/helpers';
import PasswordInput from '../../components/common/PasswordInput';

const PERMISSION_LABELS = {
  dashboard: 'Dashboard', orders: 'Leads', products: 'Products', users: 'Users',
  sellers: 'Sellers', categories: 'Categories', reviews: 'Reviews',
  notifications: 'Notifications', reports: 'Reports',
  settings: 'Settings', kyc: 'KYC', inventory: 'Inventory', subscriptions: 'Subscriptions',
  offers: 'Offers', returns: 'Returns', support: 'Support Tickets', rates: 'Gold & Metal Rates', blogs: 'Blogs',
};

const emptyForm = { name: '', email: '', password: '', phone: '', permissions: [] };

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingPerms, setEditingPerms] = useState(null); // admin._id being edited

  const load = () => {
    setLoading(true);
    superAdminAPI.getAllAdmins()
      .then(d => { setAdmins(d.admins || []); setAvailablePermissions(d.availablePermissions || []); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const togglePerm = (perm, target = form, setter = setForm) => {
    const has = target.permissions.includes(perm);
    setter({ ...target, permissions: has ? target.permissions.filter(p => p !== perm) : [...target.permissions, perm] });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await superAdminAPI.createAdmin(form);
      toast.success('Admin account created!');
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    try {
      await superAdminAPI.toggleAdminStatus(admin._id);
      toast.success(`Admin ${admin.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (admin) => {
    if (!confirm(`Delete admin account "${admin.name}"? This cannot be undone.`)) return;
    try {
      await superAdminAPI.deleteAdmin(admin._id);
      toast.success('Admin deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const savePermissions = async (admin, newPerms) => {
    try {
      await superAdminAPI.updateAdminPermissions(admin._id, { permissions: newPerms });
      toast.success('Permissions updated');
      setEditingPerms(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <SuperAdminPageWrapper
      title="Admin Accounts"
      subtitle="Create and manage Admin staff, and control which modules each one can access"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <FiPlus className="w-4 h-4" /> New Admin
        </button>
      }
    >
      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Create Admin Account</h2>
              <button onClick={() => setShowForm(false)}><FiX className="w-5 h-5 text-gray-400 dark:text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field text-sm w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="e.g. Rakesh Admin" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field text-sm w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="admin@growthkarts.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Password *</label>
                <PasswordInput required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field text-sm w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input-field text-sm w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="9876543210" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                  Module Access (leave empty = full access)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {availablePermissions.map(perm => (
                    <label key={perm} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2.5 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePerm(perm)} />
                      {PERMISSION_LABELS[perm] || perm}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors mt-2">
                {saving ? 'Creating...' : 'Create Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">No admin accounts yet</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {admins.map(admin => (
              <div key={admin._id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      admin.role === 'superadmin' ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500' : 'bg-gradient-to-br from-slate-500 to-slate-700'
                    }`}>
                      {admin.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                        {admin.name}
                        {admin.role === 'superadmin' && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiShield className="w-3 h-3" /> SUPER ADMIN
                          </span>
                        )}
                        {admin.role === 'admin' && !admin.isActive && (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">INACTIVE</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{admin.email} · Joined {formatDateShort(admin.createdAt)}</p>
                    </div>
                  </div>

                  {admin.role === 'admin' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleToggleStatus(admin)} title={admin.isActive ? 'Deactivate' : 'Activate'}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {admin.isActive ? <FiToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <FiToggleLeft className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                      </button>
                      <button onClick={() => handleDelete(admin)} title="Delete"
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {admin.role === 'admin' && (
                  <div className="mt-3 pl-13">
                    {editingPerms === admin._id ? (
                      <PermissionEditor
                        admin={admin}
                        availablePermissions={availablePermissions}
                        onSave={(perms) => savePermissions(admin, perms)}
                        onCancel={() => setEditingPerms(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {admin.permissions?.length ? admin.permissions.map(p => (
                          <span key={p} className="text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {PERMISSION_LABELS[p] || p}
                          </span>
                        )) : (
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">Full Access</span>
                        )}
                        <button onClick={() => setEditingPerms(admin._id)}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 ml-1">
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminPageWrapper>
  );
}

function PermissionEditor({ admin, availablePermissions, onSave, onCancel }) {
  const [selected, setSelected] = useState(admin.permissions || []);
  const toggle = (perm) => setSelected(s => s.includes(perm) ? s.filter(p => p !== perm) : [...s, perm]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {availablePermissions.map(perm => (
          <label key={perm} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg px-2 py-1.5 cursor-pointer border border-gray-100 dark:border-gray-800">
            <input type="checkbox" checked={selected.includes(perm)} onChange={() => toggle(perm)} />
            {PERMISSION_LABELS[perm] || perm}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onSave(selected)} className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg">
          Save
        </button>
        <button onClick={onCancel} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  );
}