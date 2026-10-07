import { useState, useEffect } from 'react';
import { FiSave, FiShoppingBag, FiImage, FiMapPin, FiTag, FiTruck, FiClock, FiX, FiAward, FiCamera, FiPlus, FiTrash2, FiDollarSign } from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import { sellerAPI, categoryAPI } from '../../services/api';
import { useSellerStore } from '../../store/sellerStore';
import { getStoreUrl } from '../../utils/subdomain';
import { useTheme } from '../../context/ThemeContext';
import { capsOf } from '../../utils/planFeatures';
import { PlanLockBadge } from '../../components/common/PlanLock';
import SellerLayout from './SellerLayout';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import toast from 'react-hot-toast';
import SelectWithOther from '../../components/common/SelectWithOther';

// Defined at module scope (not inside SellerShopSettings) so React keeps the
// same component identity across re-renders — defining these inside the
// parent recreates them on every keystroke, which makes React remount the
// <input> each time and drops focus after a single character.
const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
      <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Field = ({ label, value, onChange, type = 'text', placeholder, textarea }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {textarea ? (
      <textarea value={value} onChange={onChange} rows={3} placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 resize-none" />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800" />
    )}
  </div>
);

// Reads a video's length (seconds) from its metadata; null if it can't be read.
const getVideoDuration = (url) => new Promise((resolve) => {
  const video = document.createElement('video');
  const done = (v) => { clearTimeout(timer); video.removeAttribute('src'); resolve(v); };
  const timer = setTimeout(() => done(null), 15000);
  video.preload = 'metadata';
  video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
  video.onerror = () => done(null);
  video.src = url;
});
const formatDuration = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')} min`;

const SCOPE_LABEL = { tehsil: 'Tehsil', district: 'District', state: 'State', india: 'India' };
const SCOPE_DESC = {
  tehsil: 'your shop is shown only within your own tehsil',
  district: 'your shop is shown anywhere within your district',
  state: 'your shop is shown anywhere within your state',
  india: 'your shop is shown all over India',
};

