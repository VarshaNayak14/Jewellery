import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiPhone, FiShoppingBag, FiImage, FiMapPin, FiFileText, FiCheck, FiClock, FiTag, FiCreditCard, FiZap, FiDownload, FiCheckCircle, FiSmartphone, FiCopy, FiX, FiUploadCloud, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { sellerAPI, planAPI, settingsAPI, categoryAPI, businessAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SearchableSelect from '../../components/common/SearchableSelect';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { INDIA_STATES, INDIA_DISTRICTS, getTehsilsByDistrict } from '../../data/indiaLocations';
import SelectWithOther from '../../components/common/SelectWithOther';
import { FiAward, FiTrendingUp, FiMap, FiShield } from 'react-icons/fi';
import './SellerRegister.css';

const SPECIALITIES = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Bridal', 'Kundan & Polki', 'Gemstones', 'Temple', "Men's", 'Kids', 'Custom Design'];

const PARTNER_PERKS = [
  { icon: FiAward, title: 'Hallmark-ready listings', desc: 'Purity, weight, HUID and certificates on every piece.' },
  { icon: FiTrendingUp, title: 'Live gold-rate pricing', desc: "Prices follow today's rate automatically." },
  { icon: FiMap, title: 'Found by nearby buyers', desc: 'Show up in "Jewellers near me" across your area.' },
  { icon: FiShield, title: 'Your own store page', desc: 'A branded showroom page with WhatsApp & call buttons.' },
];

const HOW_IT_WORKS = ['Pick a plan', 'Pay securely', 'Add your details', 'Get approved & start selling'];

const steps = ['Choose Plan', 'Payment Confirmed', 'Personal Info', 'Shop Info', 'Review'];

const COLOR_STYLES = {
  gray: { ring: 'border-gray-200 dark:border-gray-700', badgeBg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', accent: 'from-gray-500 to-gray-600', text: 'text-gray-600 dark:text-gray-400' },
  blue: { ring: 'border-blue-200 dark:border-blue-500/30', badgeBg: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400', accent: 'from-blue-500 to-blue-600', text: 'text-blue-600 dark:text-blue-400' },
  yellow: { ring: 'border-yellow-300 dark:border-yellow-500/30', badgeBg: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', accent: 'from-amber-500 to-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
  purple: { ring: 'border-purple-200 dark:border-purple-500/30', badgeBg: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400', accent: 'from-purple-600 to-indigo-600', text: 'text-purple-600 dark:text-purple-400' },
};

// Loads the Razorpay Checkout script once (index.html already includes it,
// this is just a safety net in case it hasn't finished loading yet).
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Step 0: Full-page pricing — every plan gets its own "Pay" button that
// opens Razorpay Checkout directly (Super Admin's Razorpay keys, set in
// Settings → Payment, decide whether this is live). ───────────────────────
function PricingPage({ plans, plansLoading, payingPlanId, razorpayReady, bankEnabled, onPay, onBank }) {
  if (plansLoading) {
    return (
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-16">No plans available right now. Please check back later.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full items-stretch">
      {plans.map(plan => {
        const style = COLOR_STYLES[plan.color] || COLOR_STYLES.blue;
        const isPaying = payingPlanId === plan._id;
        return (
          <div
            key={plan._id}
            className={`relative flex flex-col rounded-2xl border-2 bg-white dark:bg-gray-900 p-6 transition-all ${plan.badge ? 'border-amber-300 dark:border-amber-500/40 shadow-xl scale-[1.02]' : `${style.ring} shadow-sm hover:shadow-md`}`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full bg-amber-400 text-amber-900 shadow">
                {plan.badge}
              </span>
            )}
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{plan.name}</h3>
            <p className="mb-4 mt-1">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">₹{plan.price.toLocaleString('en-IN')}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500"> {plan.durationLabel || '/ Year'}</span>
            </p>
            <ul className="space-y-2 flex-1 mb-5">
              {/* Product-count line is derived from productLimit, not the
                  stored feature text, so it always matches what Super Admin
                  actually set even if the free-text features weren't edited. */}
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {plan.productLimit === -1 ? 'Unlimited product listings' : `Up to ${plan.productLimit} product listings`}
              </li>
              {plan.features
                .filter(f => !/^(up to \d+|unlimited)\s+product\s+listings?$/i.test(f.trim()))
                .map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
            </ul>
            <div className="space-y-2">
              <button
                type="button"
                disabled={isPaying || !razorpayReady}
                onClick={() => onPay(plan)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${style.accent} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg`}
              >
                {isPaying ? (
                  'Opening payment…'
                ) : (
                  <>
                    <FiZap className="w-4 h-4" /> Pay Online with Razorpay
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isPaying || !bankEnabled}
                onClick={() => onBank(plan)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiSmartphone className="w-4 h-4" /> Pay via Bank / QR
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Payment receipt — shown right after Razorpay confirms the
// payment, so the seller has a clear "screenshot" style confirmation before
// moving on. Nothing to upload — this is generated from the verified
// Razorpay response, not a manual screenshot. ─────────────────────────────
function PaymentReceipt({ receipt }) {
  const cardRef = useRef(null);

  const handleDownload = () => {
    // Lightweight, dependency-free "screenshot": prints just this card.
    // (No canvas library is loaded in this app, so we use the browser's
    // native print-to-PDF/image flow instead of faking a download.)
    window.print();
  };

  if (!receipt) return null;

  const isBank = receipt.method === 'bank_qr';

  return (
    <div className="flex flex-col items-center text-center py-2">
      <div ref={cardRef} className={`w-full max-w-md bg-white dark:bg-gray-900 border rounded-2xl shadow-lg p-6 ${isBank ? 'border-amber-200 dark:border-amber-500/30' : 'border-green-200 dark:border-green-500/30'}`}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isBank ? 'bg-amber-100 dark:bg-amber-500/10' : 'bg-green-100 dark:bg-green-500/10'}`}>
          {isBank
            ? <FiClock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            : <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />}
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{isBank ? 'Payment Submitted' : 'Payment Successful'}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          {isBank ? 'Bank / QR transfer' : 'Paid via Razorpay'} · {new Date(receipt.paidAt).toLocaleString('en-IN')}
        </p>

        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 space-y-2.5 text-left">
          <Row label="Plan" value={receipt.planName} />
          <Row label={isBank ? 'Amount' : 'Amount Paid'} value={`₹${receipt.amount.toLocaleString('en-IN')}`} />
          {isBank ? (
            <Row label="Reference (UTR)" value={receipt.reference} mono />
          ) : (
            <>
              <Row label="Payment ID" value={receipt.paymentId} mono />
              <Row label="Order ID" value={receipt.orderId} mono />
            </>
          )}
          <Row
            label="Status"
            value={isBank ? 'Awaiting verification' : 'Verified ✓'}
            valueClass={isBank ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
      >
        <FiDownload className="w-3.5 h-3.5" /> Save / print this receipt
      </button>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 max-w-sm">
        {isBank
          ? 'Our team will verify your transfer while reviewing your application. Continue to finish setting up your shop.'
          : 'Your plan fee has been verified automatically — no need to upload a screenshot. Continue to finish setting up your shop.'}
      </p>
    </div>
  );
}

// ── Bank / QR option — shows the Super Admin's QR, UPI and bank details, and
// collects the seller's transaction reference (+ optional screenshot). The
// plan is only confirmed once Admin verifies the transfer and approves. ────
function CopyRow({ label, value }) {
  if (!value) return null;
  const copy = () => navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied`)).catch(() => {});
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-medium text-gray-800 dark:text-gray-100 font-mono break-all text-right">{value}</span>
        <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0">
          <FiCopy className="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  );
}

function BankTransferModal({ plan, details, onClose, onSubmit }) {
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [uploading, setUploading] = useState(false);
  const bank = details?.bankDetails || {};
  const hasBank = bank.accountNumber || bank.ifscCode || bank.accountHolderName || bank.bankName;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await sellerAPI.uploadPaymentProof(file);
      setScreenshot(data.url);
      toast.success('Screenshot uploaded');
    } catch (err) {
      toast.error(err.message || 'Could not upload screenshot');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = () => {
    if (reference.trim().length < 6) {
      toast.error('Please enter your UTR / transaction reference number');
      return;
    }
    if (!screenshot) {
      toast.error('Please upload the payment screenshot');
      return;
    }
    onSubmit({ reference: reference.trim(), screenshot });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Pay via Bank / QR</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{plan.name} plan · ₹{plan.price.toLocaleString('en-IN')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FiX className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Send exactly <strong className="text-gray-800 dark:text-gray-100">₹{plan.price.toLocaleString('en-IN')}</strong> using the details below, then enter your transaction reference.
          </p>

          {details?.qrCode && (
            <div className="flex justify-center">
              <img src={details.qrCode} alt="Payment QR code" className="w-44 h-44 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-1" />
            </div>
          )}

          {(details?.upiId || hasBank) && (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 space-y-2.5">
              <CopyRow label="UPI ID" value={details?.upiId} />
              <CopyRow label="Account Holder" value={bank.accountHolderName} />
              <CopyRow label="Account Number" value={bank.accountNumber} />
              <CopyRow label="IFSC Code" value={bank.ifscCode} />
              <CopyRow label="Bank" value={bank.bankName} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UTR / Transaction Reference *</label>
            <input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. 4123 4567 8901"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Screenshot *</label>
            {screenshot ? (
              <div className="flex items-center gap-3">
                <img src={screenshot} alt="Payment screenshot" className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <button type="button" onClick={() => setScreenshot('')} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <FiUploadCloud className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload screenshot'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFile} />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || !screenshot}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-60 transition-opacity shadow-lg"
          >
            I've Paid — Continue
          </button>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">Your plan is activated after our team verifies the transfer.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueClass }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right break-all ${mono ? 'font-mono' : ''} ${valueClass || 'text-gray-800 dark:text-gray-100'}`}>{value}</span>
    </div>
  );
}

function InputField({ label, icon: Icon, type = 'text', field, placeholder, error, value, onChange }) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
        {isPassword && (
          <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200">
            {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          </button>
        )}
        <input
          type={isPassword && showPass ? 'text' : type} value={value} onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-10 ${isPassword ? 'pr-10' : 'pr-4'} py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${error ? 'border-red-400 dark:border-red-500/50 focus:ring-red-300 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800'}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function CategorySelect({ icon: Icon, error, value, onChange, categories, loading }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Category *</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none z-10" />
        <SelectWithOther
          value={value} onChange={v => onChange({ target: { value: v } })} disabled={loading}
          options={categories.map(cat => ({ value: cat.name, label: cat.name }))}
          placeholder={loading ? 'Loading categories…' : 'Select a business category'}
          otherPlaceholder="Type your business category"
          className={`w-full pl-10 pr-8 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all appearance-none bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60 ${error ? 'border-red-400 dark:border-red-500/50 focus:ring-red-300 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-300'} ${!value ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
        />
      </div>
      {!loading && categories.length === 0 && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">No categories listed yet — choose "Other" and type yours.</p>
      )}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default function SellerRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(true); // assume true until checked, so button isn't disabled while loading
  const [razorpayScriptReady, setRazorpayScriptReady] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null); // Super Admin's QR / UPI / bank details
  const [bankPlan, setBankPlan] = useState(null); // plan currently open in the Bank/QR modal
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  // Tehsil options for the picker: the official static list for the chosen
  // state+district (see data/indiaLocations.js) merged with any tehsils
  // already on file in the database for that district (so an existing
  // seller's tehsil always shows up even if it's missing from the static
  // list). Falls back to database-only where no static list exists yet
  // (most states besides Madhya Pradesh) — the seller can still type their
  // own tehsil via allowCustom if it's missing from both.
  const [tehsilOptions, setTehsilOptions] = useState([]);
  const [tehsilsLoading, setTehsilsLoading] = useState(false);
  const [receipt, setReceipt] = useState(null); // { method, planName, amount, paidAt, paymentId+orderId | reference }
  const [form, setForm] = useState({
    planId: '',
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    shopName: '', shopDescription: '', address: '', logo: '',
    gstin: '', bisRegistration: '', specialities: [], yearEstablished: '',
    category: '', city: '', tehsil: '', district: '', state: '',
    razorpay_order_id: '', razorpay_payment_id: '', razorpay_signature: '',
    paymentReference: '', paymentScreenshot: '',
    referralCode: searchParams.get('ref') || '',
  });
  const [errors, setErrors] = useState({});

  // Plans are managed dynamically by the Super Admin — fetched fresh every visit
  useEffect(() => {
    planAPI.getAll()
      .then(data => setPlans(data.plans || []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  // Payment options come from the Super Admin's Settings → Payment: Razorpay
  // is offered once keys are saved, Bank/QR once a QR, UPI ID or bank account
  // is filled in.
  useEffect(() => {
    settingsAPI.getPaymentDetails()
      .then(data => {
        setPaymentDetails(data.paymentDetails || null);
        setRazorpayEnabled(Boolean(data.paymentDetails?.razorpayEnabled));
      })
      .catch(() => setRazorpayEnabled(false));
  }, []);

  // Razorpay Checkout script — index.html already includes it, this just
  // confirms it's ready before enabling the Pay buttons.
  useEffect(() => {
    loadRazorpayScript().then(setRazorpayScriptReady);
  }, []);

  // Business categories are managed by Super Admin (Category Management) —
  // sellers pick from this list instead of typing their own category.
  useEffect(() => {
    categoryAPI.getAll()
      .then(data => setCategories((data.categories || []).filter(c => c.isActive !== false)))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Rebuild the Tehsil options whenever state/district changes: static
  // official list for that district (if we have one) + tehsils already on
  // file in the database for that district, deduped and sorted.
  useEffect(() => {
    if (!form.district) { setTehsilOptions([]); return; }

    const staticList = getTehsilsByDistrict(form.state, form.district);
    setTehsilOptions(staticList); // show the static list immediately, no flicker
    setTehsilsLoading(true);

    businessAPI.getTehsils(form.district)
      .then(data => {
        const onFile = data.data || [];
        const merged = Array.from(new Set([...staticList, ...onFile])).sort((a, b) =>
          a.localeCompare(b)
        );
        setTehsilOptions(merged);
      })
      .catch(() => setTehsilOptions(staticList))
      .finally(() => setTehsilsLoading(false));
  }, [form.state, form.district]);

  const set = (key) => (e) => {
    setForm(p => ({ ...p, [key]: e.target.value }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  // ── Razorpay: create an order for the chosen plan, open Checkout, verify
  // the signature server-side, then drop the seller onto the receipt step. ──
  const handlePay = async (plan) => {
    if (!razorpayEnabled) {
      toast.error('Online payment is not set up yet. Please check back soon.');
      return;
    }
    if (!razorpayScriptReady || !window.Razorpay) {
      toast.error('Payment gateway is still loading, please try again in a moment.');
      return;
    }
    setPayingPlanId(plan._id);
    try {
      const data = await sellerAPI.createPlanPayment({ planId: plan._id });
      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'growthkarts',
        description: `${plan.name} Seller Plan — 1 Year`,
        order_id: data.razorpayOrderId,
        theme: { color: '#a98345' },
        handler: async (response) => {
          try {
            await sellerAPI.verifyPlanPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setForm(p => ({
              ...p,
              planId: plan._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentReference: '',
              paymentScreenshot: '',
            }));
            setReceipt({
              method: 'razorpay',
              planName: plan.name,
              amount: plan.price,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              paidAt: new Date().toISOString(),
            });
            toast.success('Payment successful!');
            setStep(1);
          } catch (err) {
            toast.error(err.message || 'Payment verification failed. Please contact support.');
          } finally {
            setPayingPlanId(null);
          }
        },
        modal: {
          ondismiss: () => setPayingPlanId(null),
        },
      });
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setPayingPlanId(null);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Could not start payment. Please try again.');
      setPayingPlanId(null);
    }
  };

  // ── Bank / QR: seller has transferred the fee manually and entered the
  // reference — Admin verifies it when reviewing the application. ───────────
  const handleBankSubmit = ({ reference, screenshot }) => {
    const plan = bankPlan;
    setForm(p => ({
      ...p,
      planId: plan._id,
      razorpay_order_id: '', razorpay_payment_id: '', razorpay_signature: '',
      paymentReference: reference,
      paymentScreenshot: screenshot,
    }));
    setReceipt({
      method: 'bank_qr',
      planName: plan.name,
      amount: plan.price,
      reference,
      paidAt: new Date().toISOString(),
    });
    setBankPlan(null);
    setStep(1);
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name required';
    if (!form.email.trim()) e.email = 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.phone.trim()) e.phone = 'Mobile number required';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.shopName.trim()) e.shopName = 'Shop name required';
    if (!form.category.trim()) e.category = 'Business category required';
    // Only the location level that matches the chosen plan's visibility
    // scope is collected — a Tehsil-plan seller doesn't need to also pick
    // a district and state, etc.
    const scope = plans.find(p => p._id === form.planId)?.visibilityScope;
    // Tehsil/District plans take the city from the District pick, so City is
    // only asked (and required) for State/India plans.
    if (!['tehsil', 'district'].includes(scope) && !form.city.trim()) e.city = 'City required';
if (scope === 'tehsil') {
  if (!form.state.trim()) e.state = 'State required';
  if (!form.district.trim()) e.district = 'District required';
  if (!form.tehsil.trim()) e.tehsil = 'Tehsil required';
}

if (scope === 'district') {
  if (!form.state.trim()) e.state = 'State required';
  if (!form.district.trim()) e.district = 'District required';
}

if (scope === 'state') {
  if (!form.state.trim()) e.state = 'State required';
}
    if (!form.address.trim()) e.address = 'Shop address required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    // step 0 (Choose Plan) advances automatically once Razorpay payment succeeds
    // step 1 (Payment Confirmed) has nothing to validate — just a receipt view
    // step 2 (Personal Info): no email code here — the seller verifies their
    // email later from the Seller Panel.
    if (step === 2 && !validateStep1()) return;
    if (step === 3 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await sellerAPI.register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        shopName: form.shopName,
        shopDescription: form.shopDescription,
        gstin: form.gstin,
        bisRegistration: form.bisRegistration,
        specialities: form.specialities,
        yearEstablished: form.yearEstablished || undefined,
        address: form.address,
        logo: form.logo,
        category: form.category,
        city: cityFromDistrict ? form.district : form.city,
        tehsil: form.tehsil,
        district: form.district,
        state: form.state,
        planId: form.planId,
        referralCode: form.referralCode,
        razorpay_order_id: form.razorpay_order_id,
        razorpay_payment_id: form.razorpay_payment_id,
        razorpay_signature: form.razorpay_signature,
        paymentReference: form.paymentReference,
        paymentScreenshot: form.paymentScreenshot,
      });
      // Registration only submits a request — the seller cannot log in or open
      // their dashboard until an admin approves the account.
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p._id === form.planId);
  // Tehsil/District plans pick a District from the list — use it as the city too.
  const cityFromDistrict = ['tehsil', 'district'].includes(selectedPlan?.visibilityScope);
  const bankTransferEnabled = Boolean(paymentDetails?.bankTransferEnabled);

  if (submitted) {
    return (
      <div className="min-h-screen seller-reg-page flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FiClock className="w-8 h-8 text-amber-500 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Request Submitted!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your <strong>{selectedPlan?.name || ''}</strong> plan seller application for <strong>{form.shopName}</strong> has
            been sent for admin review. You'll be able to log in as soon as your account is approved.
            {receipt?.method === 'bank_qr' && ' Your bank/QR transfer will be verified as part of the review.'}
          </p>
          <Link to="/seller/login"
            className="block w-full text-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-lg">
            Go to Seller Login
          </Link>
          <Link to="/" className="block mt-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">Back to Home</Link>
        </motion.div>
      </div>
    );
  }

  // ── Step indicator, reused by both the full-page pricing step and the
  // narrower wizard card for the remaining steps. ───────────────────────
  //
  // Fix: the card this sits in is capped at max-w-lg/xl with overflow-hidden,
  // and all 5 step labels together ("Choose Plan", "Payment Confirmed", ...)
  // are wider than that, so the last step was getting clipped off the edge
  // instead of wrapping. The row of circles/connectors alone always fits
  // regardless of card width; the current step's full label is shown as a
  // caption underneath instead of squeezed inline next to every circle.
  const StepIndicator = () => (
    <div>
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1 last:flex-none">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i < step ? 'bg-green-400 text-white' : i === step ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'
            }`}>
              {i < step ? <FiCheck className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-px flex-1 min-w-[8px] ${i < step ? 'bg-green-400' : 'bg-white/20'}`} />}
          </div>
        ))}
      </div>
      <p className="text-xs text-[#e8d6b4] mt-2">
        Step {step + 1} of {steps.length}: <span className="font-semibold text-white">{steps[step]}</span>
      </p>
    </div>
  );

  // ── Step 0: Choose Plan & Pay — a dedicated full-width pricing page
  // (not squeezed into the wizard card) so every plan gets real estate and
  // its own "Pay" button, like a normal pricing page. ───────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen relative seller-reg-page">
        <div className="absolute top-4 right-4 z-20"><LanguageSwitcher /></div>
        <div className="seller-reg-hero px-4 sm:px-8 pt-6 pb-10 text-white">
          <div className="relative max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Link
                to="/"
                aria-label="Back to Home"
                title="Back to Home"
                className="mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Become a Seller</h1>
                <p className="text-[#e8d6b4] text-sm">Partner program for jewellers</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-end mt-8 mb-10">
              <div>
                <span className="seller-reg-eyebrow">For jewellers & showrooms</span>
                <h2 className="seller-reg-title">Bring your <em>jewellery store</em> online.</h2>
                <p className="text-[#eadcc2] mt-4 max-w-xl">
                  List your collection with purity, weight and hallmark details, price it from today's gold rate,
                  and let customers nearby find your showroom.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {PARTNER_PERKS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="seller-reg-perk">
                    <Icon className="w-5 h-5 text-[#f0d79f] mb-2" />
                    <p className="font-semibold text-sm text-white">{title}</p>
                    <p className="text-xs text-[#dccbaa] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <StepIndicator />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          <ol className="seller-reg-how mb-10">
            {HOW_IT_WORKS.map((label, i) => (
              <li key={label}><span>{i + 1}</span>{label}</li>
            ))}
          </ol>
          <span className="sec-eyebrow">Plans</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Choose your subscription plan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Every plan gives you a dedicated store page. Higher tiers unlock more listings, wider reach, priority ranking and marketing tools.
          </p>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5 mb-8">
            <FiCreditCard className="w-3.5 h-3.5" /> Pay online with Razorpay, or by bank transfer / QR — pick a plan and a payment method to continue.
          </p>

          {paymentDetails && !razorpayEnabled && !bankTransferEnabled && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400 mb-6">
              Payments aren't set up yet. Please check back shortly, or contact support.
            </div>
          )}

          <PricingPage
            plans={plans}
            plansLoading={plansLoading}
            payingPlanId={payingPlanId}
            razorpayReady={razorpayEnabled && razorpayScriptReady}
            bankEnabled={bankTransferEnabled}
            onPay={handlePay}
            onBank={setBankPlan}
          />

          {bankPlan && (
            <BankTransferModal
              plan={bankPlan}
              details={paymentDetails}
              onClose={() => setBankPlan(null)}
              onSubmit={handleBankSubmit}
            />
          )}

          <div className="mt-8 text-center">
            <Link to="/seller/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">Already a seller? Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen seller-reg-page flex items-center justify-center p-4 py-10">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full overflow-hidden transition-all border border-amber-200/50 dark:border-amber-500/10 ${step === 1 ? 'max-w-lg' : 'max-w-xl'}`}>

        {/* Header */}
        <div className="seller-reg-hero px-4 sm:px-8 py-6 text-white">
          <div className="relative flex items-center gap-3 mb-4">
            <Link
              to="/"
              aria-label="Back to Home"
              title="Back to Home"
              className="mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FiShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Become a Seller</h1>
              <p className="text-[#e8d6b4] text-sm">Partner program for jewellers</p>
            </div>
          </div>
          <div className="relative"><StepIndicator /></div>
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <PaymentReceipt receipt={receipt} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Personal Information</h2>
              <InputField label="Email *" icon={FiMail} type="email" field="email" placeholder="seller@email.com" error={errors.email} value={form.email} onChange={set('email')} />
              <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">You can verify this email later from your Seller Panel.</p>
              <InputField label="Full Name *" icon={FiUser} field="name" placeholder="Your full name" error={errors.name} value={form.name} onChange={set('name')} />
              <InputField label="Password *" icon={FiLock} type="password" field="password" placeholder="Min 6 characters" error={errors.password} value={form.password} onChange={set('password')} />
              <InputField label="Confirm Password *" icon={FiLock} type="password" field="confirmPassword" placeholder="Re-enter password" error={errors.confirmPassword} value={form.confirmPassword} onChange={set('confirmPassword')} />
              <InputField label="Phone Number *" icon={FiPhone} field="phone" placeholder="+91 98765 43210" error={errors.phone} value={form.phone} onChange={set('phone')} />
              <InputField label="Referral Code (optional)" icon={FiTag} field="referralCode" placeholder="Got a code from another seller? Enter it here" value={form.referralCode} onChange={set('referralCode')} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Shop Information</h2>
              <InputField label="Shop Name *" icon={FiShoppingBag} field="shopName" placeholder="e.g. Shree Laxmi Jewellers" error={errors.shopName} value={form.shopName} onChange={set('shopName')} />
              <CategorySelect icon={FiTag} error={errors.category} value={form.category}
                onChange={set('category')} categories={categories} loading={categoriesLoading} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Description</label>
                <div className="relative">
                  <FiFileText className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <textarea value={form.shopDescription} onChange={set('shopDescription')} rows={3}
                    placeholder="Your story, craftsmanship, what you're known for — bridal sets, daily-wear gold, certified diamonds..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 resize-none" />
                </div>
              </div>
              {/* Only the location level the chosen plan actually uses is asked for. */}
              {/* Location selection based on selected plan */}

{selectedPlan?.visibilityScope === 'tehsil' && (
  <>
    <SearchableSelect
      label="State *"
      icon={FiMapPin}
      placeholder="Search your state..."
      options={INDIA_STATES}
      error={errors.state}
      value={form.state}
      onChange={(v) => {
        setForm(p => ({
          ...p,
          state: v,
          district: '',
          tehsil: '',
        }));

        setErrors(p => ({
          ...p,
          state: '',
          district: '',
          tehsil: '',
        }));
      }}
    />

    <SearchableSelect
      label="District *"
      icon={FiMapPin}
      placeholder={form.state ? 'Search your district...' : 'Select state first...'}
      options={INDIA_DISTRICTS[form.state] || []}
      error={errors.district}
      value={form.district}
      onChange={(v) => {
        setForm(p => ({
          ...p,
          district: v,
          tehsil: '',
        }));

        setErrors(p => ({
          ...p,
          district: '',
          tehsil: '',
        }));
      }}
    />

    <SearchableSelect
      label="Tehsil *"
      icon={FiMapPin}
      placeholder={form.district ? 'Search or type your tehsil...' : 'Select district first...'}
      options={tehsilOptions}
      loading={tehsilsLoading}
      allowCustom
      error={errors.tehsil}
      value={form.tehsil}
      onChange={(v) => {
        setForm(p => ({
          ...p,
          tehsil: v,
        }));

        if (errors.tehsil) {
          setErrors(p => ({
            ...p,
            tehsil: '',
          }));
        }
      }}
    />
  </>
)}

{selectedPlan?.visibilityScope === 'district' && (
  <>
    <SearchableSelect
      label="State *"
      icon={FiMapPin}
      placeholder="Search your state..."
      options={INDIA_STATES}
      error={errors.state}
      value={form.state}
      onChange={(v) => {
        setForm(p => ({
          ...p,
          state: v,
          district: '',
        }));

        setErrors(p => ({
          ...p,
          state: '',
          district: '',
        }));
      }}
    />

    <SearchableSelect
      label="District *"
      icon={FiMapPin}
      placeholder={form.state ? 'Search your district...' : 'Select state first...'}
      options={INDIA_DISTRICTS[form.state] || []}
      error={errors.district}
      value={form.district}
      onChange={(v) => {
        setForm(p => ({
          ...p,
          district: v,
        }));

        if (errors.district) {
          setErrors(p => ({
            ...p,
            district: '',
          }));
        }
      }}
    />
  </>
)}

{selectedPlan?.visibilityScope === 'state' && (
  <SearchableSelect
    label="State *"
    icon={FiMapPin}
    placeholder="Search your state..."
    options={INDIA_STATES}
    error={errors.state}
    value={form.state}
    onChange={(v) => {
      setForm(p => ({
        ...p,
        state: v,
      }));

      if (errors.state) {
        setErrors(p => ({
          ...p,
          state: '',
        }));
      }
    }}
  />
)}

{selectedPlan?.visibilityScope === 'india' && (
  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
    Your <strong>{selectedPlan.name}</strong> plan shows your shop across all of India — no location selection needed.
  </p>
)}

{/* Tehsil/District plans already pick a District — that doubles as the city. */}
{!cityFromDistrict && (
  <InputField label="City *" icon={FiMapPin} field="city" placeholder="e.g. Indore" error={errors.city} value={form.city} onChange={set('city')} />
)}

<p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2">
  This decides how far your shop is shown — see your plan's coverage above.
</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <InputField label="GSTIN" icon={FiFileText} field="gstin" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} />
                <InputField label="BIS Registration No." icon={FiAward} field="bisRegistration" placeholder="HM/C-1234567890" value={form.bisRegistration} onChange={e => setForm(p => ({ ...p, bisRegistration: e.target.value.toUpperCase() }))} />
              </div>
              <InputField label="Year Established" icon={FiClock} type="number" field="yearEstablished" placeholder="e.g. 1998" value={form.yearEstablished} onChange={set('yearEstablished')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What do you specialise in?</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALITIES.map(s => {
                    const on = form.specialities.includes(s);
                    return (
                      <button type="button" key={s}
                        onClick={() => setForm(p => ({ ...p, specialities: on ? p.specialities.filter(x => x !== s) : [...p.specialities, s] }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${on ? 'bg-amber-600 border-amber-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-400'}`}>
                        {on && <FiCheck className="inline w-3 h-3 mr-1 -mt-0.5" />}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <InputField label="Shop Address *" icon={FiMapPin} field="address" placeholder="Street, area..." error={errors.address} value={form.address} onChange={set('address')} />
              <InputField label="Shop Logo URL" icon={FiImage} field="logo" placeholder="https://your-logo-url.com/logo1.png" value={form.logo} onChange={set('logo')} />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Review Your Details</h2>
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-5 space-y-3">
                {[
                  { label: 'Plan', value: selectedPlan ? `${selectedPlan.name} — ₹${selectedPlan.price.toLocaleString('en-IN')}/yr` : '—' },
                  { label: 'Payment', value: !receipt ? 'Not paid' : receipt.method === 'bank_qr' ? `Bank / QR — ref ${receipt.reference} (pending verification)` : `Verified ✓ (Razorpay ${receipt.paymentId})` },
                  { label: 'Name', value: form.name },
                  { label: 'Email', value: form.email },
                  { label: 'Phone', value: form.phone || '—' },
                  { label: 'Shop Name', value: form.shopName },
                  { label: 'Category', value: form.category },
                  ...(form.gstin ? [{ label: 'GSTIN', value: form.gstin }] : []),
                  ...(form.bisRegistration ? [{ label: 'BIS Reg.', value: form.bisRegistration }] : []),
                  ...(form.specialities.length ? [{ label: 'Specialities', value: form.specialities.join(', ') }] : []),
                  ...(!cityFromDistrict ? [{ label: 'City', value: form.city }] : []),
                  ...(selectedPlan?.visibilityScope === 'tehsil' ? [{ label: 'Tehsil', value: form.tehsil }] : []),
                  ...(cityFromDistrict ? [{ label: 'District / City', value: form.district }] : []),
                  ...(['tehsil', 'district', 'state'].includes(selectedPlan?.visibilityScope) ? [{ label: 'State', value: form.state }] : []),
                  ...(selectedPlan?.visibilityScope === 'india' ? [{ label: 'Visibility', value: 'All of India' }] : []),
                  { label: 'Address', value: form.address },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm gap-4">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{label}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
                <strong>⏳ Pending Review:</strong> This submits a request only. Your account will be reviewed by our admin team, and only approved sellers can log in and access the dashboard. You'll be notified once approved.
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 0 ? (
                <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  ← Back
                </button>
              ) : (
                <Link to="/seller/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">Already a seller? Login</Link>
              )}
            </div>
            <div>
              {step < steps.length - 1 ? (
                <button onClick={handleNext}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-lg">
                  Continue →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity text-sm shadow-lg">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}