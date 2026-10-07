import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiEdit2, FiX, FiCheck, FiChevronDown, FiChevronUp, FiLock, FiPlus, FiFolderPlus, FiImage, FiChevronLeft, FiChevronRight, FiFolder } from 'react-icons/fi';
import { categoryAPI, uploadAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import Button from '../../components/ui/Button';
import ImageUploadInput from '../../components/common/ImageUploadInput';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const MAIN_CATEGORY_ORDER = ['men', 'women', 'kids', 'accessories'];
const LIMIT = 20;

export default function AdminCategories({ Wrapper = AdminPageWrapper }) {
  const [categories, setCategories] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(categories);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // New main-category form state
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryTypes, setNewCategoryTypes] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Type (subcategory) form state per category
  const [newTypes, setNewTypes] = useState({});
  const [addingType, setAddingType] = useState({});
  const [editingType, setEditingType] = useState({}); // { catId: { oldType, newVal } }
  const [imageDrafts, setImageDrafts] = useState({}); // catId -> in-progress image URL text

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryAPI.getAllAdmin({ page, limit: LIMIT });
      // Sort in fixed order (within whatever page came back)
      const raw = data.categories || [];
      const ordered = MAIN_CATEGORY_ORDER
        .map(slug => raw.find(c => c.slug === slug))
        .filter(Boolean);
      // Append any extras not in fixed order
      const extras = raw.filter(c => !MAIN_CATEGORY_ORDER.includes(c.slug));
      setCategories([...ordered, ...extras]);
      setPages(data.pages || 1);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, [page]);

  // ── Main Category CRUD ────────────────────────────────────────────
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { toast.error('Category name is required'); return; }
    const types = newCategoryTypes
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    setCreatingCategory(true);
    try {
      await categoryAPI.create({ name, types });
      toast.success(`"${name}" category added!`);
      setNewCategoryName('');
      setNewCategoryTypes('');
      setShowNewCategoryForm(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete the "${cat.name}" category? This cannot be undone.`)) return;
    try {
      await categoryAPI.delete(cat._id);
      toast.success(`"${cat.name}" deleted`);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  // ── Subcategory (Type) CRUD ──────────────────────────────────────
  const handleAddType = async (catId) => {
    const type = (newTypes[catId] || '').trim();
    if (!type) return;
    setAddingType(p => ({ ...p, [catId]: true }));
    try {
      const data = await categoryAPI.addType(catId, type);
      setCategories(prev => prev.map(c => c._id === catId ? data.category : c));
      setNewTypes(p => ({ ...p, [catId]: '' }));
      toast.success(`"${type}" subcategory added!`);
    } catch (err) { toast.error(err.message || 'Failed to add subcategory'); }
    finally { setAddingType(p => ({ ...p, [catId]: false })); }
  };

  const handleDeleteType = async (catId, type) => {
    if (!window.confirm(`Delete subcategory "${type}"?`)) return;
    try {
      const data = await categoryAPI.removeType(catId, type);
      setCategories(prev => prev.map(c => c._id === catId ? data.category : c));
      toast.success(`"${type}" removed`);
    } catch (err) { toast.error(err.message || 'Failed to remove subcategory'); }
  };

  const startRenameType = (catId, type) => {
    setEditingType(p => ({ ...p, [catId]: { oldType: type, newVal: type } }));
  };

  const handleRenameType = async (catId) => {
    const et = editingType[catId];
    if (!et || !et.newVal.trim() || et.newVal === et.oldType) {
      setEditingType(p => { const n = { ...p }; delete n[catId]; return n; });
      return;
    }
    try {
      const data = await categoryAPI.renameType(catId, et.oldType, et.newVal.trim());
      setCategories(prev => prev.map(c => c._id === catId ? data.category : c));
      toast.success('Subcategory renamed!');
      setEditingType(p => { const n = { ...p }; delete n[catId]; return n; });
    } catch (err) {
      toast.error(err.message || 'Failed to rename');
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await categoryAPI.update(cat._id, { isActive: !cat.isActive });
      toast.success(cat.isActive ? 'Category hidden' : 'Category activated');
      fetchCategories();
    } catch (err) { toast.error(err.message || 'Failed to update'); }
  };

  const handleToggleNavbar = async (cat) => {
    try {
      await categoryAPI.update(cat._id, { showInNavbar: !(cat.showInNavbar !== false) });
      toast.success(cat.showInNavbar !== false ? 'Removed from navbar' : 'Added to navbar');
      fetchCategories();
    } catch (err) { toast.error(err.message || 'Failed to update'); }
  };

  const handleToggleHomepage = async (cat) => {
    try {
      await categoryAPI.update(cat._id, { showOnHomepage: !(cat.showOnHomepage !== false) });
      toast.success(cat.showOnHomepage !== false ? 'Removed from "Shop by Category"' : 'Added to "Shop by Category"');
      fetchCategories();
    } catch (err) { toast.error(err.message || 'Failed to update'); }
  };

  const handleSaveImage = async (catId, url) => {
    if (!url?.trim()) return;
    try {
      const data = await categoryAPI.update(catId, { image: url.trim() });
      setCategories(prev => prev.map(c => c._id === catId ? data.category : c));
      setImageDrafts(p => ({ ...p, [catId]: '' }));
      toast.success('Homepage image updated!');
    } catch (err) { toast.error(err.message || 'Failed to save image'); }
  };

  return (
    <Wrapper title="Categories" subtitle="Add new categories and manage subcategories dynamically">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4 sm:mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Add new categories and manage subcategories dynamically</p>
          </div>
          <Button onClick={() => setShowNewCategoryForm(s => !s)} className="flex items-center gap-2 flex-shrink-0">
            <FiFolderPlus className="w-4 h-4" /> Add Category
          </Button>
        </div>

        {/* New Category Form */}
        <AnimatePresence>
          {showNewCategoryForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 sm:mb-6 overflow-hidden"
            >
              <div className="bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-500/30 rounded-2xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FiFolderPlus className="w-4 h-4 text-violet-600" /> Add a New Category
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category Name *</label>
                    <input
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Electronics"
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-800/60 focus:bg-white dark:focus:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subcategories (optional, comma separated)</label>
                    <input
                      value={newCategoryTypes}
                      onChange={e => setNewCategoryTypes(e.target.value)}
                      placeholder="e.g. Mobiles, Laptops, Accessories"
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 dark:bg-gray-800/60 focus:bg-white dark:focus:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateCategory}
                    disabled={creatingCategory}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" /> {creatingCategory ? 'Creating...' : 'Create Category'}
                  </button>
                  <button
                    onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(''); setNewCategoryTypes(''); }}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 rounded-2xl p-4 mb-4 sm:mb-6 flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">i</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">How to use:</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Click "Add Category" to create a brand new top-level category (e.g. Electronics, Groceries). The 4 starter
              categories (Men's, Women's, Kids' Fashion, Accessories) are marked "Core" and can't be deleted, but any
              category you add can be edited or removed. Expand any category to add, rename, or remove subcategories,
              and set the image shown on the homepage. Use "In Navbar" to control the storefront menu, and
              "On Homepage" to control the "Shop by Category" section (needs an image set to actually appear there).
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FiFolder className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No categories yet</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {['Image', 'Name', 'Slug', 'Subcategories', 'Navbar / Homepage / Active', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tablePage.pageItems.map((cat) => (
                    <Fragment key={cat._id}>
                      <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/60 ${!cat.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {cat.image ? (
                              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <FiImage className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cat.isActive ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{cat.name}</span>
                            {MAIN_CATEGORY_ORDER.includes(cat.slug) && (
                              <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500" title="Core category — can't be deleted">
                                <FiLock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono whitespace-nowrap">/{cat.slug}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {cat.types?.length || 0} subcategories
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-[260px]">
                            {/* Toggle show-in-navbar */}
                            <button
                              onClick={() => handleToggleNavbar(cat)}
                              title="Controls whether this category appears in the storefront navbar menu"
                              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                                cat.showInNavbar !== false
                                  ? 'border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              {cat.showInNavbar !== false ? 'In Navbar' : 'Hidden from Navbar'}
                            </button>
                            {/* Toggle show-on-homepage */}
                            <button
                              onClick={() => handleToggleHomepage(cat)}
                              title="Controls whether this category's tile appears in the homepage's Shop by Category section"
                              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                                cat.showOnHomepage !== false
                                  ? 'border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              {cat.showOnHomepage !== false ? 'On Homepage' : 'Hidden from Homepage'}
                            </button>
                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggleActive(cat)}
                              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                                cat.isActive
                                  ? 'border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              {cat.isActive ? 'Active' : 'Hidden'}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Delete — only for categories that aren't one of the 4 core starter categories */}
                            {!MAIN_CATEGORY_ORDER.includes(cat.slug) && (
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                title="Delete this category"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            )}
                            {/* Expand/collapse subcategory manager */}
                            <button
                              onClick={() => setExpandedId(expandedId === cat._id ? null : cat._id)}
                              className="flex items-center gap-1 px-2 py-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-all text-xs font-medium whitespace-nowrap"
                              title="Manage subcategories"
                            >
                              {expandedId === cat._id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                              Manage
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Subcategory Manager row */}
                      <AnimatePresence>
                        {expandedId === cat._id && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={6} className="p-0 border-t-0">
                              <div className="px-4 sm:px-5 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                                {/* Homepage Image */}
                                <div className="mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                    <FiImage className="w-4 h-4 text-amber-600" /> Homepage Image
                                  </h4>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Shown as this category's tile in the homepage's "Shop by Category" section.</p>
                                  <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden flex-shrink-0">
                                      {cat.image ? (
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600"><FiImage className="w-5 h-5" /></div>
                                      )}
                                    </div>
                                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                      <input
                                        value={imageDrafts[cat._id] ?? ''}
                                        onChange={e => setImageDrafts(p => ({ ...p, [cat._id]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveImage(cat._id, imageDrafts[cat._id])}
                                        placeholder="https://... or upload"
                                        className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                      />
                                      <div className="flex gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => handleSaveImage(cat._id, imageDrafts[cat._id])}
                                          className="px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-xl hover:bg-violet-700 transition-colors"
                                        >
                                          Save
                                        </button>
                                        <ImageUploadInput
                                          uploadFn={(files) => uploadAPI.single(files[0]).then(r => [r.url])}
                                          onUploaded={([url]) => handleSaveImage(cat._id, url)}
                                          label="Upload"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Subcategories ({cat.types?.length || 0})
                                  </h4>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">Click pencil to rename, trash to delete</span>
                                </div>

                                {/* Existing types */}
                                {cat.types?.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                    {cat.types.map(type => (
                                      <div key={type} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 gap-2">
                                        {editingType[cat._id]?.oldType === type ? (
                                          <div className="flex items-center gap-2 flex-1">
                                            <input
                                              autoFocus
                                              value={editingType[cat._id].newVal}
                                              onChange={e => setEditingType(p => ({ ...p, [cat._id]: { ...p[cat._id], newVal: e.target.value } }))}
                                              onKeyDown={e => {
                                                if (e.key === 'Enter') handleRenameType(cat._id);
                                                if (e.key === 'Escape') setEditingType(p => { const n = { ...p }; delete n[cat._id]; return n; });
                                              }}
                                              className="flex-1 text-xs border border-red-300 dark:border-red-500/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                                            />
                                            <button onClick={() => handleRenameType(cat._id)} className="text-green-500 hover:text-green-700 flex-shrink-0">
                                              <FiCheck className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingType(p => { const n = { ...p }; delete n[cat._id]; return n; })} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                                              <FiX className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1 truncate">{type}</span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <button onClick={() => startRenameType(cat._id, type)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors rounded">
                                                <FiEdit2 className="w-3 h-3" />
                                              </button>
                                              <button onClick={() => handleDeleteType(cat._id, type)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors rounded">
                                                <FiTrash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm mb-4 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    No subcategories yet. Add your first one below.
                                  </div>
                                )}

                                {/* Add new subcategory */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={newTypes[cat._id] || ''}
                                    onChange={e => setNewTypes(p => ({ ...p, [cat._id]: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddType(cat._id)}
                                    placeholder={`Add subcategory to ${cat.name}... e.g. Sarees`}
                                    className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                  />
                                  <button
                                    onClick={() => handleAddType(cat._id)}
                                    disabled={addingType[cat._id]}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex-shrink-0 rounded-xl"
                                  >
                                    <FiPlus className="w-4 h-4" />
                                    {addingType[cat._id] ? 'Adding...' : 'Add'}
                                  </button>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                  New subcategories appear automatically in Navbar and product filters.
                                </p>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
            </>
          )}
        </div>

        {!loading && categories.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                <FiChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
    </Wrapper>
  );
}