import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, uploadAPI } from '../../services/api';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import OfferProductSelector from '../../components/common/OfferProductSelector';
import OfferHomepagePreview from '../../components/home/OfferHomepagePreview';

const EMPTY = { tag: '', title: '', description: '', discountText: '', image: '', link: '', products: [], discountPercent: '' };

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

// Admin / Super Admin adds (or edits) a homepage banner directly — it goes
// live straight away, no seller or plan involved.
export default function PlatformBannerModal({ open, banner, placement = 'homepage', onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(banner
      ? {
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).filter((key) => key !== 'products').map(k => [k, banner[k] ?? EMPTY[k]])),
          products: (banner.products || []).map((product) => (typeof product === 'string' ? product : product._id)),
          discountPercent: banner.discountPercent ? String(banner.discountPercent) : '',
          placement: banner.placement || 'homepage',
        }
      : { ...EMPTY, placement });
  }, [open, banner, placement]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadingProducts(true);
    adminAPI.getOfferProducts(productSearch ? { search: productSearch } : {})
      .then((data) => { if (!cancelled) setProducts(data.products || []); })
      .catch((error) => { if (!cancelled) toast.error(error.message || 'Could not load products'); })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [open, productSearch]);

  if (!open) return null;
  const isFestival = (banner?.placement || form.placement || placement) === 'festival';
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const toggleProduct = (id) => setForm((current) => ({
    ...current,
    products: current.products.includes(id)
      ? current.products.filter((productId) => productId !== id)
      : [...current.products, id],
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.image) { toast.error('Upload a banner image'); return; }
    if (isFestival && !form.title.trim()) { toast.error('Add a festival offer title'); return; }
    if (form.products.length && !(Number(form.discountPercent) > 0)) {
      toast.error('Enter a discount percentage for selected products');
      return;
    }
    setSaving(true);
    try {
      const payload = isFestival
        ? { ...form, discountPercent: Number(form.discountPercent) || 0, placement: 'festival' }
        : { placement: 'homepage', image: form.image, products: form.products, discountPercent: Number(form.discountPercent) || 0 };
      if (banner) await adminAPI.updatePlatformOffer(banner._id, payload);
      else await adminAPI.createPlatformOffer(payload);
      toast.success(banner ? 'Banner updated' : 'Banner added — it is live on the homepage');
      onSaved?.();
      onClose();
    } catch (err) { toast.error(err.message || 'Could not save the banner'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              {banner ? 'Edit' : 'Add'} {isFestival ? 'Festival Offer' : 'Homepage Offer'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isFestival ? 'Add a festival offer card to the homepage.' : 'Upload an image-only banner for the homepage carousel.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><FiX /></button>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            {isFestival && (
            <div><label className={labelCls}>Title *</label><input required value={form.title} onChange={set('title')} placeholder="e.g. Festive Saree Sale" className={inputCls} /></div>
            )}
            {isFestival && (
            <div><label className={labelCls}>Small tag</label><input value={form.tag} onChange={set('tag')} placeholder="e.g. FESTIVE SPECIAL" className={inputCls} /></div>
            )}
            {isFestival && (
            <div><label className={labelCls}>Description</label><textarea rows={2} value={form.description} onChange={set('description')} placeholder="One line about the offer" className={`${inputCls} resize-none`} /></div>
            )}
            {isFestival && (
            <div><label className={labelCls}>Discount text</label><input value={form.discountText} onChange={set('discountText')} placeholder="e.g. Up to 40% OFF" className={inputCls} /></div>
            )}
            {isFestival && (
            <div><label className={labelCls}>Link (where "Shop Now" goes)</label><input value={form.link} onChange={set('link')} placeholder="/shop/clothing or https://…" className={inputCls} /></div>
            )}
            <div>
              <label className={labelCls}>Upload image *</label>
              <ImageUploadInput uploadFn={(files) => uploadAPI.single(files[0]).then(r => r.url)} onUploaded={(url) => setForm(p => ({ ...p, image: url }))} label="Choose image" />
              {form.image && <img src={form.image} alt="Banner preview" className="mt-2 h-24 w-full rounded-lg object-cover" />}
            </div>
            <div>
              <label className={labelCls}>Discount percentage on selected products</label>
              <input type="number" min="0" max="95" value={form.discountPercent}
                onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))}
                placeholder="e.g. 20" className={inputCls} />
            </div>
            <OfferProductSelector
              products={products}
              selectedIds={form.products}
              discountPercent={form.discountPercent}
              loading={loadingProducts}
              onToggle={toggleProduct}
              onSearch={setProductSearch}
              search={productSearch}
              scopeLabel="all products"
            />
          </div>

          <div>
            <p className={labelCls}>Preview</p>
            <OfferHomepagePreview offer={form} placement={isFestival ? 'festival' : 'homepage'} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
          <button disabled={saving} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving…' : banner ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
}
