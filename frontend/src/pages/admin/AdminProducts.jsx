import { Fragment, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiCheck,
  FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiImage,
  FiMove, FiStar
} from 'react-icons/fi';
import { productAPI, categoryAPI, uploadAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import { formatPrice, colorSwatch, splitSizesAndUrls } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import ImageUrlPreviews from '../../components/common/ImageUrlPreviews';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import toast from 'react-hot-toast';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuthStore } from '../../store/authStore';
import SelectWithOther from '../../components/common/SelectWithOther';
import JewelleryFields from '../../components/jewellery/JewelleryFields';
import { emptyJewellery, jewelleryPayload, jewelleryFormFrom, METAL_LABEL } from '../../utils/jewellery';

const emptyForm = {
  name: '', description: '', price: '', originalPrice: '',
  deliveryCharge: 0,
  category: '', productType: '', subCategory: '',
  brand: '', images: '', sizes: '', colors: '', stock: '', sku: '',
  tags: '', isFeatured: false, isFlashSale: false, flashSalePrice: '', flashSaleDuration: '24', codAvailable: true,
  returnAvailable: true, returnDays: 7, refundAvailable: true, refundDays: 7,
  jewellery: emptyJewellery,
};

const emptyVariantForm = {
  colorName: '', colorCode: '#000000', price: '', originalPrice: '',
  stock: '', sku: '', sizes: '', isActive: true, isDefault: false,
};

