import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiPackage,
  FiChevronDown, FiChevronUp, FiImage, FiMove, FiStar, FiCheck
} from 'react-icons/fi';
import { sellerAPI, categoryAPI, settingsAPI } from '../../services/api';
import { colorSwatch, splitSizesAndUrls } from '../../utils/helpers';
import SellerLayout from './SellerLayout';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import ImageUrlPreviews from '../../components/common/ImageUrlPreviews';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import toast from 'react-hot-toast';
import { useSellerStore } from '../../store/sellerStore';
import SelectWithOther from '../../components/common/SelectWithOther';
import JewelleryFields from '../../components/jewellery/JewelleryFields';
import { emptyJewellery, jewelleryPayload, jewelleryFormFrom, METAL_LABEL } from '../../utils/jewellery';

const emptyForm = {
  name: '', description: '', price: '', originalPrice: '',
  deliveryCharge: 0,
  category: '', subCategory: '', productType: '', brand: '',
  images: '', sizes: '', colors: '', stock: '', sku: '', tags: '',
  isFeatured: false, isFlashSale: false, flashSalePrice: '', flashSaleDuration: '24', codAvailable: true,
  returnAvailable: true, returnDays: 7, refundAvailable: true, refundDays: 7,
  jewellery: emptyJewellery,
};

const emptyVariantForm = {
  colorName: '', colorCode: '#000000', price: '', originalPrice: '',
  stock: '', sku: '', sizes: '', isActive: true, isDefault: false,
};

// Module-scope (not inside SellerProducts) so React keeps a stable component
// identity across re-renders — defining it inside the parent recreates it on
// every keystroke, causing React to remount the <input> and drop focus after
// a single character.
const InputField = ({ label, value, onChange, type = 'text', placeholder, required, className = '', disabled }) => (
  <div className={className}>
    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 disabled:opacity-70"
    />
  </div>
);

