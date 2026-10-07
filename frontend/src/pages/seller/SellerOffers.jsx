import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTag, FiArrowRight, FiCheck, FiClock, FiAlertCircle, FiSmartphone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { sellerAPI, settingsAPI } from '../../services/api';
import { useSellerStore } from '../../store/sellerStore';
import { capsOf } from '../../utils/planFeatures';
import SellerLayout from './SellerLayout';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import OfferProductSelector from '../../components/common/OfferProductSelector';
import BankPaymentModal from '../../components/seller/BankPaymentModal';
import { offerGradientStyle } from '../../utils/offerGradient';
import OfferHomepagePreview from '../../components/home/OfferHomepagePreview';

const COLOR_PRESETS = [
  { from: 'from-green-500', to: 'to-emerald-600', label: 'Green' },
  { from: 'from-orange-500', to: 'to-amber-600', label: 'Orange' },
  { from: 'from-blue-600', to: 'to-blue-700', label: 'Blue' },
  { from: 'from-purple-600', to: 'to-indigo-700', label: 'Purple' },
  { from: 'from-red-500', to: 'to-rose-600', label: 'Red' },
  { from: 'from-pink-500', to: 'to-fuchsia-600', label: 'Pink' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: FiClock },
  approved: { label: 'Approved', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400', icon: FiCheck },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400', icon: FiAlertCircle },
};

function OfferBankPaymentModal({ plan, details, onClose, onSubmitted }) {
  return (
    <BankPaymentModal
      planName={plan.name}
      amount={plan.pricing?.payableAmount ?? plan.price}
      note="Pay the exact payable amount below, then submit your UTR. Admin will verify it before activating the offer plan."
      details={details}
      onClose={onClose}
      onSubmit={async (paymentReference, paymentScreenshot) => {
        await sellerAPI.submitOfferPlanBankPayment({ planId: plan._id, paymentReference, paymentScreenshot });
        toast.success('Payment submitted. Admin verification is pending.');
        onSubmitted();
      }}
    />
  );
}

const emptyForm = {
  tag: '', title: '', description: '', discountText: '', image: '', link: '',
  colorFrom: COLOR_PRESETS[0].from, colorTo: COLOR_PRESETS[0].to,
  discountPercent: '', products: [],
};

const InputField = ({ label, value, onChange, placeholder, required, className = '' }) => (
  <div className={className}>
    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
    />
  </div>
);

