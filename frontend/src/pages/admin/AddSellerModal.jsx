import { useEffect, useState } from 'react';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, planAPI, categoryAPI } from '../../services/api';
import { INDIA_STATES, getDistrictsByState } from '../../data/indiaLocations';
import SelectWithOther from '../../components/common/SelectWithOther';

const EMPTY = {
  name: '', email: '', phone: '', password: '', shopName: '', shopDescription: '', category: '',
  address: '', city: '', state: '', district: '', tehsil: '', pincode: '',
  planId: '', amountPaid: '', paymentNote: '', sendEmail: true,
};

const makePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';
const SCOPE_TEXT = { tehsil: 'own tehsil', district: 'whole district', state: 'whole state', india: 'all India' };

// Admin / Super Admin adds a seller directly — approved straight away, plan
// active from today (backend: POST /admin/sellers).
export default function AddSellerModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, password: makePassword() });
    planAPI.getAll().then(d => setPlans((d.plans || []).filter(p => p.purpose !== 'offer'))).catch(() => toast.error('Could not load plans'));
    categoryAPI.getAll().then(d => setCategories((d.categories || []).filter(c => c.isActive !== false).map(c => c.name))).catch(() => {});
  }, [open]);

  if (!open) return null;
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const plan = plans.find(p => p._id === form.planId);
  const scope = plan?.visibilityScope;
  const needState = ['tehsil', 'district', 'state'].includes(scope);
  const needDistrict = ['tehsil', 'district'].includes(scope);
  const needTehsil = scope === 'tehsil';
  const districts = getDistrictsByState(form.state);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.planId) { toast.error('Choose a seller plan'); return; }
    if (!form.category) { toast.error('Choose or type a business category'); return; }
    setSaving(true);
    try {
      const d = await adminAPI.createSeller({
        ...form,
        amountPaid: form.amountPaid === '' ? 0 : Number(form.amountPaid),
      });
      toast.success(d.message || 'Seller added');
      if (form.sendEmail && !d.emailSent) toast('Seller added, but the welcome email could not be sent (email not set up).');
      onCreated?.(d.seller);
      onClose();
    } catch (err) { toast.error(err.message || 'Could not add seller'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Add Seller</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Approved straight away — the seller can log in with these details.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Login details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Owner's full name *</label><input required value={form.name} onChange={set('name')} className={inputCls} /></div>
              <div><label className={labelCls}>Mobile number *</label><input required value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={inputCls} /></div>
              <div><label className={labelCls}>Email *</label><input required type="email" value={form.email} onChange={set('email')} placeholder="seller@email.com" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Password *</label>
                <div className="flex gap-2">
                  <input required minLength={6} value={form.password} onChange={set('password')} className={`${inputCls} font-mono`} />
                  <button type="button" onClick={() => setForm(p => ({ ...p, password: makePassword() }))} title="Generate a new password"
                    className="px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"><FiRefreshCw className="w-4 h-4" /></button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Share it with the seller; they can change it after logging in.</p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Shop</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Shop name *</label><input required value={form.shopName} onChange={set('shopName')} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Business category *</label>
                <SelectWithOther value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))}
                  options={categories.map(c => ({ value: c, label: c }))} placeholder="Select a category"
                  otherPlaceholder="Type the business category" className={inputCls} />
              </div>
              <div className="sm:col-span-2"><label className={labelCls}>Short description</label><textarea rows={2} value={form.shopDescription} onChange={set('shopDescription')} className={`${inputCls} resize-none`} /></div>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Plan</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Seller plan *</label>
                <select required value={form.planId} onChange={e => {
                  const p = plans.find(x => x._id === e.target.value);
                  setForm(f => ({ ...f, planId: e.target.value, amountPaid: p ? String(p.price) : '' }));
                }} className={inputCls}>
                  <option value="">Choose a plan…</option>
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} {p.durationLabel || ''} · {p.productLimit === -1 ? 'unlimited' : p.productLimit} products · {SCOPE_TEXT[p.visibilityScope] || p.visibilityScope}
                    </option>
                  ))}
                </select>
                {plan && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Starts today. Shop is shown to customers in the {SCOPE_TEXT[plan.visibilityScope]}.</p>}
              </div>
              <div>
                <label className={labelCls}>Amount received (₹)</label>
                <input type="number" min="0" value={form.amountPaid} onChange={set('amountPaid')} placeholder="0 if given free" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Payment note / UTR</label>
                <input value={form.paymentNote} onChange={set('paymentNote')} placeholder="e.g. Cash, UTR 1234…" className={inputCls} />
              </div>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Location</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>City *</label><input required value={form.city} onChange={set('city')} className={inputCls} /></div>
              <div>
                <label className={labelCls}>State {needState && '*'}</label>
                <select required={needState} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value, district: '' }))} className={inputCls}>
                  <option value="">Select state</option>
                  {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>District {needDistrict && '*'}</label>
                {districts.length ? (
                  <select required={needDistrict} value={form.district} onChange={set('district')} className={inputCls}>
                    <option value="">Select district</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input required={needDistrict} value={form.district} onChange={set('district')} placeholder={form.state ? 'District' : 'Select a state first'} className={inputCls} />
                )}
              </div>
              <div><label className={labelCls}>Tehsil {needTehsil && '*'}</label><input required={needTehsil} value={form.tehsil} onChange={set('tehsil')} className={inputCls} /></div>
              <div><label className={labelCls}>PIN code</label><input value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} inputMode="numeric" className={inputCls} /></div>
              <div><label className={labelCls}>Address</label><input value={form.address} onChange={set('address')} className={inputCls} /></div>
            </div>
          </section>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.sendEmail} onChange={e => setForm(p => ({ ...p, sendEmail: e.target.checked }))} className="w-4 h-4" />
            Email the seller that their account is ready
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
          <button disabled={saving} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Adding…' : 'Add Seller'}</button>
        </div>
      </form>
    </div>
  );
}