// ─── Color Variant Form Modal ─────────────────────────────────────────────────
function VariantModal({ productId, variant, onClose, onSaved }) {
  const [form, setForm] = useState(
    variant ? { ...variant, sizes: variant.sizes?.join(', ') || '' } : emptyVariantForm
  );
  const [saving, setSaving] = useState(false);
  const [imageList, setImageList] = useState(variant?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const set = (key) => (e) =>
    setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setImageList(p => [...p, url]);
    setNewImageUrl('');
  };

  const removeImage = (idx) => setImageList(p => p.filter((_, i) => i !== idx));

  const dragStart = (idx) => { dragItem.current = idx; };
  const dragEnter = (idx) => { dragOverItem.current = idx; };
  const dragEnd = () => {
    const list = [...imageList];
    const dragged = list.splice(dragItem.current, 1)[0];
    list.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null; dragOverItem.current = null;
    setImageList(list);
  };

  const setDefault = (idx) => {
    const list = [...imageList];
    const [item] = list.splice(idx, 1);
    list.unshift(item);
    setImageList(list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.colorName.trim()) { toast.error('Color name required'); return; }
    if (!form.price) { toast.error('Price required'); return; }
    setSaving(true);
    try {
      // Image links pasted into Sizes by mistake go to the photos instead.
      const { sizes, urls } = splitSizesAndUrls(form.sizes);
      if (urls.length) toast('Image link moved from Sizes to the photos');
      // A link still sitting in the photo box (Add not clicked) is saved too.
      const pending = newImageUrl.trim();
      if (pending && !imageList.includes(pending)) urls.unshift(pending);
      const payload = {
        colorName: form.colorName.trim(),
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock) || 0,
        sku: form.sku?.trim() || undefined,
        sizes,
        images: [...imageList, ...urls.filter(u => !imageList.includes(u))],
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      if (variant) {
        await sellerAPI.updateVariant(productId, variant._id, payload);
        toast.success('Variant update ho gaya!');
      } else {
        await sellerAPI.addVariant(productId, payload);
        toast.success('Color variant add ho gaya!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto my-2 sm:my-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              {variant ? 'Edit Color Variant' : 'Add New Color Variant'}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Set separate images, price, and stock for each color</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Color Name */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Color Name *</label>
            <input
              value={form.colorName}
              onChange={set('colorName')}
              required
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder="e.g. Blue, Midnight Black"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Price (₹) *</label>
              <input
                type="number"
                value={form.price}
                onChange={set('price')}
                required
                min={0}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                placeholder="999"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Original Price (₹)</label>
              <input
                type="number"
                value={form.originalPrice}
                onChange={set('originalPrice')}
                min={0}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                placeholder="1499"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Stock *</label>
              <input
                type="number"
                value={form.stock}
                onChange={set('stock')}
                min={0}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                placeholder="50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">SKU</label>
              <input
                value={form.sku}
                onChange={set('sku')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                placeholder="LXF-BLK-001"
              />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Sizes (comma separated)</label>
            <input
              value={form.sizes}
              onChange={set('sizes')}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              placeholder="S, M, L, XL, XXL"
            />
          </div>

          {/* Image Album */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block flex items-center gap-2">
              <FiImage className="w-3.5 h-3.5" /> Images Album ({imageList.length} images)
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Drag to reorder images. The first image will be the main image.</p>

            {imageList.length > 0 && (
              <div className="space-y-2 mb-3">
                {imageList.map((url, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => dragStart(idx)}
                    onDragEnter={() => dragEnter(idx)}
                    onDragEnd={dragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 cursor-move"
                  >
                    <FiMove className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    <img
                      src={url}
                      alt=""
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-200 dark:bg-gray-700"
                      onError={e => { e.target.src = 'https://placehold.co/56x56?text=?'; }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">{url}</span>
                    {idx === 0 && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        Main
                      </span>
                    )}
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => setDefault(idx)}
                        title="Main image banao"
                        className="text-gray-300 dark:text-gray-600 hover:text-amber-500 flex-shrink-0"
                      >
                        <FiStar className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 flex-shrink-0"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                placeholder="Paste an image URL, press Enter, or click Add"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 flex-1"
              />
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-sm font-medium flex items-center gap-1.5 flex-shrink-0"
              >
                <FiImage className="w-4 h-4" /> Add
              </button>
              <ImageUploadInput
                multiple
                uploadFn={(files) => sellerAPI.uploadImages(files).then(r => r.urls)}
                onUploaded={(urls) => setImageList(p => [...p, ...urls])}
              />
            </div>
          </div>

          {/* Active + Default toggles */}
          <div className="flex gap-6">
            <ToggleSwitch checked={form.isActive} onChange={val => setForm(p => ({ ...p, isActive: val }))} label="Active" />
            <ToggleSwitch checked={form.isDefault} onChange={val => setForm(p => ({ ...p, isDefault: val }))} label="Default color" />
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
              {saving ? 'Saving...' : variant ? 'Update Variant' : 'Add Color Variant'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Variant Manager Row ──────────────────────────────────────────────────────
function VariantManager({ product, onProductUpdated }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const variants = product.variants || [];

  const handleDelete = async (variantId) => {
    if (!window.confirm('Ye color variant delete karna chahte ho?')) return;
    setDeletingId(variantId);
    try {
      await sellerAPI.deleteVariant(product._id, variantId);
      toast.success('Variant deleted!');
      onProductUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-indigo-50/60 dark:bg-indigo-500/10 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-500/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
          Color Variants
          <span className="text-xs bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">{variants.length} colors</span>
        </h4>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" /> Add Color
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-6">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">No color variants yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium underline"
          >
            + Add your first color
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {variants.map(v => (
            <div key={v._id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              {/* Color swatch or first image */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                {v.images?.[0] ? (
                  <img src={v.images[0]} alt={v.colorName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: colorSwatch(v.colorName) }} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-gray-700 flex-shrink-0"
                    style={{ backgroundColor: colorSwatch(v.colorName) }}
                  />
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{v.colorName}</span>
                  {v.isDefault && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Default</span>
                  )}
                  {!v.isActive && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400">₹{v.price}</span>
                  {v.originalPrice && <span className="text-xs text-gray-400 dark:text-gray-600 line-through">₹{v.originalPrice}</span>}
                  <span className="text-xs text-gray-500 dark:text-gray-400">Stock: {v.stock}</span>
                  {v.images?.length > 0 && (
                    <span className="text-xs text-indigo-500 dark:text-indigo-400">{v.images.length} photos</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditingVariant(v)}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(v._id)}
                  disabled={deletingId === v._id}
                  className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Variant Modal */}
      {showAdd && (
        <VariantModal
          productId={product._id}
          onClose={() => setShowAdd(false)}
          onSaved={onProductUpdated}
        />
      )}

      {/* Edit Variant Modal */}
      {editingVariant && (
        <VariantModal
          productId={product._id}
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSaved={onProductUpdated}
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SellerProducts() {
  const { seller } = useSellerStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [requireSellerKyc, setRequireSellerKyc] = useState(true);

  const selectedCat = categories.find(c => c.slug === form.category);
  const availableSubcats = selectedCat?.types || [];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await sellerAPI.getProducts({ search: search || undefined, limit: 20 });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [search]);

  useEffect(() => {
    categoryAPI.getAll()
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    settingsAPI.getPublic()
      .then(d => setRequireSellerKyc(d.settings?.requireSellerKycForProducts !== false))
      .catch(() => toast.error('Could not load KYC settings. Product KYC requirement remains enabled.'));
  }, []);

  const set = (key) => (e) =>
    setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openAdd = () => {
    setForm({ ...emptyForm, category: categories[0]?.slug || '' });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      ...p,
      images: p.images?.join(', ') || '',
      sizes: p.sizes?.join(', ') || '',
      colors: p.colors?.join(', ') || '',
      tags: p.tags?.join(', ') || '',
      returnAvailable: p.returnAvailable !== false,
      returnDays: p.returnDays ?? 7,
      refundAvailable: p.refundAvailable !== false,
      refundDays: p.refundDays ?? 7,
      jewellery: jewelleryFormFrom(p),
    });
    setEditId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && requireSellerKyc && seller?.kyc?.status !== 'approved') {
      toast.error('Approved KYC is required before adding a product.');
      return;
    }
    if (form.returnAvailable !== false && (!form.returnDays || Number(form.returnDays) <= 0)) {
      toast.error('Return is enabled. Please set a valid return window in days.');
      return;
    }
    if (form.refundAvailable !== false && (!form.refundDays || Number(form.refundDays) <= 0)) {
      toast.error('Refund is enabled. Please set a valid refund window in days.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        deliveryCharge: Number(form.deliveryCharge) || 0,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock),
        flashSalePrice: form.flashSalePrice ? Number(form.flashSalePrice) : undefined,
        flashSaleEndsAt: form.isFlashSale && form.flashSaleDuration
          ? new Date(Date.now() + Number(form.flashSaleDuration) * 60 * 60 * 1000).toISOString()
          : undefined,
        returnAvailable: form.returnAvailable !== false,
        returnDays: Number(form.returnDays) || 0,
        refundAvailable: form.refundAvailable !== false,
        refundDays: Number(form.refundDays) || 0,
        images: form.images.split(',').map(s => s.trim()).filter(Boolean),
        sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean),
        colors: form.colors.split(',').map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        jewellery: jewelleryPayload(form.jewellery),
      };
      if (editId) {
        await sellerAPI.updateProduct(editId, payload);
        toast.success('Product updated!');
      } else {
        const res = await sellerAPI.createProduct(payload);
        toast.success('Product added! You can now add color variants below.');
        // Auto-expand the new product for variant adding
        if (res?.product?._id) {
          setExpandedId(res.product._id);
        }
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Do you want to delete this product?')) return;
    try {
      await sellerAPI.deleteProduct(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8">
        {seller?.kyc?.status !== 'approved' && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4">
            <p className="font-semibold text-amber-800 dark:text-amber-300">KYC approval required before adding products</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Submit your KYC and wait for Super Admin approval to start listing products.</p>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Products</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{total} total products</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
          >
            <FiPlus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Tip */}
        <div className="mb-5 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-xs text-indigo-700 dark:text-indigo-400">
          💡 <strong>Tip:</strong> After adding a piece, expand it to add variants per metal colour (Yellow / Rose / White gold) with their own photos, price and stock.
        </div>

        {/* Products List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <FiPackage className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No products yet</p>
            <button onClick={openAdd} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">
              + Add your first product
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <div key={product._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                {/* Product Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-800">
                    {(product.images?.[0] || product.variants?.[0]?.images?.[0]) ? (
                      <img
                        src={product.images?.[0] || product.variants[0].images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://placehold.co/64x64?text=?'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-6 h-6 text-gray-300 dark:text-gray-700" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{product.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        product.approvalStatus === 'approved' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                        product.approvalStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                        product.approvalStatus === 'rejected' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {product.approvalStatus || 'pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {product.category} · ₹{product.price}
                      {product.jewellery?.metal && <> · {product.jewellery.purity} {METAL_LABEL[product.jewellery.metal] || product.jewellery.metal}</>}
                      {product.jewellery?.netWeight > 0 && <> · {product.jewellery.netWeight}g</>}
                      {product.jewellery?.pricingMode === 'live' && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 font-medium">Live rate</span>}
                    </p>

                    {/* Color dots */}
                    {product.variants?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{product.variants.length} colors:</span>
                        {product.variants.filter(v => v.isActive).slice(0, 6).map(v => (
                          <div
                            key={v._id}
                            title={v.colorName}
                            className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700"
                            style={{ backgroundColor: colorSwatch(v.colorName) }}
                          />
                        ))}
                        {product.variants.length > 6 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">+{product.variants.length - 6}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stock */}
                  <div className="text-center flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Stock</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{product.stock}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Edit product */}
                    <button
                      onClick={() => openEdit(product)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit product"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    {/* Delete product */}
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete product"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                    {/* Expand/Collapse variants */}
                    <button
                      onClick={() => setExpandedId(expandedId === product._id ? null : product._id)}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Manage color variants"
                    >
                      {expandedId === product._id ? (
                        <FiChevronUp className="w-4 h-4" />
                      ) : (
                        <FiChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Variant Manager (Expandable) */}
                <AnimatePresence>
                  {expandedId === product._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <VariantManager
                          product={product}
                          onProductUpdated={fetchProducts}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto my-2 sm:my-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                  {editId ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Product Name *" value={form.name} onChange={set('name')} required placeholder="e.g. Solitaire Diamond Ring" className="sm:col-span-2" />

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Description *</label>
                    <textarea
                      value={form.description}
                      onChange={set('description')}
                      required
                      rows={3}
                      placeholder="Design, finish, how it's made, care instructions..."
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 resize-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Category *</label>
                    <SelectWithOther value={form.category} required
                      onChange={v => setForm(p => ({ ...p, category: v, subCategory: '' }))}
                      options={categories.map(c => ({ value: c.slug, label: c.name }))}
                      placeholder="-- Select Category --" otherPlaceholder="Type your category"
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                  </div>

                  {/* Sub Category */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Sub Category</label>
                    {availableSubcats.length > 0 ? (
                      <SelectWithOther value={form.subCategory}
                        onChange={v => setForm(p => ({ ...p, subCategory: v }))}
                        options={availableSubcats.map(t => ({ value: t, label: t }))}
                        placeholder="-- Select --" otherPlaceholder="Type your sub category"
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                    ) : (
                      <input
                        value={form.subCategory}
                        onChange={set('subCategory')}
                        placeholder="Sub Category"
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      />
                    )}
                  </div>

                  <JewelleryFields
                    value={form.jewellery}
                    onChange={jewellery => setForm(p => ({ ...p, jewellery }))}
                    onPrice={price => setForm(p => ({ ...p, price: String(price) }))}
                  />

                  <InputField label={form.jewellery?.pricingMode === 'live' ? 'Price (₹) · live' : 'Price (₹) *'} value={form.price} onChange={set('price')} type="number" required placeholder="24999" disabled={form.jewellery?.pricingMode === 'live'} />
                  <InputField label="Delivery Charge (₹)" value={form.deliveryCharge} onChange={set('deliveryCharge')} type="number" placeholder="0 = free delivery" />
                  <InputField label="Original Price (₹)" value={form.originalPrice} onChange={set('originalPrice')} type="number" placeholder="1499" />
                  <InputField label="Stock *" value={form.stock} onChange={set('stock')} type="number" required placeholder="50" />
                  <InputField label="Brand" value={form.brand} onChange={set('brand')} placeholder="Your brand" />
                  <InputField label="SKU" value={form.sku} onChange={set('sku')} placeholder="RNG-22K-001" />
                  <InputField label="Product Type" value={form.productType} onChange={set('productType')} placeholder="e.g. Solitaire" />
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Default Images (comma separated URLs)</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input value={form.images} onChange={set('images')} placeholder="https://..."
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                      <ImageUploadInput
                        multiple
                        uploadFn={(files) => sellerAPI.uploadImages(files).then(r => r.urls)}
                        onUploaded={(urls) => setForm(p => ({ ...p, images: [p.images, ...urls].filter(Boolean).join(', ') }))}
                      />
                    </div>
                    <ImageUrlPreviews value={form.images} onChange={images => setForm(p => ({ ...p, images }))} />
                  </div>
                  <InputField label="Ring / Bangle Sizes (comma separated)" value={form.sizes} onChange={set('sizes')} placeholder="10, 12, 14  or  2.4, 2.6" />
                  <InputField label="Metal Colours (comma separated)" value={form.colors} onChange={set('colors')} placeholder="Yellow Gold, Rose Gold" />
                  <InputField label="Tags" value={form.tags} onChange={set('tags')} placeholder="diamond, bridal, solitaire" className="sm:col-span-2" />

                  <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                    <ToggleSwitch checked={form.isFeatured} onChange={val => setForm(p => ({ ...p, isFeatured: val }))} label="Featured" />
                    <ToggleSwitch checked={form.isFlashSale} onChange={val => setForm(p => ({ ...p, isFlashSale: val }))} label="Flash Sale" />
                    <ToggleSwitch checked={form.codAvailable !== false} onChange={val => setForm(p => ({ ...p, codAvailable: val }))} label="Cash on Delivery" />
                  </div>

                  <div className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <ToggleSwitch checked={form.returnAvailable !== false} onChange={val => setForm(p => ({ ...p, returnAvailable: val }))} label="Return enabled" color="bg-emerald-600" />
                      <ToggleSwitch checked={form.refundAvailable !== false} onChange={val => setForm(p => ({ ...p, refundAvailable: val }))} label="Refund enabled" color="bg-amber-600" />
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {form.returnAvailable !== false && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Return window (days)</label>
                          <input
                            type="number"
                            value={form.returnDays ?? 7}
                            onChange={set('returnDays')}
                            min={1}
                            required
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                          />
                        </div>
                      )}
                      {form.refundAvailable !== false && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Refund window (days)</label>
                          <input
                            type="number"
                            value={form.refundDays ?? 7}
                            onChange={set('refundDays')}
                            min={1}
                            required
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {form.isFlashSale && (
                    <>
                      <InputField label="Flash Sale Price" value={form.flashSalePrice} onChange={set('flashSalePrice')} type="number" placeholder="699" />
                      <InputField label="Sale Duration (hours)" value={form.flashSaleDuration || '24'} onChange={set('flashSaleDuration')} type="number" placeholder="24" />
                    </>
                  )}
                </div>

                {!editId && (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 border border-indigo-100 dark:border-indigo-500/20">
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                      💡 After creating a product, expand it to add variants per metal colour (Yellow / Rose / White gold) with their own photos, price and stock.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 text-sm"
                  >
                    {saving ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}