const DAYS = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
  ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
];
const EMPTY_HOURS = { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' };
const EMPTY_FOOTER_COLUMN = () => ({ heading: '', subheading: '', links: [{ label: '', url: '' }] });

export default function SellerShopSettings() {
  const { seller, updateSeller, visibility } = useSellerStore();
  const { isDark } = useTheme();
  const caps = capsOf(seller?.planSnapshot);
  const [form, setForm] = useState({
    shopName: '', description: '', phone: '', whatsapp: '', address: '', footerEmail: '', logo: '', lightLogo: '', darkLogo: '', banner: '', bannerType: 'image',
    category: '', city: '', tehsil: '', district: '', state: '', pincode: '',
    upiId: '', qrCodeImage: '', courierSettlementMode: 'online', shippingCharge: '', freeShippingThreshold: '',
    gallery: [], workingHours: EMPTY_HOURS, amenities: [],
    footerColumns: [EMPTY_FOOTER_COLUMN(), EMPTY_FOOTER_COLUMN(), EMPTY_FOOTER_COLUMN()], footerSocialLinks: [],
    legalPages: { privacyPolicy: '', termsAndConditions: '' },
  });
  const [newAmenity, setNewAmenity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Business categories are managed by admin (Admin > Categories) — the
  // seller just picks one here, they can't type a new one.
  useEffect(() => {
    (async () => {
      try {
        const data = await categoryAPI.getAll();
        setCategories((data.categories || []).map(c => c.name));
      } catch (err) {
        toast.error('Could not load business categories');
      } finally {
        setCategoriesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (seller) {
      setForm({
        shopName: seller.shopName || '',
        description: seller.description || '',
        phone: seller.phone || '',
        whatsapp: seller.whatsapp || '',
        address: seller.address || '',
        footerEmail: seller.footerEmail || '',
        logo: seller.logo || '',
        lightLogo: seller.lightLogo || '',
        darkLogo: seller.darkLogo || '',
        banner: seller.banner || '',
        bannerType: seller.bannerType || 'image',
        category: seller.category || '',
        city: seller.city || '',
        tehsil: seller.tehsil || '',
        pincode: seller.pincode || '',
        district: seller.district || '',
        state: seller.state || '',
        upiId: seller.upiId || '',
        qrCodeImage: seller.qrCodeImage || '',
        courierSettlementMode: seller.courierSettlementMode || 'online',
        shippingCharge: seller.shippingCharge ?? 0,
        freeShippingThreshold: seller.freeShippingThreshold ?? 0,
        gallery: seller.gallery || [],
        workingHours: { ...EMPTY_HOURS, ...(seller.workingHours || {}) },
        amenities: seller.amenities || [],
        footerColumns: seller.footerColumns?.length ? seller.footerColumns : [EMPTY_FOOTER_COLUMN(), EMPTY_FOOTER_COLUMN(), EMPTY_FOOTER_COLUMN()],
        footerSocialLinks: seller.footerSocialLinks || [],
        legalPages: { privacyPolicy: seller.legalPages?.privacyPolicy || '', termsAndConditions: seller.legalPages?.termsAndConditions || '' },
      });
    }
  }, [seller]);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const setHour = (day) => (e) => setForm(p => ({ ...p, workingHours: { ...p.workingHours, [day]: e.target.value } }));

  const addGalleryImages = (urls) => setForm(p => ({ ...p, gallery: [...p.gallery, ...urls] }));
  const removeGalleryImage = (idx) => setForm(p => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }));

  const addAmenity = () => {
    const val = newAmenity.trim();
    if (!val || form.amenities.includes(val)) return;
    setForm(p => ({ ...p, amenities: [...p.amenities, val] }));
    setNewAmenity('');
  };
  const removeAmenity = (val) => setForm(p => ({ ...p, amenities: p.amenities.filter(a => a !== val) }));
  const setFooterColumn = (index, key, value) => setForm(p => ({ ...p, footerColumns: p.footerColumns.map((column, i) => i === index ? { ...column, [key]: value } : column) }));
  const setFooterLink = (columnIndex, linkIndex, key, value) => setForm(p => ({
    ...p,
    footerColumns: p.footerColumns.map((column, i) => i === columnIndex
      ? { ...column, links: column.links.map((link, j) => j === linkIndex ? { ...link, [key]: value } : link) }
      : column),
  }));
  const addFooterLink = (columnIndex) => setForm(p => ({ ...p, footerColumns: p.footerColumns.map((column, i) => i === columnIndex ? { ...column, links: [...column.links, { label: '', url: '' }] } : column) }));
  const removeFooterLink = (columnIndex, linkIndex) => setForm(p => ({ ...p, footerColumns: p.footerColumns.map((column, i) => i === columnIndex ? { ...column, links: column.links.filter((_, j) => j !== linkIndex) } : column) }));
  const addFooterColumn = () => setForm(p => ({ ...p, footerColumns: [...p.footerColumns, EMPTY_FOOTER_COLUMN()] }));
  const removeFooterColumn = (index) => setForm(p => ({ ...p, footerColumns: p.footerColumns.filter((_, i) => i !== index) }));
  const setSocialLink = (index, key, value) => setForm(p => ({ ...p, footerSocialLinks: p.footerSocialLinks.map((link, i) => i === index ? { ...link, [key]: value } : link) }));
  const addSocialLink = () => setForm(p => ({ ...p, footerSocialLinks: [...p.footerSocialLinks, { platform: 'Instagram', url: '' }] }));
  const removeSocialLink = (index) => setForm(p => ({ ...p, footerSocialLinks: p.footerSocialLinks.filter((_, i) => i !== index) }));

  // Plan rule videoMaxMinutes: Gold = "1–3 min video", Platinum = no limit.
  const videoLimitMin = Number(caps.videoMaxMinutes) > 0 ? Number(caps.videoMaxMinutes) : null;
  const checkVideoLength = async (url) => {
    if (!videoLimitMin || !url) return true;
    const seconds = await getVideoDuration(url);
    if (seconds && seconds > videoLimitMin * 60 + 1) {
      toast.error(`This video is ${formatDuration(seconds)} long. Your ${seller?.planSnapshot?.name || 'current'} plan allows videos up to ${videoLimitMin} min — upgrade for a longer brand video.`);
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.bannerType === 'video' && form.banner !== seller?.banner && !(await checkVideoLength(form.banner))) return;
    setSaving(true);
    try {
      const data = await sellerAPI.updateShop({
        shopName: form.shopName,
        description: form.description,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        footerEmail: form.footerEmail,
        logo: form.logo,
        lightLogo: form.lightLogo,
        darkLogo: form.darkLogo,
        banner: form.banner,
        bannerType: form.bannerType,
        category: form.category,
        city: form.city,
        tehsil: form.tehsil,
        pincode: form.pincode,
        district: form.district,
        state: form.state,
        upiId: form.upiId,
        qrCodeImage: form.qrCodeImage,
        courierSettlementMode: form.courierSettlementMode,
        shippingCharge: form.shippingCharge,
        freeShippingThreshold: form.freeShippingThreshold,
        gallery: form.gallery,
        workingHours: form.workingHours,
        amenities: form.amenities,
        footerColumns: form.footerColumns,
        footerSocialLinks: form.footerSocialLinks,
        legalPages: form.legalPages,
      });
      updateSeller(data.seller, data.visibility);
      toast.success('Shop settings updated!');
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <SellerLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shop Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your shop profile and information</p>
        </div>
        {seller?.shopSlug && (
          <a href={getStoreUrl(seller.shopSlug)} target="_blank" rel="noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            View Your Store →
          </a>
        )}
      </div>

      {/* Shop logo preview */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border-2 border-gray-100 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center flex-shrink-0">
            {/* Shop Logo URL field first, else the light/dark logo from Customize Store */}
            {form.logo || seller?.[isDark ? 'darkLogo' : 'lightLogo'] ? (
              <img src={form.logo || seller?.[isDark ? 'darkLogo' : 'lightLogo']} alt="Shop Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{seller?.shopName?.charAt(0) || '🛍️'}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{form.shopName || 'Your Shop'}</h2>
            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
              ✓ Approved Seller
            </span>
          </div>
        </div>

        {seller?.shopSlug && (
          <div className="mt-4 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5">
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">{getStoreUrl(seller.shopSlug)}</span>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(getStoreUrl(seller.shopSlug)); toast.success('Store link copied!'); }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex-shrink-0"
            >
              Copy
            </button>
          </div>
        )}
        {form.banner && (
          <div className="mt-4 h-28 rounded-xl overflow-hidden">
            {form.bannerType === 'video' ? (
              <video src={form.banner} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            ) : (
              <img src={form.banner} alt="Banner" className="w-full h-full object-cover" />
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        <Section title="Basic Information" icon={FiShoppingBag}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Shop Name *" value={form.shopName} onChange={set('shopName')} placeholder="Your shop name" />
            <Field label="Phone Number" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            <div className="sm:col-span-2">
              <Field label="Description" value={form.description} onChange={set('description')} textarea placeholder="Tell customers about your shop..." />
            </div>
            <div className="sm:col-span-2">
              <Field label="Address" value={form.address} onChange={set('address')} placeholder="Full shop address" />
            </div>
          </div>
        </Section>

        <Section title="Business Directory Info" icon={FiTag}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">This is how customers find you when searching or browsing the directory.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Category *</label>
              <SelectWithOther value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))}
                options={categories.map(c => ({ value: c, label: c }))} disabled={categoriesLoading}
                placeholder={categoriesLoading ? 'Loading...' : 'Select a category'} otherPlaceholder="Type your business category"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 disabled:opacity-60" />
            </div>
            <Field label="WhatsApp Number" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+91 98765 43210" />
            <Field label="City *" value={form.city} onChange={set('city')} placeholder="e.g. Pune" />
            <Field label="Tehsil *" value={form.tehsil} onChange={set('tehsil')} placeholder="e.g. Haveli" />
            <Field label="PIN Code" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="6-digit PIN, e.g. 411001" />
            <Field label="District *" value={form.district} onChange={set('district')} placeholder="e.g. Pune" />
            <Field label="State *" value={form.state} onChange={set('state')} placeholder="e.g. Maharashtra" />
          </div>
        </Section>

        <Section title="Photo Gallery" icon={FiCamera}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Extra photos shown on your business page — your storefront, products, work samples, whatever helps
            customers trust you before they call.
          </p>
          {form.gallery.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              {form.gallery.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ImageUploadInput
            multiple
            uploadFn={(files) => sellerAPI.uploadImages(files).then(r => r.urls)}
            onUploaded={addGalleryImages}
            label="Add photos"
          />
        </Section>

        <Section title="Working Hours" icon={FiClock}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Leave a day blank to show it as "Closed". e.g. "9:00 AM - 9:00 PM".</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS.map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{label}</span>
                <input
                  value={form.workingHours[key]}
                  onChange={setHour(key)}
                  placeholder="Closed"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800"
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Highlights" icon={FiAward}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Short tags shown as chips on your business page — e.g. "Pure Veg", "Home Delivery", "Parking Available".
          </p>
          {form.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {form.amenities.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-medium px-3 py-1.5 rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeAmenity(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-200">
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newAmenity}
              onChange={e => setNewAmenity(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
              placeholder="Type a highlight and press Enter"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800"
            />
            <button type="button" onClick={addAmenity}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-sm font-medium flex-shrink-0">
              Add
            </button>
          </div>
        </Section>

        <Section title="Shop Visibility" icon={FiMapPin}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            How far your shop shows up in search depends on your subscription plan and the tehsil/district/state above.
          </p>
          {visibility && !visibility.visible ? (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
              Your plan has expired, so your shop is <strong>currently hidden from search</strong>. Renew your plan to reappear.
            </div>
          ) : visibility ? (
            <div className="mb-1 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-xs leading-relaxed">
              Your plan's visibility scope is <strong>{SCOPE_LABEL[visibility.scope] || visibility.scope}</strong>
              {visibility.region ? <> — {SCOPE_DESC[visibility.scope]} (<strong>{visibility.region}</strong>).</> : <>: {SCOPE_DESC[visibility.scope]}.</>}
            </div>
          ) : null}
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Need a wider reach? Ask admin/support about upgrading your plan.</p>
        </Section>

        <Section title="Payment Details (Direct UPI)" icon={FaQrcode}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            growthkarts never touches your money — customers pay you directly via UPI. Set your UPI ID and/or a QR
            code, and it'll show on your product pages so customers can pay you instantly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="UPI ID" value={form.upiId} onChange={set('upiId')} placeholder="yourname@upi" />
            <Field label="QR Code Image URL" value={form.qrCodeImage} onChange={set('qrCodeImage')} placeholder="https://your-qr-code-image.com/qr.png" />
          </div>
          <ImageUploadInput
            uploadFn={(files) => sellerAPI.uploadImage(files[0]).then(r => r.url)}
            onUploaded={(url) => setForm(p => ({ ...p, qrCodeImage: url }))}
            label="Upload QR from device"
          />
          {form.qrCodeImage && (
            <img src={form.qrCodeImage} alt="UPI QR" className="w-32 h-32 object-contain mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-2" />
          )}
        </Section>

        <Section title="Courier COD Settlement" icon={FiDollarSign}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Choose how the courier will pay you after a COD delivery. In online mode, the courier uploads payment proof. In manual mode, the courier pays you directly and you confirm it here.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm(p => ({ ...p, courierSettlementMode: 'online' }))}
              className={`text-left rounded-xl border-2 p-4 ${form.courierSettlementMode === 'online' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Online with payment proof</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Courier pays online and uploads screenshot.</p>
            </button>
            <button type="button" onClick={() => setForm(p => ({ ...p, courierSettlementMode: 'manual' }))}
              className={`text-left rounded-xl border-2 p-4 ${form.courierSettlementMode === 'manual' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Manual payment</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Courier pays you directly; you confirm after receiving it.</p>
            </button>
          </div>
        </Section>

        <Section title="Shipping" icon={FiTruck}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Delivery is between you and the customer — growthkarts doesn't handle it. Set your own shipping charge
            and free-shipping threshold here so customers know what to expect before they contact you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Shipping Charge (₹)" type="number" value={form.shippingCharge}
              onChange={set('shippingCharge')} placeholder="e.g. 50 (0 = free shipping)" />
            <Field label="Free Shipping Above (₹)" type="number" value={form.freeShippingThreshold}
              onChange={set('freeShippingThreshold')} placeholder="e.g. 499 (0 = no threshold)" />
          </div>
        </Section>

        <Section title="Storefront Footer" icon={FiTag}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Add footer columns, headings, subheadings, multiple links, contact email and social profiles for your store.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Field label="Footer Email" type="email" value={form.footerEmail} onChange={set('footerEmail')} placeholder="hello@yourshop.com" />
            <Field label="Footer Address" value={form.address} onChange={set('address')} placeholder="Your complete shop address" />
          </div>
          <div className="space-y-4">
            {form.footerColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Column {columnIndex + 1}</p>
                  {form.footerColumns.length > 1 && <button type="button" onClick={() => removeFooterColumn(columnIndex)} className="text-red-500 text-xs flex items-center gap-1"><FiTrash2 /> Remove</button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Heading" value={column.heading || ''} onChange={e => setFooterColumn(columnIndex, 'heading', e.target.value)} placeholder="Shop" />
                  <Field label="Subheading" value={column.subheading || ''} onChange={e => setFooterColumn(columnIndex, 'subheading', e.target.value)} placeholder="Explore our collection" />
                </div>
                <div className="mt-3 space-y-2">
                  {(column.links || []).map((link, linkIndex) => (
                    <div key={linkIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <Field label="Link text" value={link.label || ''} onChange={e => setFooterLink(columnIndex, linkIndex, 'label', e.target.value)} placeholder="All Products" />
                      <Field label="URL" value={link.url || ''} onChange={e => setFooterLink(columnIndex, linkIndex, 'url', e.target.value)} placeholder="/shop" />
                      <button type="button" onClick={() => removeFooterLink(columnIndex, linkIndex)} className="h-11 px-2 text-red-500" title="Remove link"><FiX /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addFooterLink(columnIndex)} className="text-xs font-semibold text-indigo-600 flex items-center gap-1"><FiPlus /> Add link</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addFooterColumn} className="mt-4 text-sm font-semibold text-indigo-600 flex items-center gap-1"><FiPlus /> Add footer column</button>

          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div><h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Social Icons</h4><p className="text-xs text-gray-500">Use Instagram, Facebook, YouTube, Twitter or any platform name.</p></div>
              <button type="button" onClick={addSocialLink} className="text-sm font-semibold text-indigo-600 flex items-center gap-1"><FiPlus /> Add</button>
            </div>
            <div className="space-y-2">
              {form.footerSocialLinks.map((link, index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
                  <Field label="Platform" value={link.platform || ''} onChange={e => setSocialLink(index, 'platform', e.target.value)} placeholder="Instagram" />
                  <Field label="Profile URL" value={link.url || ''} onChange={e => setSocialLink(index, 'url', e.target.value)} placeholder="https://instagram.com/yourshop" />
                  <button type="button" onClick={() => removeSocialLink(index)} className="h-11 px-2 text-red-500" title="Remove social link"><FiX /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Seller Legal Pages</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">These pages are shown from your own storefront footer. Leave a field blank to use the standard marketplace text.</p>
            <div className="space-y-4">
              <Field label="Privacy Policy" value={form.legalPages.privacyPolicy} onChange={e => setForm(p => ({ ...p, legalPages: { ...p.legalPages, privacyPolicy: e.target.value } }))} placeholder="Write your privacy policy. Use ## for headings and - for bullet points." textarea />
              <Field label="Terms & Conditions" value={form.legalPages.termsAndConditions} onChange={e => setForm(p => ({ ...p, legalPages: { ...p.legalPages, termsAndConditions: e.target.value } }))} placeholder="Write your terms and conditions. Use ## for headings and - for bullet points." textarea />
            </div>
          </div>
        </Section>

        <Section title="Branding" icon={FiImage}>
          <div className="space-y-4">
            <Field label="Shop Logo URL" value={form.logo} onChange={set('logo')} placeholder="https://your-logo-url.com/logo1.png" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field label="Light Theme Logo URL" value={form.lightLogo} onChange={set('lightLogo')} placeholder="https://.../light-logo1.png" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <ImageUploadInput uploadFn={(files) => sellerAPI.uploadImage(files[0]).then(r => r.url)} onUploaded={(url) => setForm(p => ({ ...p, lightLogo: url }))} label="Upload light logo" />
                </div>
              </div>
              <div>
                <Field label="Dark Theme Logo URL" value={form.darkLogo} onChange={set('darkLogo')} placeholder="https://.../dark-logo1.png" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <ImageUploadInput uploadFn={(files) => sellerAPI.uploadImage(files[0]).then(r => r.url)} onUploaded={(url) => setForm(p => ({ ...p, darkLogo: url }))} label="Upload dark logo" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Hero Banner Type</label>
              <div className="flex gap-2">
                {['image', 'video'].map(t => {
                  const locked = t === 'video' && !caps.videoBanner && seller?.bannerType !== 'video';
                  return (
                    <button key={t} type="button"
                      onClick={() => locked
                        ? toast.error(`Video banner is not included in your ${seller?.planSnapshot?.name || 'current'} plan.`)
                        : setForm(p => ({ ...p, bannerType: t }))}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                        locked ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-500'
                        : form.bannerType === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {t} {locked && <PlanLockBadge />}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={form.bannerType === 'video' ? 'Shop Banner Video URL' : 'Shop Banner URL'} value={form.banner} onChange={set('banner')}
              placeholder={form.bannerType === 'video' ? 'https://your-video-url.com/banner.mp4' : 'https://your-banner-url.com/banner.jpg'} />
            <div className="mt-3 flex flex-wrap gap-2">
              <ImageUploadInput uploadFn={(files) => sellerAPI.uploadImage(files[0]).then(r => r.url)} onUploaded={(url) => setForm(p => ({ ...p, logo: url }))} label="Upload logo" />
              {form.bannerType === 'image' && (
                <ImageUploadInput uploadFn={(files) => sellerAPI.uploadImage(files[0]).then(r => r.url)} onUploaded={(url) => setForm(p => ({ ...p, banner: url }))} label="Upload banner" />
              )}
              {form.bannerType === 'video' && (
                <ImageUploadInput
                  accept="video/*"
                  uploadFn={(files) => sellerAPI.uploadMedia(files[0]).then(r => r.url)}
                  onUploaded={async (url) => { if (await checkVideoLength(url)) setForm(p => ({ ...p, banner: url })); }}
                  label="Upload video"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {form.bannerType === 'video'
                ? `Paste a direct .mp4 video URL (Cloudinary, etc.) — it plays muted and looped as your hero background.${videoLimitMin ? ` Your plan allows videos up to ${videoLimitMin} min.` : ''}`
                : 'Use direct image URLs (Cloudinary, Imgur, etc.). Recommended: Logo 200×200, Banner 1200×300.'}
            </p>
          </div>
        </Section>

        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg text-sm">
          <FiSave className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </form>
    </SellerLayout>
  );
}