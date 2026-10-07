import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiSearch, FiX, FiChevronDown, FiAward, FiShield, FiRefreshCw, FiTruck } from 'react-icons/fi';
import { productAPI } from '../services/api';
import ProductCard from '../components/product/ProductCard';
import ProductFilters from '../components/product/ProductFilters';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { SORT_OPTIONS } from '../utils/helpers';
import { getSavedLocation, onLocationChange } from '../utils/location';
import './Shop.css';

export default function Shop() {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const getInitialParams = () => {
    const p = {};
    if (category) p.category = category;
    searchParams.forEach((v, k) => { if (v) p[k] = v; });
    return p;
  };

  const [filterParams, setFilterParams] = useState(getInitialParams);
  // Dynamic categories from DB
  const [allCategories, setAllCategories] = useState([]);
  // Shopper's chosen location (Navbar badge / LocationPickerModal) — a
  // seller's products only show up here when their subscription plan's
  // reach (tehsil/district/state/india) covers this location.
  const [location, setLocation] = useState(() => getSavedLocation());

  useEffect(() => onLocationChange(setLocation), []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productAPI.getAll({
        ...filterParams, page, limit: 16,
        state: location?.state || '',
        district: location?.district || '',
        tehsil: location?.tehsil || '',
      });
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [filterParams, page, location]);
  // Navbar links (category / sub-type mega menu, search) change the URL while
  // this page stays mounted — re-read the filters from the URL each time.
  const urlKey = `${category || ''}?${searchParams.toString()}`;
  const firstUrlKey = useRef(urlKey);
  useEffect(() => {
    if (firstUrlKey.current === urlKey) return;
    firstUrlKey.current = urlKey;
    setFilterParams(getInitialParams());
    setPage(1);
  }, [urlKey]);

  // Same product-backed category tree the Navbar uses (see
  // productController.getCategoryTree) — only real category/subCategory
  // combinations that exist on live products show up here, so the "All /
  // Men / Women / Kids"-style chip row always matches something.
  useEffect(() => {
    productAPI.getCategoryTree()
      .then(data => setAllCategories(data.categories || []))
      .catch(() => setAllCategories([]));
  }, []);

  const updateFilter = (newParams) => {
    setFilterParams(prev => {
      const updated = { ...prev };
      Object.entries(newParams).forEach(([k, v]) => {
        if (v) updated[k] = v;
        else delete updated[k];
      });
      return updated;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilterParams(category ? { category } : {});
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) updateFilter({ search: searchInput });
    else updateFilter({ search: '' });
  };

  // Find category object from API data
  const categoryData = filterParams.category
    ? allCategories.find(c => c.slug === filterParams.category)
    : null;

  const title = filterParams.subCategory
    ? filterParams.subCategory
    : filterParams.category
      ? (categoryData?.name || filterParams.category)
      : 'All Products';

  const breadcrumb = [
    filterParams.category && { label: categoryData?.name || filterParams.category },
    filterParams.subCategory && { label: filterParams.subCategory },
  ].filter(Boolean);

  const heroImage = (filterParams.subCategory && categoryData?.typeImages?.[filterParams.subCategory])
    || categoryData?.image || '/jewelry/hero-gold.jpg';
  const activeCount = ['subCategory', 'metal', 'purity', 'gender', 'hallmarked', 'size', 'minPrice', 'maxPrice', 'search']
    .filter((k) => filterParams[k]).length;

  return (
    <div className="min-h-screen jshop">
      {/* Hero */}
      <section className="jshop__hero">
        <img src={heroImage} alt="" className="jshop__hero-img" />
        <div className="jshop__hero-shade" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <nav className="flex items-center gap-1.5 text-xs text-[#e8d6b4] mb-4 flex-wrap">
            <button onClick={() => { setFilterParams({}); setPage(1); }} className="hover:text-white">All jewellery</button>
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5"><span className="opacity-60">/</span>
                <span className={i === breadcrumb.length - 1 ? 'text-white' : ''}>{b.label}</span>
              </span>
            ))}
          </nav>
          <span className="jshop__eyebrow">{filterParams.subCategory ? categoryData?.name || 'Collection' : 'The collection'}</span>
          <h1 className="jshop__title">{title === 'All Products' ? <>All <em>jewellery</em></> : title}</h1>
          <p className="text-[#eadcc2] mt-3 text-sm">
            {loading ? 'Loading pieces…' : `${total.toLocaleString('en-IN')} piece${total === 1 ? '' : 's'}`}
            {location?.label ? ` · available near ${location.label}` : ''}
          </p>

          <form onSubmit={handleSearch} className="jshop__search mt-6">
            <FiSearch className="w-4 h-4 text-[#a58a5f] flex-shrink-0" />
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search rings, necklaces, solitaire…" />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); updateFilter({ search: '' }); }} aria-label="Clear search">
                <FiX className="w-4 h-4 text-[#a58a5f]" />
              </button>
            )}
            <button type="submit" className="jshop__search-btn">Search</button>
          </form>
        </div>
      </section>

      {/* Sub-type tiles */}
      {categoryData?.types?.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
          <div className="jshop__types no-scrollbar">
            <button onClick={() => updateFilter({ subCategory: '' })} className={`jshop__type ${!filterParams.subCategory ? 'is-active' : ''}`}>
              <span className="jshop__type-img"><img src={categoryData.image || '/jewelry/campaign.jpg'} alt="" /></span>
              All
            </button>
            {categoryData.types.map((t) => (
              <button key={t} onClick={() => updateFilter({ subCategory: filterParams.subCategory === t ? '' : t })}
                className={`jshop__type ${filterParams.subCategory === t ? 'is-active' : ''}`}>
                <span className="jshop__type-img">
                  {categoryData.typeImages?.[t]
                    ? <img src={categoryData.typeImages[t]} alt="" loading="lazy" />
                    : <span className="text-lg font-semibold">{t.charAt(0)}</span>}
                </span>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <button onClick={() => setShowFilters(true)} className="jshop__tool md:hidden">
            <FiFilter className="w-4 h-4" /> Filters {activeCount > 0 && <span className="jshop__count">{activeCount}</span>}
          </button>
          <p className="hidden md:block text-sm jshop__muted">
            Showing {products.length} of {total.toLocaleString('en-IN')}
          </p>
          <label className="jshop__tool">
            <span className="jshop__muted hidden sm:inline">Sort</span>
            <select value={filterParams.sort || '-createdAt'} onChange={(e) => updateFilter({ sort: e.target.value })}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <FiChevronDown className="w-4 h-4 jshop__muted -ml-5 pointer-events-none" />
          </label>
        </div>

        <div className="flex gap-7">
          <aside className="hidden md:block w-72 flex-shrink-0">
            <ProductFilters params={filterParams} onUpdate={updateFilter} onClear={clearFilters} />
          </aside>

          {/* Mobile filters drawer */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFilters(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
                <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed left-0 top-0 h-full w-[88vw] max-w-sm jshop__drawer z-50 overflow-y-auto p-4 md:hidden shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold jshop__ink">Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg jshop__muted" aria-label="Close filters"><FiX className="w-5 h-5" /></button>
                  </div>
                  <ProductFilters params={filterParams} onUpdate={updateFilter} onClear={clearFilters} />
                  <button onClick={() => setShowFilters(false)} className="jshop__apply mt-4">Show {total} pieces</button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {Array.from({ length: 9 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="jshop__empty">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center jshop__empty-icon"><FiSearch className="w-6 h-6" /></div>
                <h3 className="text-lg font-semibold jshop__ink mb-1">No pieces match these filters</h3>
                <p className="text-sm jshop__muted mb-6">Try another metal or price range, or clear the filters.</p>
                <button onClick={clearFilters} className="jshop__apply !w-auto px-6">Clear all filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {products.map((product, i) => (
                    <motion.div key={product._id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 11) * 0.03, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                      <ProductCard product={product} index={i} />
                    </motion.div>
                  ))}
                </div>

                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="jshop__page !w-auto px-4">← Prev</button>
                    {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setPage(p)} className={`jshop__page ${p === page ? 'is-active' : ''}`}>{p}</button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="jshop__page !w-auto px-4">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Trust strip */}
        <div className="jshop__trust">
          {[
            [FiAward, 'BIS hallmarked', 'Purity you can verify'],
            [FiShield, 'Certified stones', 'IGI / GIA / SGL'],
            [FiRefreshCw, 'Easy exchange', 'Lifetime buyback'],
            [FiTruck, 'Insured shipping', 'Tamper-proof packaging'],
          ].map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <span className="jshop__trust-icon"><Icon className="w-5 h-5" /></span>
              <div><p className="text-sm font-semibold jshop__ink">{t}</p><p className="text-xs jshop__muted">{d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