// ─── Offer Form Modal ───────────────────────────────────────────────────────
function OfferModal({ offer, placement = 'homepage', onClose, onSaved }) {
  const offerPlacement = offer?.placement || placement;
  const isFestival = offerPlacement === 'festival';
  const [form, setForm] = useState(
    offer
      ? {
          tag: offer.tag || '', title: offer.title || '', description: offer.description || '',
          discountText: offer.discountText || '', image: offer.image || '', link: offer.link || '',
          colorFrom: offer.colorFrom || COLOR_PRESETS[0].from, colorTo: offer.colorTo || COLOR_PRESETS[0].to,
          discountPercent: offer.discountPercent ? String(offer.discountPercent) : '',
          products: (offer.products || []).map((p) => (typeof p === 'string' ? p : p._id)),
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [myProducts, setMyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    sellerAPI.getProducts({ limit: 100 })
      .then((d) => { if (!cancelled) setMyProducts(d.products || []); })
      .catch(() => { if (!cancelled) toast.error('Failed to load your products'); })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, []);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const toggleProduct = (id) => {
    setForm((p) => ({
      ...p,
      products: p.products.includes(id) ? p.products.filter((pid) => pid !== id) : [...p.products, id],
    }));
  };

  const discountPercentNum = Number(form.discountPercent) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFestival && !form.title.trim()) { toast.error('Title required'); return; }
    if (!form.image.trim()) { toast.error('Image is required'); return; }
    if (form.products.length && discountPercentNum <= 0) {
      toast.error('Enter a discount percentage for selected products');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        placement: offerPlacement,
        tag: isFestival ? form.tag.trim() : '',
        title: isFestival ? form.title.trim() : 'Homepage image',
        description: isFestival ? form.description.trim() : '',
        discountText: isFestival ? form.discountText.trim() : '',
        image: form.image.trim(),
        link: isFestival ? form.link.trim() : '',
        colorFrom: form.colorFrom,
        colorTo: form.colorTo,
        products: form.products,
        discountPercent: discountPercentNum,
      };
      if (offer) {
        await sellerAPI.updateOffer(offer._id, payload);
        toast.success('Offer updated!');
      } else {
        await sellerAPI.createOffer(payload);
        toast.success('Offer created! It will show on your storefront now, and on the homepage once approved.');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-2xl my-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              {offer ? 'Edit' : 'Create'} {isFestival ? 'Festival Offer' : 'Homepage Image Offer'}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isFestival
                ? 'Add the details shown on the Festival Offers card. Admin approval is required before it appears on the homepage.'
                : 'Upload the image for the homepage carousel. No text or banner design is added.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {offer && offer.status !== 'pending' && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
            Editing an approved offer sends it back for re-approval before it shows on the homepage again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFestival && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Tag (optional)" value={form.tag} onChange={set('tag')} placeholder="e.g. New Season" />
            <InputField label="Title" value={form.title} onChange={set('title')} placeholder="e.g. Men's & Women's Fashion" required />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              placeholder="e.g. Trendy styles, fresh every week"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Discount Text (optional)" value={form.discountText} onChange={set('discountText')} placeholder="e.g. Up to 50% OFF" />
            <InputField label="Link (optional)" value={form.link} onChange={set('link')} placeholder="Defaults to your storefront if left blank" />
          </div>
          </>}

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Image</label>
            <div className="flex gap-2">
              {isFestival && <input
                type="url"
                value={form.image}
                onChange={set('image')}
                placeholder="Paste an image URL"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 flex-1"
              />}
              <ImageUploadInput
                uploadFn={(files) => sellerAPI.uploadImage(files[0]).then((r) => r.url)}
                onUploaded={(url) => setForm((p) => ({ ...p, image: url }))}
              />
            </div>
            {form.image && (
              <img src={form.image} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Discount percentage on selected products</label>
            <input
              type="number"
              min={0}
              max={95}
              value={form.discountPercent}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') { setForm((p) => ({ ...p, discountPercent: '' })); return; }
                const clamped = Math.max(0, Math.min(95, Number(raw)));
                setForm((p) => ({ ...p, discountPercent: String(clamped) }));
              }}
              placeholder="e.g. 20"
              className="w-full sm:w-40 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Select products below to apply this discount to their sale price.
            </p>
          </div>

          <OfferProductSelector
            products={myProducts}
            selectedIds={form.products}
            discountPercent={discountPercentNum}
            loading={loadingProducts}
            onToggle={toggleProduct}
            scopeLabel="your products"
          />

          {/* Live preview */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">Preview</label>
            <OfferHomepagePreview offer={form} placement={isFestival ? 'festival' : 'homepage'} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 text-sm"
            >
              {saving ? 'Saving...' : offer ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function SellerOffers() {
  const [placement, setPlacement] = useState('homepage');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const { seller } = useSellerStore();
  const updateSeller = useSellerStore((state) => state.updateSeller);
  const [offerPlans, setOfferPlans] = useState([]);
  const [payingPlanId, setPayingPlanId] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [bankPlan, setBankPlan] = useState(null);
  // Offer plan banner limit from the server: { limit (-1 = unlimited), used }.
  const [bannerQuota, setBannerQuota] = useState(null);
  const hasOfferPlan = Boolean(
    seller?.offerPlanSnapshot &&
    (!seller.offerPlanExpiresAt || new Date(seller.offerPlanExpiresAt).getTime() > Date.now())
  );
  // Promotional banners included in the seller's own plan (e.g. Silver: 1 per
  // year) — usable without an offer plan. Backend enforces the same count.
  const freePerYear = capsOf(seller?.planSnapshot).promoBannersPerYear;
  const usedThisYear = offers.filter(o => Date.now() - new Date(o.createdAt).getTime() < 365 * 24 * 60 * 60 * 1000).length;
  const freeLeft = freePerYear === -1 ? Infinity : Math.max(0, freePerYear - usedThisYear);
  const hasActivePlan = hasOfferPlan || freePerYear !== 0;
  const planBannersLeft = !hasOfferPlan || !bannerQuota ? 0
    : bannerQuota.limit === -1 ? Infinity : Math.max(0, bannerQuota.limit - bannerQuota.used);
  const canCreate = (hasOfferPlan && (!bannerQuota || planBannersLeft > 0)) || freeLeft > 0;
  const visibleOffers = offers.filter((offer) => (
    (offer.placement || (offer.tag || offer.description || offer.discountText ? 'festival' : 'homepage')) === placement
  ));

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await sellerAPI.getMyOffers();
      setOffers(data.offers || []);
      setBannerQuota(data.bannerQuota || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);
  useEffect(() => {
    sellerAPI.getOfferPlans()
      .then(data => setOfferPlans(data.plans || []))
      .catch(() => toast.error('Failed to load offer plans'));
    settingsAPI.getPaymentDetails()
      .then(data => setPaymentDetails(data.paymentDetails || null))
      .catch(() => {});
  }, []);

  const buyOfferPlan = async (plan) => {
    setPayingPlanId(plan._id);
    try {
      const order = await sellerAPI.createOfferPlanPayment({ planId: plan._id });
      if (order.freeUpgrade) {
        const result = await sellerAPI.activateOfferPlan({ planId: plan._id });
        updateSeller(result.seller);
        toast.success('Offer plan activated using your plan credit.');
        setPayingPlanId(null);
        return;
      }
      if (!window.Razorpay) { toast.error('Payment gateway is loading. Please try again.'); setPayingPlanId(null); return; }
      const checkout = new window.Razorpay({
        key: order.key, amount: order.amount, currency: order.currency, name: 'growthkarts',
        description: `${plan.name} Offer Plan - ₹${order.pricing?.payableAmount ?? plan.price}`, order_id: order.razorpayOrderId, theme: { color: '#a98345' },
        handler: async (response) => {
          try {
            const result = await sellerAPI.activateOfferPlan({ planId: plan._id, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
            updateSeller(result.seller);
            toast.success('Offer plan activated! You can now create homepage offers.');
          } catch (err) { toast.error(err.message || 'Offer plan activation failed'); }
          finally { setPayingPlanId(null); }
        },
        modal: { ondismiss: () => setPayingPlanId(null) },
      });
      checkout.on('payment.failed', () => { toast.error('Payment failed. Please try again.'); setPayingPlanId(null); });
      checkout.open();
    } catch (err) { toast.error(err.message || 'Could not start payment'); setPayingPlanId(null); }
  };

  const submitBankPayment = () => {
    setBankPlan(null);
    toast.success('Bank payment submitted for admin verification.');
  };

  const openCreate = () => {
    if (!canCreate) {
      toast.error(hasOfferPlan && bannerQuota?.limit > 0
        ? `Your offer plan allows ${bannerQuota.limit} homepage banner(s) and you have used all of them. Delete an old banner or upgrade your offer plan.`
        : `Your plan includes ${freePerYear} promotional banner(s) per year and you've used them. Buy an offer plan below to create more.`);
      return;
    }
    setEditingOffer(null); setShowModal(true);
  };
  const openEdit = (offer) => { setEditingOffer(offer); setPlacement(offer.placement || 'homepage'); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingOffer(null); };
  const handleSaved = () => { closeModal(); fetchOffers(); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this offer? This cannot be undone.')) return;
    try {
      await sellerAPI.deleteOffer(id, placement);
      toast.success('Offer deleted');
      fetchOffers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  if (!hasActivePlan) {
    return (
      <SellerLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Homepage Offers</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Choose an offer-only plan to publish promotional banners on the homepage.</p>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <FiTag className="w-4 h-4" /> Offer plan required
            </span>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-800 pb-3 mb-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Available Offer Plans</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Plans configured by Super Admin. Your regular seller subscription is separate.</p>
          </div>

          {offerPlans.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No offer plans are available right now.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {offerPlans.map(plan => (
                <div key={plan._id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col min-h-[220px]">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{plan.name}</p>
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">₹{Number(plan.pricing?.payableAmount ?? plan.price).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-400">{plan.durationLabel || '/ Year'}</span></p>
                    {plan.pricing?.creditAmount > 0 && <p className="text-xs text-green-600 dark:text-green-400 mt-1">₹{Number(plan.pricing.originalPrice).toLocaleString('en-IN')} plan, ₹{Number(plan.pricing.creditAmount).toLocaleString('en-IN')} credit applied ({plan.pricing.creditPercent}%)</p>}
                    <p className="mt-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{plan.bannerLimit > 0 ? `Up to ${plan.bannerLimit} homepage banner${plan.bannerLimit === 1 ? '' : 's'}` : 'Unlimited homepage banners'}</p>
                    <ul className="mt-2 space-y-1.5">{(plan.features || []).map(feature => <li key={feature} className="text-sm text-gray-500 dark:text-gray-400">• {feature}</li>)}</ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <button onClick={() => buyOfferPlan(plan)} disabled={payingPlanId === plan._id} className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors">
                      {payingPlanId === plan._id ? 'Opening...' : 'Razorpay'}
                    </button>
                    <button onClick={() => setBankPlan(plan)} disabled={!paymentDetails?.bankTransferEnabled} className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
                      <FiSmartphone className="w-3.5 h-3.5" /> Bank / QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {bankPlan && <OfferBankPaymentModal plan={bankPlan} details={paymentDetails} onClose={() => setBankPlan(null)} onSubmitted={submitBankPayment} />}
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{placement === 'homepage' ? 'Homepage Offers' : 'Festival Offers'}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {placement === 'homepage'
              ? 'Upload an image-only banner. Admin approval is required before it appears in the homepage carousel.'
              : 'Create a festival offer card. Admin approval is required before it appears in the homepage Festival Offers section.'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0"
        >
          <FiPlus className="w-4 h-4" /> {placement === 'homepage' ? 'Upload Homepage Image' : 'Create Festival Offer'}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: 'homepage', label: 'Homepage Offers' },
          { key: 'festival', label: 'Festival Offers' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPlacement(tab.key)}
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

      {hasOfferPlan && bannerQuota && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${planBannersLeft > 0 ? 'border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>
          {bannerQuota.limit === -1
            ? `Your ${seller?.offerPlanSnapshot?.name || ''} offer plan includes unlimited homepage banners.`
            : `Homepage banners: ${bannerQuota.used} of ${bannerQuota.limit} used on your ${seller?.offerPlanSnapshot?.name || ''} offer plan${planBannersLeft > 0 ? ` — ${planBannersLeft} left.` : '. Delete an old banner or upgrade your offer plan to add more.'}`}
        </div>
      )}

      {!hasOfferPlan && freePerYear !== 0 && (
        <div className="mb-6 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
          {freePerYear === -1
            ? 'Your plan includes unlimited promotional banners.'
            : `Your ${seller?.planSnapshot?.name || ''} plan includes ${freePerYear} promotional banner(s) per year — ${freeLeft} left. Buy an offer plan below for more.`}
        </div>
      )}

      {offerPlans.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Offer Plans</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Plans configured by Super Admin for Homepage Offers.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {offerPlans.map((plan) => {
              const isCurrent = seller?.offerPlan && String(seller.offerPlan) === String(plan._id);
              return (
                <div key={plan._id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${isCurrent ? 'border-indigo-400 dark:border-indigo-500' : 'border-gray-100 dark:border-gray-800'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{plan.name}</p>
                    {isCurrent && <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">Current Plan</span>}
                  </div>
                  <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">₹{Number(plan.pricing?.payableAmount ?? plan.price).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-400">{plan.durationLabel || '/ Year'}</span></p>
                  {plan.pricing?.creditAmount > 0 && <p className="text-xs text-green-600 dark:text-green-400 mt-1">₹{Number(plan.pricing.creditAmount).toLocaleString('en-IN')} credit applied</p>}
                  <p className="mt-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{plan.bannerLimit > 0 ? `Up to ${plan.bannerLimit} homepage banner${plan.bannerLimit === 1 ? '' : 's'}` : 'Unlimited homepage banners'}</p>
                  <ul className="mt-1 min-h-10">{(plan.features || []).slice(0, 3).map(feature => <li key={feature} className="text-xs text-gray-500 dark:text-gray-400">• {feature}</li>)}</ul>
                  {!isCurrent && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => buyOfferPlan(plan)} disabled={payingPlanId === plan._id} className="py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-60">{payingPlanId === plan._id ? 'Opening...' : 'Razorpay'}</button><button onClick={() => setBankPlan(plan)} disabled={!paymentDetails?.bankTransferEnabled} className="py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold disabled:opacity-40">Bank / QR</button></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
        ) : visibleOffers.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-gray-500">
            <FiTag className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm mb-4">{placement === 'homepage' ? 'No homepage images uploaded yet.' : 'No festival offers created yet.'}</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              <FiPlus className="w-4 h-4" /> {placement === 'homepage' ? 'Upload Homepage Image' : 'Create Festival Offer'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {visibleOffers.map((offer) => {
              const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={offer._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <img
                    src={offer.image}
                    alt={placement === 'homepage' ? 'Homepage offer banner' : offer.title}
                    style={offerGradientStyle(offer.colorFrom, offer.colorTo)}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {placement === 'festival' && <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{offer.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                      {offer.tag && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{offer.tag}</span>}
                    </div>}
                    {placement === 'festival' && offer.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{offer.description}</p>}
                    {placement === 'festival' && offer.discountText && <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">{offer.discountText}</p>}
                    {offer.status === 'rejected' && offer.rejectionReason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">Reason: {offer.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(offer)}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(offer._id)}
                      className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {bankPlan && <OfferBankPaymentModal plan={bankPlan} details={paymentDetails} onClose={() => setBankPlan(null)} onSubmitted={submitBankPayment} />}

      <AnimatePresence>
        {showModal && <OfferModal offer={editingOffer} placement={placement} onClose={closeModal} onSaved={handleSaved} />}
      </AnimatePresence>
    </SellerLayout>
  );
}
