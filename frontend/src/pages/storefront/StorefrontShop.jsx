import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiSearch, FiX, FiShoppingBag } from 'react-icons/fi';
import ProductCard from '../../components/product/ProductCard';
import { getEffectiveProductPrice } from '../../utils/helpers';
import { SORTS, sortProducts } from './StorefrontSections';

// Storefront "All Products" page — the seller-store equivalent of the main
// marketplace's Shop page. Filters live in the URL (?category=&sub=&search=
// &sort=&min=&max=) so navbar/footer links, back/forward and shared links all
// land on the same filtered view. Filtering is client-side over the seller's
// already-loaded catalog (StorefrontApp fetches it once).
export default function StorefrontShop({ products, categories, accent }) {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const sub = params.get('sub') || '';
  const search = params.get('search') || '';
  const sort = params.get('sort') || 'newest';
  const min = params.get('min') || '';
  const max = params.get('max') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [category, sub, search]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const clearAll = () => setParams(new URLSearchParams());
  const selectCategory = (name, subName = '') => { update({ category: name, sub: subName }); setShowFilters(false); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lo = min ? Number(min) : null;
    const hi = max ? Number(max) : null;
    const list = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (sub && p.subCategory !== sub) return false;
      if (q && ![p.name, p.brand, p.category, p.subCategory].some((f) => f?.toLowerCase().includes(q))) return false;
      const price = getEffectiveProductPrice(p);
      if (lo !== null && price < lo) return false;
      if (hi !== null && price > hi) return false;
      return true;
    });
    return sortProducts(list, sort);
  }, [products, category, sub, search, sort, min, max]);

  const activeCat = categories.find((c) => c.name === category);
  const title = search ? `Results for "${search}"` : sub || category || 'All Products';
  const hasFilters = !!(category || sub || search || min || max);

  const submitSearch = (e) => {
    e.preventDefault();
    update({ search: searchInput.trim() });
  };

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Categories</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <button onClick={() => selectCategory('')}
              className={`w-full text-left px-3 py-2 rounded-lg ${!category ? 'font-semibold text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              style={!category ? { background: accent } : undefined}>
              All Products <span className="opacity-70">({products.length})</span>
            </button>
          </li>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.name).length;
            const isActive = category === cat.name;
            return (
              <li key={cat.name}>
                <button onClick={() => selectCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg capitalize ${isActive && !sub ? 'font-semibold text-white' : isActive ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  style={isActive && !sub ? { background: accent } : undefined}>
                  {cat.name} <span className="opacity-70">({count})</span>
                </button>
                {isActive && cat.subCategories.length > 0 && (
                  <ul className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-2">
                    {cat.subCategories.map((s) => (
                      <li key={s}>
                        <button onClick={() => selectCategory(cat.name, s)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${sub === s ? 'font-semibold text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                          style={sub === s ? { background: accent } : undefined}>
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Price</h3>
        <div className="flex items-center gap-2">
          <input type="number" min="0" placeholder="Min" value={min} onChange={(e) => update({ min: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          <span className="text-gray-400">–</span>
          <input type="number" min="0" placeholder="Max" value={max} onChange={(e) => update({ max: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
      </div>

      {hasFilters && (
        <button onClick={() => { clearAll(); setShowFilters(false); }}
          className="w-full text-sm font-semibold px-3 py-2 rounded-lg border" style={{ color: accent, borderColor: `${accent}55` }}>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5">
          {(category || sub) && (
            <nav className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
              <button onClick={() => selectCategory('')} className="hover:underline">All</button>
              {category && <><span>›</span>
                <button onClick={() => selectCategory(category)} className={`capitalize ${sub ? 'hover:underline' : 'font-medium text-gray-800 dark:text-gray-200'}`}>{category}</button></>}
              {sub && <><span>›</span><span className="font-medium text-gray-800 dark:text-gray-200">{sub}</span></>}
            </nav>
          )}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 capitalize">{title}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">{filtered.length} product{filtered.length === 1 ? '' : 's'} found</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <form onSubmit={submitSearch} className="relative flex-1 md:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search products..."
                  className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none" />
                {searchInput && (
                  <button type="button" onClick={() => { setSearchInput(''); update({ search: '' }); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </form>
              <select value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
                className="text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-2.5 focus:outline-none">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => setShowFilters(true)}
                className="md:hidden flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300">
                <FiFilter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeCat && activeCat.subCategories.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {['', ...activeCat.subCategories].map((s) => (
                <button key={s || 'all'} onClick={() => selectCategory(category, s)}
                  className={`flex-shrink-0 text-xs px-4 py-2 rounded-full border font-semibold whitespace-nowrap ${sub === s ? 'text-white' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800/60'}`}
                  style={sub === s ? { background: accent, borderColor: accent } : undefined}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <aside className="hidden md:block w-60 flex-shrink-0">
          <div className="sticky top-32">{filtersPanel}</div>
        </aside>

        {showFilters && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowFilters(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85%] bg-white dark:bg-gray-900 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"><FiX className="w-5 h-5" /></button>
              </div>
              {filtersPanel}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <FiShoppingBag className="w-10 h-10 text-amber-700 mx-auto mb-3" aria-hidden="true" />
              <p className="font-semibold text-gray-800 dark:text-gray-200">No products found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Try another category or clear the filters.</p>
              {hasFilters && (
                <button onClick={clearAll} className="text-sm font-semibold px-4 py-2 rounded-full text-white" style={{ background: accent }}>Clear all filters</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
