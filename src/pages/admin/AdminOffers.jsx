import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiExternalLink, FiImage, FiPlus, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import { adminAPI, superAdminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AdminPageWrapper } from './AdminDashboard';
import toast from 'react-hot-toast';
import OfferReviewModal, { ImageLightbox } from './OfferReviewModal';
import PlatformBannerModal from './PlatformBannerModal';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  approved: { label: 'Approved', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' },
};

export default function AdminOffers({ Wrapper = AdminPageWrapper }) {
  const [placement, setPlacement] = useState('homepage');
  const [offers, setOffers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  // Offer open in the review popup, and a photo open full screen.
  const [viewing, setViewing] = useState(null);
  // Platform banner form: { banner } (null banner = adding a new one).
  const [bannerForm, setBannerForm] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [offerPlans, setOfferPlans] = useState([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', price: '', durationLabel: '/ Year', features: '', order: 0, bannerLimit: '' });

  // Only Super Admin creates / edits / deletes offer plans; Admins just see them.
  const canManagePlans = useAuthStore(s => s.user?.role === 'superadmin');
  const loadOfferPlans = () => adminAPI.getOfferPlans().then(d => setOfferPlans(d.plans || [])).catch(err => toast.error(err.message || 'Failed to load offer plans'));

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAllOffers({ placement, ...(statusFilter ? { status: statusFilter } : {}) });
      setOffers((data.offers || []).filter((offer) => (
        (offer.placement || (offer.tag || offer.description || offer.discountText ? 'festival' : 'homepage')) === placement
      )));
    } catch { toast.error('Failed to load offers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOffers(); }, [statusFilter, placement]);
  // Plans don't depend on the status tab — load them once.
  useEffect(() => { loadOfferPlans(); }, []);

  const openPlan = (plan = null) => {
    setEditingPlan(plan);
    setPlanForm(plan ? { name: plan.name, price: plan.price, durationLabel: plan.durationLabel || '/ Year', features: (plan.features || []).join('\n'), order: plan.order || 0, bannerLimit: plan.bannerLimit === -1 || plan.bannerLimit === undefined ? '' : String(plan.bannerLimit) } : { name: '', price: '', durationLabel: '/ Year', features: '', order: 0, bannerLimit: '' });
    setShowPlanForm(true);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    const payload = { name: planForm.name, price: Number(planForm.price), productLimit: 0, visibilityScope: 'india', purpose: 'offer', durationLabel: planForm.durationLabel, order: Number(planForm.order) || 0, features: planForm.features.split('\n').map(x => x.trim()).filter(Boolean), color: 'blue', bannerLimit: planForm.bannerLimit === '' ? -1 : Number(planForm.bannerLimit) };
    try {
      if (editingPlan) await superAdminAPI.updatePlan(editingPlan._id, payload);
      else await superAdminAPI.createPlan(payload);
      toast.success(editingPlan ? 'Offer plan updated' : 'Offer plan added');
      setShowPlanForm(false);
      loadOfferPlans();
    } catch (err) { toast.error(err.message || 'Could not save offer plan'); }
  };

  const deletePlan = async (plan) => {
    if (!confirm(`Delete the "${plan.name}" offer plan?`)) return;
    try { await superAdminAPI.deletePlan(plan._id); toast.success('Offer plan deleted'); loadOfferPlans(); }
    catch (err) { toast.error(err.message || 'Could not delete offer plan'); }
  };

  const handleApprove = async (id) => {
    setUpdatingId(id);
    try {
      await adminAPI.reviewOffer(id, { status: 'approved' });
      toast.success('Offer approved!');
      setViewing(null);
      fetchOffers();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setUpdatingId(null); }
  };

  const handleReject = async (id, reason = rejectionReason) => {
    setUpdatingId(id);
    try {
      await adminAPI.reviewOffer(id, { status: 'rejected', rejectionReason: reason });
      setViewing(null);
      toast.success('Offer rejected');
      setRejectingId(null);
      setRejectionReason('');
      fetchOffers();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setUpdatingId(null); }
  };

  return (
    <Wrapper title={placement === 'homepage' ? 'Homepage Offers' : 'Festival Offers'} subtitle="Manage offers and review seller submissions">
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { key: 'homepage', label: 'Homepage Offers' },
          { key: 'festival', label: 'Festival Offers' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setPlacement(tab.key); setStatusFilter(''); }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              placement === tab.key
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {placement === 'homepage' && <div className="mb-6">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div><h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Offer Plans</h2><p className="text-xs text-gray-500 dark:text-gray-400">{canManagePlans ? 'These plans are only for unlocking Homepage Offers.' : 'Set by Super Admin. You can assign them to sellers from a banner request (eye icon).'}</p></div>
          {canManagePlans && <button onClick={() => openPlan()} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"><FiPlus /> Add Plan</button>}
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {offerPlans.map(plan => (
            <div key={plan._id} className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 ${!plan.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{plan.name}</p><p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{Number(plan.price).toLocaleString('en-IN')} <span className="text-xs text-gray-400">{plan.durationLabel}</span></p></div><span className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600">{plan.isActive ? 'Live' : 'Hidden'}</span></div>
              <p className="mt-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{plan.bannerLimit > 0 ? `Up to ${plan.bannerLimit} homepage banner${plan.bannerLimit === 1 ? '' : 's'}` : 'Unlimited homepage banners'}</p><ul className="mt-1 min-h-10">{(plan.features || []).slice(0, 2).map(feature => <li key={feature} className="text-xs text-gray-500 dark:text-gray-400">• {feature}</li>)}</ul>
              {canManagePlans && <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800"><button onClick={() => openPlan(plan)} className="text-xs text-indigo-600 flex items-center gap-1"><FiEdit2 /> Edit</button><button onClick={() => superAdminAPI.togglePlanStatus(plan._id).then(loadOfferPlans).catch(err => toast.error(err.message))} className="text-xs text-gray-500">{plan.isActive ? 'Hide' : 'Show'}</button><button onClick={() => deletePlan(plan)} className="text-xs text-red-600 flex items-center gap-1"><FiTrash2 /> Delete</button></div>}
            </div>
          ))}
          {offerPlans.length === 0 && <div className="col-span-full bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-5 text-center text-xs text-gray-500">{canManagePlans ? 'No offer plans yet. Add the first plan for sellers.' : 'No offer plans yet — Super Admin will add them.'}</div>}
        </div>
      </div>}

      {canManagePlans && showPlanForm && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPlanForm(false)}><form onSubmit={savePlan} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold text-gray-900 dark:text-gray-100">{editingPlan ? 'Edit Offer Plan' : 'Add Offer Plan'}</h3><button type="button" onClick={() => setShowPlanForm(false)} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button></div><input required placeholder="Plan name e.g. Offer Basic" value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><input required type="number" min="0" placeholder="Price (₹)" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><input placeholder="Duration label" value={planForm.durationLabel} onChange={e => setPlanForm(p => ({ ...p, durationLabel: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Homepage banners allowed</label><input type="number" min="0" placeholder="Leave empty for unlimited" value={planForm.bannerLimit} onChange={e => setPlanForm(p => ({ ...p, bannerLimit: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">How many banners a seller on this plan can put on the main website during the plan. Empty = unlimited. Changing it applies to sellers already on the plan.</p></div><textarea placeholder="Features, one per line" rows="4" value={planForm.features} onChange={e => setPlanForm(p => ({ ...p, features: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y" /><button className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">{editingPlan ? 'Update Plan' : 'Add Plan'}</button></form></div>}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{placement === 'homepage' ? 'Homepage Image Banners' : 'Festival Offer Cards'}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review seller submissions or add an offer directly.</p>
        </div>
        <button onClick={() => setBannerForm({ banner: null, placement })}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 whitespace-nowrap">
          <FiPlus /> {placement === 'homepage' ? 'Add Image Offer' : 'Add Festival Offer'}
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.key ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
        ) : offers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">No offers in this category.</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {offers.map((offer) => {
              const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending;
              return (
                <div key={offer._id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {offer.image ? (
                        <button type="button" onClick={() => setLightbox(offer.image)} title="View photo" className="flex-shrink-0">
                          <img src={offer.image} alt={offer.title} className="w-14 h-14 rounded-xl object-cover border border-gray-100 dark:border-gray-800 hover:opacity-90" />
                        </button>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                          <FiImage className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {offer.seller?.logo ? (
                            <img src={offer.seller.logo} alt={offer.seller?.shopName} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                              {offer.seller?.shopName?.charAt(0) || '?'}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {offer.seller?.shopName || `growthkarts${offer.createdBy?.name ? ` · added by ${offer.createdBy.name}` : ''}`}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate mt-0.5">{offer.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {offer.tag && <span className="mr-2">{offer.tag}</span>}
                          {offer.discountText && <span className="text-indigo-500 dark:text-indigo-400 font-medium">{offer.discountText}</span>}
                        </p>
                        {offer.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{offer.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      <button onClick={() => setViewing(offer)} title="View details" aria-label="View details"
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <FiEye className="w-4 h-4" />
                      </button>
                      {offer.link && (
                        <a href={offer.link} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                          Link <FiExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {!offer.seller && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setBannerForm({ banner: offer })}
                          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                          <FiEdit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={async () => {
                          if (!window.confirm(`Delete the banner "${offer.title}" from the homepage?`)) return;
                          try { await adminAPI.deletePlatformOffer(offer._id, placement); toast.success('Offer deleted'); fetchOffers(); }
                          catch (err) { toast.error(err.message || 'Could not delete'); }
                        }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20">
                          <FiTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                    {offer.seller && offer.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleApprove(offer._id)} disabled={updatingId === offer._id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60">
                          <FiCheck className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => setRejectingId(rejectingId === offer._id ? null : offer._id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20">
                          <FiX className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {rejectingId === offer._id && (
                    <div className="flex gap-2 mt-3 sm:ml-[4.5rem]">
                      <input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (optional)..." autoFocus
                        className="flex-1 min-w-0 px-3 py-2 border border-red-200 dark:border-red-500/30 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg text-xs" />
                      <button onClick={() => handleReject(offer._id)} disabled={updatingId === offer._id}
                        className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 flex-shrink-0">
                        Confirm Reject
                      </button>
                    </div>
                  )}

                  {offer.status === 'rejected' && offer.rejectionReason && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 sm:ml-[4.5rem]">
                      Reason: {offer.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <OfferReviewModal
        offer={viewing}
        offerPlans={offerPlans}
        busy={viewing && updatingId === viewing._id}
        onClose={() => setViewing(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onSellerUpdated={(sellerId, patch) => {
          const merge = (o) => (o.seller?._id === sellerId ? { ...o, seller: { ...o.seller, ...patch } } : o);
          setOffers(list => list.map(merge));
          setViewing(v => (v ? merge(v) : v));
        }}
      />
      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      <PlatformBannerModal open={Boolean(bannerForm)} banner={bannerForm?.banner} placement={bannerForm?.placement || placement} onClose={() => setBannerForm(null)}
        onSaved={() => { if (statusFilter === 'pending') setStatusFilter('approved'); else fetchOffers(); }} />
    </Wrapper>
  );
}