// ─── Variant Form Modal ───────────────────────────────────────────────────────
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
        await productAPI.updateVariant(productId, variant._id, payload);
        toast.success('Variant updated!');
      } else {
        await productAPI.addVariant(productId, payload);
        toast.success('Color variant added!');
      }
      onSaved(); onClose();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-2xl my-4 sm:my-8 shadow-2xl">
        <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base sm:text-lg truncate">{variant ? 'Edit Color Variant' : 'Add Color Variant'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"><FiX className="w-5 h-5 dark:text-gray-300" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Color */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Color Name *</label>
            <input value={form.colorName} onChange={set('colorName')} required className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="e.g. Blue, Midnight Black" />
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-3 gap-4">
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Price (₹) *</label><input type="number" value={form.price} onChange={set('price')} required min={0} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Original Price</label><input type="number" value={form.originalPrice} onChange={set('originalPrice')} min={0} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Stock</label><input type="number" value={form.stock} onChange={set('stock')} min={0} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">SKU</label><input value={form.sku} onChange={set('sku')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Sizes (comma separated)</label><input value={form.sizes} onChange={set('sizes')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="S, M, L, XL" /></div>
          </div>

          {/* Images */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">
              Images <span className="normal-case text-gray-400 dark:text-gray-500 font-normal">(drag to reorder · ★ to set as main)</span>
            </label>
            {imageList.length > 0 && (
              <div className="space-y-2 mb-3">
                {imageList.map((url, idx) => (
                  <div key={idx} draggable onDragStart={() => dragStart(idx)} onDragEnter={() => dragEnter(idx)} onDragEnd={dragEnd} onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-2 sm:gap-3 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 cursor-move">
                    <FiMove className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    <img src={url} alt="" className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0 bg-gray-200 dark:bg-gray-700" onError={e => { e.target.src = 'https://via.placeholder.com/48?text=?'; }} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate min-w-0">{url}</span>
                    {idx === 0 && <span className="text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Main</span>}
                    {idx !== 0 && <button type="button" onClick={() => setDefault(idx)} title="Set as main" className="text-gray-300 dark:text-gray-600 hover:text-amber-500 flex-shrink-0"><FiStar className="w-4 h-4" /></button>}
                    <button type="button" onClick={() => removeImage(idx)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 flex-shrink-0"><FiX className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col xs:flex-row gap-2">
              <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                placeholder="Image URL paste karo aur Enter dabao"
                className="input-field text-sm flex-1 min-w-0 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
              <button type="button" onClick={addImage} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 shrink-0">
                <FiImage className="w-4 h-4" /> Add
              </button>
              <ImageUploadInput
                multiple
                uploadFn={(files) => uploadAPI.multiple(files).then(r => r.urls)}
                onUploaded={(urls) => setImageList(p => [...p, ...urls])}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <ToggleSwitch checked={form.isActive} onChange={val => setForm(p => ({ ...p, isActive: val }))} label="Active" color="bg-red-600" />
            <ToggleSwitch checked={form.isDefault} onChange={val => setForm(p => ({ ...p, isDefault: val }))} label="Default color" color="bg-red-600" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} fullWidth>{variant ? 'Update' : 'Add Color Variant'}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Variant Manager ───────────────────────────────────────────────────────────
function VariantManager({ product, onProductUpdated }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const variants = product.variants || [];

  const handleDelete = async (variantId) => {
    if (!window.confirm('Delete this color variant?')) return;
    setDeletingId(variantId);
    try {
      const data = await productAPI.deleteVariant(product._id, variantId);
      toast.success('Variant deleted');
      onProductUpdated(data.product);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setDeletingId(null); }
  };

  const handleToggle = async (variant) => {
    try {
      const data = await productAPI.updateVariant(product._id, variant._id, { isActive: !variant.isActive });
      toast.success(variant.isActive ? 'Disabled' : 'Enabled');
      onProductUpdated(data.product);
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleRefresh = async () => {
    try { const data = await productAPI.getOne(product._id); onProductUpdated(data.product); } catch {}
  };

  return (
    <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Color Variants <span className="ml-1.5 text-xs bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">{variants.length} colors</span>
        </p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors shrink-0">
          <FiPlus className="w-3.5 h-3.5" /> Add Color
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
          <p className="text-2xl mb-1">🎨</p>
          <p>Koi color variant nahi — "Add Color" pe click karo</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {variants.map(v => (
            <div key={v._id} className={`flex flex-col xs:flex-row xs:items-center gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${!v.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  {v.images?.length > 0
                    ? <img src={v.images[0]} alt={v.colorName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full" style={{ backgroundColor: colorSwatch(v.colorName) }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{v.colorName}</span>
                    <span className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700 flex-shrink-0" style={{ backgroundColor: colorSwatch(v.colorName) }} />
                    {v.isDefault && <span className="text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Default</span>}
                    {!v.isActive && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                    <span>{formatPrice(v.price)}</span>
                    <span>·</span><span>{v.stock} stock</span>
                    {v.images?.length > 0 && <><span>·</span><span>{v.images.length} images</span></>}
                    {v.sizes?.length > 0 && <><span>·</span><span className="truncate">{v.sizes.join(', ')}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 self-end xs:self-auto">
                <button onClick={() => handleToggle(v)} className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {v.isActive ? <FiEye className="w-4 h-4 text-green-500" /> : <FiEyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingVariant(v)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"><FiEdit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(v._id)} disabled={deletingId === v._id} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && <VariantModal productId={product._id} variant={null} onClose={() => setShowAdd(false)} onSaved={handleRefresh} />}
        {editingVariant && <VariantModal productId={product._id} variant={editingVariant} onClose={() => setEditingVariant(null)} onSaved={handleRefresh} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Main AdminProducts ────────────────────────────────────────────────────────
export default function AdminProducts({ Wrapper = AdminPageWrapper }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const isSuperAdmin = useAuthStore(s => s.user?.role === 'superadmin');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Derived: subcategories list for selected category (category stored as slug)
  const selectedCatObj = categories.find(c => c.slug === form.category);
  const availableSubcategories = selectedCatObj?.types || [];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productAPI.getAllAdmin({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        owner: ownerFilter || undefined,
      });
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getAll();
      setCategories(data.categories || []);
    } catch {}
  };

  useEffect(() => { fetchProducts(); }, [page, debouncedSearch, dateFrom, dateTo, ownerFilter]);
  useEffect(() => { fetchCategories(); }, []);
  // Any filter/search change should snap back to page 1 — staying on page 4
  // of a filter that now has 1 page of results would just show an empty table.
  useEffect(() => { setPage(1); }, [debouncedSearch, dateFrom, dateTo, ownerFilter]);

  const openAdd = () => {
    const defaultCat = categories[0]?.slug || '';
    setForm({ ...emptyForm, category: defaultCat });
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
      productType: p.productType || '',
      subCategory: p.subCategory || '',
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
        images: form.images.split(',').map(s => s.trim()).filter(Boolean),
        sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean),
        colors: form.colors.split(',').map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        codAvailable: form.codAvailable !== false,
        returnAvailable: form.returnAvailable !== false,
        returnDays: Number(form.returnDays) || 0,
        refundAvailable: form.refundAvailable !== false,
        refundDays: Number(form.refundDays) || 0,
        jewellery: jewelleryPayload(form.jewellery),
      };
      let savedId = editId;
      if (editId) {
        await productAPI.update(editId, payload);
        toast.success('Product updated!');
      } else {
        const data = await productAPI.create(payload);
        toast.success('Product created! Ab color variants add karo ▼');
        savedId = data.product?._id;
        setExpandedProductId(savedId);
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await productAPI.delete(id); toast.success('Deleted'); fetchProducts(); }
    catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleProductVariantUpdated = (updated) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
  };

  const set = (key) => (e) =>
    setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // When category changes, reset subCategory and productType
  return (
    <Wrapper
      title="Products"
      subtitle={`${total} total products`}
      actions={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {categories.length === 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-2 rounded-xl whitespace-nowrap">
              ⚠️ Pehle Category banao
            </span>
          )}
          <Button variant="primary" onClick={openAdd}><FiPlus className="w-4 h-4" /> <span className="hidden xs:inline">Add Product</span><span className="xs:hidden">Add</span></Button>
        </div>
      }
    >
      {/* Search & Date Range */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-10 pr-9 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><FiX className="w-4 h-4" /></button>}
        </div>
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
          className="px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm">
          <option value="">All products</option>
          <option value="mine">My products</option>
          {isSuperAdmin && <option value="admins">Admin products</option>}
          <option value="sellers">Seller products</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined}
            className="px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm [color-scheme:light] dark:[color-scheme:dark]" />
          <span className="text-xs text-gray-400 dark:text-gray-500">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined}
            className="px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm [color-scheme:light] dark:[color-scheme:dark]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Product', 'Seller', 'Category / Type', 'Price', 'Stock', 'Colors', 'Featured', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-3 sm:px-4 py-3"><div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No products found</td></tr>
              ) : products.map(product => (
                <Fragment key={product._id}>
                  <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-3 max-w-[220px]">
                        <img src={product.images?.[0] || product.variants?.[0]?.images?.[0]} alt={product.name}
                          className="w-12 h-12 object-cover rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100 text-sm line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      {product.sellerId?.shopName ? (
                        <span className="badge bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">{product.sellerId.shopName}</span>
                      ) : (
                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {product.ownerAdmin?.name
                            ? `${product.ownerAdmin.name} (${product.ownerAdmin.role === 'superadmin' ? 'Super Admin' : 'Admin'})`
                            : 'Admin'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <span className="badge bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 capitalize">{product.category}</span>
                      {product.productType && (
                        <span className="ml-1 badge bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">{product.productType}</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatPrice(product.price)}</p>
                      {product.jewellery?.metal && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 whitespace-nowrap">
                          {product.jewellery.purity} {METAL_LABEL[product.jewellery.metal] || product.jewellery.metal}
                          {product.jewellery.netWeight > 0 && ` · ${product.jewellery.netWeight}g`}
                          {product.jewellery.pricingMode === 'live' && ' · live'}
                        </p>
                      )}
                      {product.originalPrice && <p className="text-xs text-gray-400 dark:text-gray-500 line-through">{formatPrice(product.originalPrice)}</p>}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`badge whitespace-nowrap ${product.stock > 10 ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : product.stock > 0 ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                        {product.stock} left
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {product.variants?.length > 0 ? (
                        <div className="flex gap-1 flex-wrap max-w-[110px]">
                          {product.variants.filter(v => v.isActive).slice(0, 4).map(v => (
                            <div key={v._id} title={v.colorName}
                              className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm flex-shrink-0"
                              style={{ backgroundColor: colorSwatch(v.colorName) }} />
                          ))}
                          {product.variants.length > 4 && <span className="text-xs text-gray-400 dark:text-gray-500">+{product.variants.length - 4}</span>}
                        </div>
                      ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {product.isFeatured ? <FiCheck className="w-5 h-5 text-green-500" /> : <FiX className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <button onClick={() => openEdit(product)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product._id)} className="p-2 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
                        <button
                          onClick={() => setExpandedProductId(id => id === product._id ? null : product._id)}
                          title="Manage color variants"
                          className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg"
                        >
                          {expandedProductId === product._id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedProductId === product._id && (
                    <tr key={`${product._id}-variants`}>
                      <td colSpan={8} className="px-3 sm:px-4 pb-4 bg-purple-50/30 dark:bg-purple-500/5">
                        <VariantManager product={product} onProductUpdated={handleProductVariantUpdated} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Prev</button>
          <span className="px-2 sm:px-4 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Page {page} of {Math.ceil(total / 15)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Next</button>
        </div>
      )}

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-2xl my-4 sm:my-8 shadow-2xl">
              <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base sm:text-lg truncate">{editId ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"><FiX className="w-5 h-5 dark:text-gray-300" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Product Name *</label>
                    <input value={form.name} onChange={set('name')} required className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="e.g. Heritage Kundan Necklace" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Description *</label>
                    <textarea value={form.description} onChange={set('description')} required rows={3} className="input-field text-sm resize-none w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                  </div>

                  {/* Category - dynamic from DB */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Category *</label>
                    <SelectWithOther value={form.category} required
                      onChange={v => setForm(p => ({ ...p, category: v, subCategory: '', productType: '' }))}
                      options={categories.map(c => ({ value: c.slug, label: c.name }))}
                      placeholder="-- Select Category --" otherPlaceholder="Type a new category"
                      className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>

                  {/* Subcategory - dynamic from selected category (from DB) */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                      Subcategory *
                      {selectedCatObj && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(required)</span>}
                    </label>
                    {availableSubcategories.length > 0 ? (
                      <SelectWithOther value={form.subCategory} required
                        onChange={v => setForm(p => ({ ...p, subCategory: v }))}
                        options={availableSubcategories.map(t => ({ value: t, label: t }))}
                        placeholder="-- Select Subcategory --" otherPlaceholder="Type a new subcategory"
                        className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 [color-scheme:light] dark:[color-scheme:dark]" />
                    ) : (
                      <input value={form.subCategory} onChange={set('subCategory')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                        placeholder={form.category ? 'Subcategory type karo' : 'Pehle category select karo'} />
                    )}
                  </div>

                  <JewelleryFields
                    value={form.jewellery}
                    onChange={jewellery => setForm(p => ({ ...p, jewellery }))}
                    onPrice={price => setForm(p => ({ ...p, price: String(price) }))}
                  />

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                      {form.jewellery?.pricingMode === 'live' ? 'Base Price (₹) · live rate' : 'Base Price (₹) *'}
                    </label>
                    <input type="number" value={form.price} onChange={set('price')} required min={0} disabled={form.jewellery?.pricingMode === 'live'} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 disabled:opacity-70" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Delivery Charge (₹)</label>
                    <input type="number" value={form.deliveryCharge} onChange={set('deliveryCharge')} min={0} placeholder="0 = free delivery" className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Original Price (₹)</label>
                    <input type="number" value={form.originalPrice} onChange={set('originalPrice')} min={0} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Base Stock *</label>
                    <input type="number" value={form.stock} onChange={set('stock')} required min={0} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Brand</label>
                    <input value={form.brand} onChange={set('brand')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">SKU</label>
                    <input value={form.sku} onChange={set('sku')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="NCK-22K-001" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Default Images (comma separated URLs)</label>
                    <div className="flex items-center gap-2">
                      <input value={form.images} onChange={set('images')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="https://..." />
                      <ImageUploadInput
                        multiple
                        uploadFn={(files) => uploadAPI.multiple(files).then(r => r.urls)}
                        onUploaded={(urls) => setForm(p => ({ ...p, images: [p.images, ...urls].filter(Boolean).join(', ') }))}
                      />
                    </div>
                    <ImageUrlPreviews value={form.images} onChange={images => setForm(p => ({ ...p, images }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Ring / Bangle Sizes</label>
                    <input value={form.sizes} onChange={set('sizes')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="10, 12, 14  or  2.4, 2.6" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Metal Colours (comma separated)</label>
                    <input value={form.colors} onChange={set('colors')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="Yellow Gold, Rose Gold, White Gold" />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">For a different photo, price or stock per metal colour, add variants with ▼ after saving.</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Tags</label>
                    <input value={form.tags} onChange={set('tags')} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" placeholder="bridal, kundan, festive" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                    <ToggleSwitch checked={form.isFeatured} onChange={val => setForm(p => ({ ...p, isFeatured: val }))} label="Featured" color="bg-red-600" />
                    <ToggleSwitch checked={form.isFlashSale} onChange={val => setForm(p => ({ ...p, isFlashSale: val }))} label="Flash Sale" color="bg-red-600" />
                    <ToggleSwitch checked={form.codAvailable !== false} onChange={val => setForm(p => ({ ...p, codAvailable: val }))} label="Cash on Delivery" color="bg-red-600" />
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
                          <input type="number" value={form.returnDays ?? 7} onChange={set('returnDays')} min={1} required className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                        </div>
                      )}
                      {form.refundAvailable !== false && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Refund window (days)</label>
                          <input type="number" value={form.refundDays ?? 7} onChange={set('refundDays')} min={1} required className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  {form.isFlashSale && (
                    <>
                      <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Flash Sale Price</label><input type="number" value={form.flashSalePrice} onChange={set('flashSalePrice')} min={0} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" /></div>
                      <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Sale Duration (hours)</label><input type="number" value={form.flashSaleDuration || '24'} onChange={set('flashSaleDuration')} min={1} className="input-field text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500" /></div>
                    </>
                  )}
                </div>

                {!editId && (
                  <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 border border-purple-100 dark:border-purple-500/30">
                    <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">💡 Product banane ke baad ▼ button dabao aur alag alag colors add karo — har color ke liye alag images, price, stock.</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" loading={saving} fullWidth>{editId ? 'Update Product' : 'Create Product'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Wrapper>
  );
}