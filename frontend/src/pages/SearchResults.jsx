import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiSearch, FiMapPin, FiStar, FiPhone, FiX, FiCheckCircle,
  FiClock, FiChevronLeft, FiChevronRight, FiFilter, FiMessageCircle, FiShoppingBag,
} from 'react-icons/fi';
import { searchAPI, businessAPI, productAPI } from '../services/api';
import { toWhatsappNumber, getEffectiveProductPrice, getEffectiveOriginalPrice } from '../utils/helpers';
import { getSavedLocation, formatLocationLabel } from '../utils/location';
import LocationPickerModal from '../components/common/LocationPickerModal';
import ShopCover from '../components/common/ShopCover';

/**
 * JustDial-style results page.
 *
 * URL is the source of truth (so results are shareable / back-button safe):
 *   /search?q=restaurant&tab=shops&category=Restaurants&sort=rating&page=2
 *
 * Location comes from the same saved location the Navbar badge uses, so a
 * search made from anywhere on the site stays scoped to the chosen area.
 */
export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const q = params.get('q') || '';
  const tab = params.get('tab') || 'shops';
  const category = params.get('category') || '';
  const subCategory = params.get('subCategory') || '';
  const sort = params.get('sort') || 'relevance';
  const page = Number(params.get('page')) || 1;

  const [input, setInput] = useState(q);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({ shops: 0, products: 0 });
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Two SEPARATE, correctly-sourced category lists — shops and products are
  // different data models with different `category` values, so one dropdown
  // fed by one API can't serve both without silently returning 0 results:
  //   - Shops:    businessAPI.getCategoryCounts() — real Seller.category values.
  //   - Products: productAPI.getCategoryTree()    — real Product.category/
  //               subCategory values (see productController.getCategoryTree).
  const [shopCategories, setShopCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [location, setLocation] = useState(() => getSavedLocation());
  const topRef = useRef(null);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    businessAPI.getCategoryCounts().then(d => setShopCategories(d.data || [])).catch(() => {});
    productAPI.getCategoryTree().then(d => setProductCategories(d.categories || [])).catch(() => {});
  }, []);

  // Merge a change into the URL. Any filter change resets to page 1.
  const setParam = useCallback((patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, String(v));
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  }, [params, setParams]);

  const fetchResults = useCallback(() => {
    setLoading(true);
    searchAPI.search({
      q,
      tab,
      category,
      subCategory,
      sort,
      page,
      limit: 12,
      state: location?.state || '',
      district: location?.district || '',
      tehsil: location?.tehsil || '',
    })
      .then(d => {
        setShops(d.shops || []);
        setProducts(d.products || []);
        setCounts(d.counts || { shops: 0, products: 0 });
        setPages(d.pagination?.pages || 1);
      })
      .catch(() => { setShops([]); setProducts([]); })
      .finally(() => setLoading(false));
  }, [q, tab, category, subCategory, sort, page, location]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // Switching tabs mid-filter can carry over a category value that doesn't
  // exist on the other side (a shop category name vs a product category
  // slug) — clear it so the new tab never starts pre-filtered to 0 results.
  // Skips the very first render so a direct deep link like
  // /search?tab=products&category=men still works.
  const tabMounted = useRef(false);
  useEffect(() => {
    if (!tabMounted.current) { tabMounted.current = true; return; }
    setParam({ category: '', subCategory: '' });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e?.preventDefault();
    const next = new URLSearchParams(params);
    if (input.trim()) next.set('q', input.trim()); else next.delete('q');
    next.delete('page');
    setParams(next);
  };

  const goToPage = (p) => {
    setParam({ page: p });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isShopsTab = tab === 'shops';
  const activeProductCategory = productCategories.find(c => c.slug === category);
  const hasFilters = !!(category || subCategory || sort !== 'relevance');

  return (
    <main className="min-h-screen bg-[#faf6ee] dark:bg-[#15110d]">

      {/* ─── Search bar (JustDial-style: location + query in one pill) ─── */}
      <div
        className="bg-[#fffdf8]/95 dark:bg-[#1e1913]/95 backdrop-blur-md border-b border-[rgba(169,131,69,0.22)] dark:border-white/10 sticky z-30"
        style={{ top: 'var(--navbar-height, 96px)' }}
        ref={topRef}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 sm:w-56 flex-shrink-0 transition-colors"
            >
              <FiMapPin className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span className="truncate">
                {location?.state ? formatLocationLabel(location) : 'All India'}
              </span>
            </button>

            <div className="flex-1 flex items-center gap-2 px-4 rounded-xl border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 focus-within:bg-white dark:focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-blue-400 transition-colors">
              <FiSearch className="w-5 h-5 text-gray-400 dark:text-gray-400 flex-shrink-0" />
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search jewellers, rings, necklaces, solitaire..."
                className="w-full py-3 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              />
              {input && (
                <button type="button" onClick={() => setInput('')} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
              Search
            </button>
          </form>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto">
            {[
              { key: 'shops', label: 'Jewellers', count: counts.shops },
              { key: 'products', label: 'Jewellery', count: counts.products },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setParam({ tab: t.key })}
                className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  tab === t.key ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {t.label} <span className="text-xs opacity-70">({t.count})</span>
              </button>
            ))}

            <button
              onClick={() => setShowFilters(v => !v)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                hasFilters ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <FiFilter className="w-4 h-4" /> Filters
            </button>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
              {isShopsTab ? (
                <select
                  value={category}
                  onChange={e => setParam({ category: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-gray-900"
                >
                  <option value="">All Categories</option>
                  {shopCategories.map(c => (
                    <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
                  ))}
                </select>
              ) : (
                <>
                  <select
                    value={category}
                    onChange={e => setParam({ category: e.target.value, subCategory: '' })}
                    className="px-3 py-2 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-gray-900"
                  >
                    <option value="">All Categories</option>
                    {productCategories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>

                  <select
                    value={subCategory}
                    onChange={e => setParam({ subCategory: e.target.value })}
                    disabled={!activeProductCategory?.types?.length}
                    className="px-3 py-2 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40 [&>option]:text-gray-900"
                  >
                    <option value="">All Subcategories</option>
                    {(activeProductCategory?.types || []).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </>
              )}

              <select
                value={sort}
                onChange={e => setParam({ sort: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 [&>option]:text-gray-900"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
                {isShopsTab && <option value="name">Name (A–Z)</option>}
                {!isShopsTab && <option value="price-low">Price: Low to High</option>}
                {!isShopsTab && <option value="price-high">Price: High to Low</option>}
              </select>

              {hasFilters && (
                <button
                  onClick={() => setParam({ category: '', subCategory: '', sort: '' })}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  <FiX className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Results ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {loading ? 'Searching…' : (
            <>
              <span className="font-bold text-gray-900 dark:text-white">
                {isShopsTab ? counts.shops : counts.products}
              </span>{' '}
              {isShopsTab ? 'jewellers' : 'pieces'} found
              {q && <> for “<span className="font-semibold text-gray-700 dark:text-gray-200">{q}</span>”</>}
              {location?.state && <> in {formatLocationLabel(location)}</>}
            </>
          )}
        </p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 animate-pulse" />
            ))}
          </div>
        ) : isShopsTab ? (
          shops.length === 0 ? (
            <EmptyState
              q={q}
              location={location}
              onWiden={() => { setLocationModalOpen(true); }}
              onBrowse={() => navigate('/nearby')}
            />
          ) : (
            <div className="space-y-4">
              {shops.map(s => <ShopRow key={s._id} shop={s} />)}
            </div>
          )
        ) : products.length === 0 ? (
          <EmptyState q={q} location={location} onBrowse={() => navigate('/shop')} productMode />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => <ProductMini key={p._id} product={p} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="flex justify-center items-center gap-1 mt-8">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="w-9 h-9 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-gray-400 dark:text-gray-500">…</span>}
                  <button
                    onClick={() => goToPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-blue-600 text-white' : 'bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= pages}
              className="w-9 h-9 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <LocationPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onApply={(loc) => { setLocation(loc); setLocationModalOpen(false); }}
      />
    </main>
  );
}

/* ─── Shop result row — the JustDial listing card ──────────────────────── */
function ShopRow({ shop }) {
  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const todayHours = shop.workingHours?.[todayKey];
  const place = [shop.address, shop.tehsil, shop.city || shop.district, shop.state]
    .filter(Boolean).join(', ');

  return (
    <div className="bg-[#fffdf8] dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-[rgba(169,131,69,0.22)] dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.07] transition-colors overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <Link to={`/business/${shop.shopSlug}`} className="sm:w-48 h-40 sm:h-auto bg-gray-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <ShopCover shop={shop} />
        </Link>

        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/business/${shop.shopSlug}`} className="text-lg font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1 transition-colors">
              {shop.shopName}
            </Link>
            {shop.isVerified && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full flex-shrink-0 font-semibold">
                <FiCheckCircle className="w-3 h-3" /> Verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {shop.numRatings > 0 && (
              <span className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                {shop.avgRating?.toFixed(1)} <FiStar className="w-3 h-3 fill-white" />
              </span>
            )}
            {shop.numRatings > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{shop.numRatings} Ratings</span>
            )}
            {shop.category && (
              <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{shop.category}</span>
            )}
          </div>

          {place && (
            <p className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{place}</span>
            </p>
          )}

          {todayHours && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <FiClock className="w-3.5 h-3.5" />
              <span className={/closed/i.test(todayHours) ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
                {todayHours}
              </span>
            </p>
          )}

          {shop.subCategories?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {shop.subCategories.slice(0, 4).map(t => (
                <span key={t} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {shop.phone && (
              <a href={`tel:${shop.phone}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
                <FiPhone className="w-4 h-4" /> {shop.phone}
              </a>
            )}
            {(shop.whatsapp || shop.phone) && (
              <a href={`https://wa.me/${toWhatsappNumber(shop.whatsapp || shop.phone)}?text=${encodeURIComponent(`Hi, I found "${shop.shopName}" online and would like to know more about your jewellery.`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
                <FiMessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            <Link to={`/business/${shop.shopSlug}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 text-sm font-semibold transition-colors">
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Small product tile for the Products tab ─────────────────────────── */
function ProductMini({ product }) {
  const primaryImage = product.images?.[0] || product.variants?.find(v => Array.isArray(v.images) && v.images.length > 0)?.images?.[0];
  const salePrice = getEffectiveProductPrice(product);
  const originalPrice = getEffectiveOriginalPrice(product);

  return (
    <Link to={`/product/${product._id}`}
      className="bg-[#fffdf8] dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-[rgba(169,131,69,0.22)] dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 overflow-hidden transition-colors shadow-sm">
      <div className="aspect-square bg-gray-50 dark:bg-white/5 overflow-hidden">
        {primaryImage
          ? <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><FiShoppingBag className="w-8 h-8 text-amber-700" /></div>}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 line-clamp-2">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{salePrice}</span>
          {originalPrice && originalPrice > salePrice && (
            <span className="text-xs text-gray-400 dark:text-gray-500 line-through">₹{originalPrice}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────── */
function EmptyState({ q, location, onWiden, onBrowse, productMode }) {
  return (
    <div className="text-center py-16 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
      <FiSearch className="w-10 h-10 text-amber-700 mx-auto mb-3" aria-hidden="true" />
      <p className="text-gray-700 dark:text-gray-200 font-semibold">
        {q ? `No ${productMode ? 'products' : 'shops'} found for “${q}”` : 'Nothing to show yet'}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
        {location?.state
          ? 'Try a broader area, or a different keyword.'
          : 'Try a different keyword or spelling.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {onWiden && location?.state && (
          <button onClick={onWiden} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/15 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            Change location
          </button>
        )}
        <button onClick={onBrowse} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          {productMode ? 'Browse all products' : 'Browse all shops'}
        </button>
      </div>
    </div>
  );
}