import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiTrash2, FiEdit2, FiToggleLeft, FiToggleRight, FiTag, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import { SuperAdminPageWrapper } from './SuperAdminLayout';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import { CAPABILITY_DEFAULTS, CAPABILITY_TOGGLES, SEARCH_RANKING_OPTIONS, capsOf } from '../../utils/planFeatures';


const emptyForm = {
  name: '', price: '', productLimit: '', visibilityScope: 'tehsil', billingCycle: 'yearly', durationLabel: '/ Year',
  badge: '', color: 'blue', order: 0, features: '', capabilities: { ...CAPABILITY_DEFAULTS },
};

const COLOR_DOT = { gray: 'bg-gray-400', blue: 'bg-blue-500', yellow: 'bg-yellow-400', purple: 'bg-purple-500' };

const SCOPE_OPTIONS = [
  { value: 'tehsil', label: 'Tehsil — visible only within seller\'s own tehsil' },
  { value: 'district', label: 'District — visible across seller\'s whole district' },
  { value: 'state', label: 'State — visible across seller\'s whole state' },
  { value: 'india', label: 'India — visible all over India' },
];

const SCOPE_LABEL = { tehsil: 'Tehsil', district: 'District', state: 'State', india: 'India' };

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    superAdminAPI.getAllPlans()
      .then(d => setPlans(d.plans || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setCap = (key, value) => setForm(p => ({ ...p, capabilities: { ...p.capabilities, [key]: value } }));

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };

  const openEdit = (plan) => {
    setForm({
      name: plan.name,
      price: plan.price,
      productLimit: plan.productLimit,
      visibilityScope: plan.visibilityScope || 'tehsil',
      billingCycle: plan.billingCycle || 'yearly',
      durationLabel: plan.durationLabel || '/ Year',
      badge: plan.badge || '',
      color: plan.color || 'blue',
      order: plan.order ?? 0,
      features: (plan.features || []).join('\n'),
      capabilities: capsOf(plan),
    });
    setEditingId(plan._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      price: Number(form.price),
      productLimit: Number(form.productLimit),
      visibilityScope: form.visibilityScope,
      durationLabel: form.durationLabel,
      billingCycle: form.billingCycle,
      badge: form.badge,
      color: form.color,
      order: Number(form.order) || 0,
      features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
      capabilities: {
        ...form.capabilities,
        searchRanking: Number(form.capabilities.searchRanking),
        promoBannersPerYear: Number(form.capabilities.promoBannersPerYear),
        videoMaxMinutes: Number(form.capabilities.videoMaxMinutes),
      },
    };
    try {
      if (editingId) {
        const data = await superAdminAPI.updatePlan(editingId, payload);
        toast.success(data.sellersUpdated ? `Plan updated — applied to ${data.sellersUpdated} seller(s) on this plan` : 'Plan updated!');
      } else {
        await superAdminAPI.createPlan(payload);
        toast.success('Plan added! Sellers will see it on "Become a Seller".');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan) => {
    try {
      await superAdminAPI.togglePlanStatus(plan._id);
      setPlans(p => p.map(x => x._id === plan._id ? { ...x, isActive: !x.isActive } : x));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Delete the "${plan.name}" plan? Sellers who already picked it keep their benefits, but new sellers won't see it.`)) return;
    try {
      await superAdminAPI.deletePlan(plan._id);
      toast.success('Plan deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <SuperAdminPageWrapper
      title="Subscription Plans"
      subtitle=''
      actions={
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
          <FiPlus className="w-4 h-4" /> Add Plan
        </button>
      }
    >
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-white dark:bg-gray-900 rounded-2xl animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 text-center text-gray-400 dark:text-gray-500">
          <FiTag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No plans yet — add your first one.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div key={plan._id}
              className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 shadow-sm relative ${plan.isActive ? 'border-gray-100 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800 opacity-50'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[plan.color] || 'bg-blue-500'}`} />
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                </div>
                {plan.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{plan.badge}</span>}
              </div>
              <p className="mb-3">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500"> {plan.durationLabel}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {plan.productLimit === -1 ? 'Unlimited products' : `Up to ${plan.productLimit} products`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Visibility: <span className="font-semibold text-gray-700 dark:text-gray-300">{SCOPE_LABEL[plan.visibilityScope] || plan.visibilityScope}</span>
                {plan.visibilityScope === 'india' ? ' (whole India)' : plan.visibilityScope === 'state' ? ' (whole state)' : plan.visibilityScope === 'district' ? ' (whole district)' : ' (own tehsil only)'}
              </p>
              <ul className="space-y-1 mb-4 min-h-[80px]">
                {/* The product-count line is always derived from productLimit
                    (not the stored feature text) so it can never go stale
                    when the limit is edited. Any old manually-typed
                    "Up to N product listings" / "Unlimited..." line already
                    saved in features is filtered out so it isn't shown twice. */}
                <li className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  • {plan.productLimit === -1 ? 'Unlimited product listings' : `Up to ${plan.productLimit} product listings`}
                </li>
                {(plan.features || [])
                  .filter(f => !/^(up to \d+|unlimited)\s+product\s+listings?$/i.test(f.trim()))
                  .slice(0, 3)
                  .map(f => (
                    <li key={f} className="text-xs text-gray-600 dark:text-gray-400 truncate">• {f}</li>
                  ))}
              </ul>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => handleToggle(plan)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  {plan.isActive ? <FiToggleRight className="w-5 h-5 text-green-500 dark:text-green-400" /> : <FiToggleLeft className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                  {plan.isActive ? 'Live' : 'Hidden'}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(plan)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(plan)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 bg-white dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{editingId ? 'Edit Plan' : 'Add New Plan'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <FiX className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plan Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Gold" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Price (₹) *</label>
                  <input required type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="9999" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Billing Cycle *</label>
                  <select required value={form.billingCycle} onChange={e => setForm(p => ({ ...p, billingCycle: e.target.value, durationLabel: e.target.value === 'monthly' ? '/ Month' : '/ Year' }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                    <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display Label</label>
                  <input value={form.durationLabel} onChange={e => setForm(p => ({ ...p, durationLabel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Limit *</label>
                  <input required type="number" value={form.productLimit} onChange={e => setForm(p => ({ ...p, productLimit: e.target.value }))}
                    placeholder="-1 for unlimited" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Visibility Scope *</label>
                <select required value={form.visibilityScope} onChange={e => setForm(p => ({ ...p, visibilityScope: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                  {SCOPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Controls how wide an area a seller on this plan is shown in — tehsil is narrowest, India is widest.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Badge (optional)</label>
                  <input value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
                    placeholder="Most Popular" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display Order</label>
                  <input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                </div>
              </div>
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5"><FiZap className="w-4 h-4 text-indigo-500" /> Internal Plan Rules</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Only used inside the app to allow/limit features — never shown to sellers or customers. Saving applies them instantly to every seller already on this plan.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {CAPABILITY_TOGGLES.map(t => (
                    <div key={t.key} className="flex items-start justify-between gap-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{t.label}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{t.hint}</p>
                      </div>
                      <ToggleSwitch checked={!!form.capabilities[t.key]} onChange={v => setCap(t.key, v)} />
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Search ranking</label>
                    <select value={form.capabilities.searchRanking} onChange={e => setCap('searchRanking', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                      {SEARCH_RANKING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Higher ranking = listed above other shops in directory & search.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Promotional banners per year</label>
                    <input type="number" min="-1" required value={form.capabilities.promoBannersPerYear} onChange={e => setCap('promoBannersPerYear', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Homepage offer banners included free. 0 = none (offer plan needed), -1 = unlimited.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max video banner length (minutes)</label>
                    <input type="number" min="-1" max="60" required value={form.capabilities.videoMaxMinutes} onChange={e => setCap('videoMaxMinutes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Only applies when the video toggle is on. e.g. 3 = "1–3 min video", -1 = no limit (premium brand video).</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Features (one per line)</label>
                <textarea rows={5} value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))}
                  placeholder={'Up to 500 product listings\nCity-level top ranking\nDedicated customer support'}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">This text is what sellers see on the plan card.</p>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm">
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </SuperAdminPageWrapper>
  );
}