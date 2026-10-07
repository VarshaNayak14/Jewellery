import { useState } from 'react';
import { FiX, FiCheck, FiExternalLink, FiImage, FiMaximize2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import OfferHomepagePreview from '../../components/home/OfferHomepagePreview';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Full-screen photo — click anywhere / Esc-free close button.
export function ImageLightbox({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25">
        <FiX className="w-5 h-5" />
      </button>
      <img src={src} alt={alt || ''} onClick={e => e.stopPropagation()} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
    </div>
  );
}

// Everything an Admin needs to review one homepage banner request: the
// photo, how the banner will look, its details, the seller's banner plan
// (with a way to assign one), and Approve / Reject.
export default function OfferReviewModal({ offer, offerPlans, onClose, onApprove, onReject, onSellerUpdated, busy }) {
  const [lightbox, setLightbox] = useState(null);
  const [planId, setPlanId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  if (!offer) return null;

  const seller = offer.seller || {};
  const planActive = seller.offerPlanSnapshot?.name && (!seller.offerPlanExpiresAt || new Date(seller.offerPlanExpiresAt) > new Date());
  const livePlans = offerPlans.filter(p => p.isActive !== false);

  const assign = async () => {
    if (!planId) { toast.error('Choose a plan to assign'); return; }
    setAssigning(true);
    try {
      const d = await adminAPI.assignOfferPlan(seller._id, planId);
      toast.success(d.message || 'Plan assigned');
      onSellerUpdated?.(seller._id, d.seller);
      setPlanId('');
    } catch (err) { toast.error(err.message || 'Could not assign the plan'); }
    finally { setAssigning(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl my-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">{offer.seller ? `Homepage banner request · ${seller.shopName || 'Seller'}` : 'Homepage banner added by growthkarts'}</p>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{offer.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-5">
          {/* Photo */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Banner photo</p>
            {offer.image ? (
              <button type="button" onClick={() => setLightbox(offer.image)} className="relative block w-full group">
                <img src={offer.image} alt={offer.title} className="w-full max-h-72 object-contain rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800" />
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-xs bg-black/60 text-white px-2 py-1 rounded-lg opacity-90 group-hover:opacity-100">
                  <FiMaximize2 className="w-3 h-3" /> View full size
                </span>
              </button>
            ) : (
              <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><FiImage className="w-8 h-8" /></div>
            )}
          </div>

          {/* Homepage preview */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">How it will look on the homepage</p>
            <OfferHomepagePreview offer={offer} placement={offer.placement || 'homepage'} />
          </div>

          {/* Details */}
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ['Status', offer.status],
              ['Submitted', fmtDate(offer.createdAt)],
              ['Tag', offer.tag || '—'],
              ['Discount text', offer.discountText || '—'],
              ['Discount on products', offer.discountPercent ? `${offer.discountPercent}%` : '—'],
              ['Link', offer.link || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-gray-50 dark:border-gray-800 py-1.5">
                <span className="text-gray-500 dark:text-gray-400">{k}</span>
                {k === 'Link' && offer.link
                  ? <a href={offer.link} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 truncate max-w-[60%]">{v} <FiExternalLink className="w-3 h-3 shrink-0" /></a>
                  : <span className="font-medium text-gray-900 dark:text-gray-100 capitalize text-right truncate max-w-[60%]">{v}</span>}
              </div>
            ))}
            {offer.description && (
              <p className="sm:col-span-2 text-gray-700 dark:text-gray-300 pt-1"><span className="text-gray-500 dark:text-gray-400">Description: </span>{offer.description}</p>
            )}
          </div>

          {offer.products?.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Products in this offer ({offer.products.length})</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {offer.products.map(p => (
                  <div key={p._id} className="w-28 flex-shrink-0">
                    <button type="button" onClick={() => p.images?.[0] && setLightbox(p.images[0])} className="block w-28 h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                    </button>
                    <p className="text-xs text-gray-800 dark:text-gray-200 mt-1 line-clamp-2">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">₹{Number(p.price || 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller's banner plan + assign (platform banners have no seller) */}
          {offer.seller && <div className="md:col-span-2 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/5 p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Seller's homepage banner plan</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {planActive
                ? `${seller.offerPlanSnapshot.name} · ${seller.offerPlanSnapshot.bannerLimit > 0 ? `${seller.offerPlanSnapshot.bannerLimit} banners` : 'unlimited banners'} · valid till ${fmtDate(seller.offerPlanExpiresAt)}`
                : `No active banner plan${seller.planSnapshot?.name ? ` (seller plan: ${seller.planSnapshot.name})` : ''}`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <select value={planId} onChange={e => setPlanId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
                <option value="">{livePlans.length ? 'Choose a plan to assign…' : 'No banner plans yet'}</option>
                {livePlans.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} {p.durationLabel || ''} · {p.bannerLimit > 0 ? `${p.bannerLimit} banners` : 'unlimited'}
                  </option>
                ))}
              </select>
              <button onClick={assign} disabled={assigning || !planId}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {assigning ? 'Assigning…' : planActive ? 'Replace plan' : 'Assign plan'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">Assigning starts the plan today for its full duration, without payment. It is recorded in Subscription Payments and the seller is notified.</p>
          </div>}
        </div>

        {/* Review actions */}
        {offer.status === 'pending' && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            {rejecting && (
              <input value={reason} onChange={e => setReason(e.target.value)} autoFocus placeholder="Reason for rejection (optional)…"
                className="w-full px-3 py-2 border border-red-200 dark:border-red-500/30 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg text-sm" />
            )}
            <div className="flex justify-end gap-2">
              {rejecting ? (
                <>
                  <button onClick={() => setRejecting(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                  <button onClick={() => onReject(offer._id, reason)} disabled={busy} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-60">Confirm Reject</button>
                </>
              ) : (
                <>
                  <button onClick={() => setRejecting(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold"><FiX /> Reject</button>
                  <button onClick={() => onApprove(offer._id)} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60"><FiCheck /> Approve</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <ImageLightbox src={lightbox} alt={offer.title} onClose={() => setLightbox(null)} />
    </div>
  );
}
