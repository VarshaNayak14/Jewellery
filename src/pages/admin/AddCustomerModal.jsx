import { useEffect, useState } from 'react';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';

const makePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

// Admin / Super Admin adds a customer account directly (backend: POST /admin/users).
export default function AddCustomerModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', sendEmail: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: '', email: '', phone: '', password: makePassword(), sendEmail: true });
  }, [open]);

  if (!open) return null;
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) { toast.error('Enter a valid 10-digit mobile number'); return; }
    setSaving(true);
    try {
      const d = await adminAPI.createCustomer(form);
      toast.success(d.message || 'Customer added');
      if (form.sendEmail && !d.emailSent) toast('Customer added, but the welcome email could not be sent (email not set up).');
      onCreated?.(d.user);
      onClose();
    } catch (err) { toast.error(err.message || 'Could not add customer'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Add Customer</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">They can log in right away with these details.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button>
        </div>

        <div className="p-5 space-y-3">
          <div><label className={labelCls}>Full name *</label><input required value={form.name} onChange={set('name')} className={inputCls} /></div>
          <div><label className={labelCls}>Email *</label><input required type="email" value={form.email} onChange={set('email')} placeholder="customer@email.com" className={inputCls} /></div>
          <div><label className={labelCls}>Mobile number *</label><input required value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="98765 43210" className={inputCls} /></div>
          <div>
            <label className={labelCls}>Password *</label>
            <div className="flex gap-2">
              <input required minLength={6} value={form.password} onChange={set('password')} className={`${inputCls} font-mono`} />
              <button type="button" onClick={() => setForm(p => ({ ...p, password: makePassword() }))} title="Generate a new password"
                className="px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"><FiRefreshCw className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Share it with the customer; they can change it from My Account.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pt-1">
            <input type="checkbox" checked={form.sendEmail} onChange={e => setForm(p => ({ ...p, sendEmail: e.target.checked }))} className="w-4 h-4" />
            Email the customer that their account is ready
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
          <button disabled={saving} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Adding…' : 'Add Customer'}</button>
        </div>
      </form>
    </div>
  );
}
