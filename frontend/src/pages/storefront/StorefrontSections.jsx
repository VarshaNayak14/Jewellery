import { useMemo, useState } from 'react';
import {
  FiTruck, FiRefreshCw, FiShield, FiDollarSign, FiMapPin, FiPhone, FiMail, FiClock,
  FiChevronLeft, FiChevronRight, FiX, FiCheck, FiNavigation, FiStar, FiShoppingBag,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import ProductCard from '../../components/product/ProductCard';
import { formatPrice, getEffectiveProductPrice, toWhatsappNumber } from '../../utils/helpers';

// Building blocks shared by every storefront theme (Classic / Minimal /
// Vibrant): each theme keeps its own hero, then renders <StoreBody /> so all
// stores get the same trust strip, categories, new arrivals, sortable grid,
// about/contact section and WhatsApp button.

const DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
const TODAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

export const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top rated' },
];

export const sortProducts = (list, sort) => {
  const arr = [...list];
  if (sort === 'price-asc') return arr.sort((a, b) => getEffectiveProductPrice(a) - getEffectiveProductPrice(b));
  if (sort === 'price-desc') return arr.sort((a, b) => getEffectiveProductPrice(b) - getEffectiveProductPrice(a));
  if (sort === 'rating') return arr.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const productImage = (p) => p?.images?.[0] || p?.variants?.find(v => v.images?.length)?.images?.[0] || '';

export const storeWhatsapp = (seller) => toWhatsappNumber(seller?.whatsapp || seller?.phone || '');
export const storeLocation = (seller) => [seller?.address, seller?.city, seller?.district !== seller?.city ? seller?.district : '', seller?.state]
  .filter(Boolean).join(', ');

// Small pill used inside heroes: rating / location / verified.
export function HeroMeta({ seller, light = true }) {
  const cls = light ? 'bg-white/15 text-white border-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-transparent';
  const place = [seller?.city, seller?.state].filter(Boolean).join(', ');
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {seller?.numRatings > 0 && (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border backdrop-blur ${cls}`}>
          <FiStar className="w-3.5 h-3.5 fill-current text-amber-400" /> {Number(seller.avgRating || 0).toFixed(1)} ({seller.numRatings})
        </span>
      )}
      {place && (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border backdrop-blur ${cls}`}>
          <FiMapPin className="w-3.5 h-3.5" /> {place}
        </span>
      )}
      {seller?.isVerified && (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border backdrop-blur ${cls}`}>
          <FiCheck className="w-3.5 h-3.5" /> Verified shop
        </span>
      )}
    </div>
  );
}

// Primary hero buttons: Shop Now + WhatsApp (+ Call on wider screens).
export function HeroActions({ seller, accent, invert = true }) {
  const wa = storeWhatsapp(seller);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="#products"
        className={`inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all ${invert ? 'bg-white' : 'text-white'}`}
        style={invert ? { color: accent } : { background: accent }}>
        Shop Now
      </a>
      {wa && (
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${seller.shopName}, I found your store online.`)}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 hover:-translate-y-0.5 transition-all">
          <FaWhatsapp className="w-4 h-4" /> WhatsApp
        </a>
      )}
      {seller?.phone && (
        <a href={`tel:${seller.phone}`}
          className={`hidden sm:inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-full border transition-all hover:-translate-y-0.5 ${invert ? 'border-white/40 text-white hover:bg-white/10' : 'border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
          <FiPhone className="w-4 h-4" /> Call
        </a>
      )}
    </div>
  );
}

export function TrustStrip({ seller, accent }) {
  const threshold = Number(seller?.freeShippingThreshold || 0);
  const charge = Number(seller?.shippingCharge || 0);
  const delivery = charge === 0
    ? { title: 'Free Delivery', sub: 'On every order' }
    : threshold > 0
      ? { title: 'Free Delivery', sub: `On orders above ${formatPrice(threshold)}` }
      : { title: 'Home Delivery', sub: `Flat ${formatPrice(charge)} per order` };
  const items = [
    { icon: FiTruck, ...delivery },
    { icon: FiDollarSign, title: 'Cash on Delivery', sub: 'Pay when it arrives' },
    { icon: FiRefreshCw, title: 'Easy Returns', sub: 'Hassle-free process' },
    { icon: FiShield, title: 'Secure Payments', sub: 'UPI, cards & more' },
  ];
  return (
    <section className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1a`, color: accent }}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, accent, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 capitalize">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function CategoryTiles({ products, accent, onSelect }) {
  const cats = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      if (!p.category) return;
      const cur = map.get(p.category) || { name: p.category, count: 0, image: '' };
      cur.count += 1;
      if (!cur.image) cur.image = productImage(p);
      map.set(p.category, cur);
    });
    return [...map.values()];
  }, [products]);
  if (cats.length < 2) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-12">
      <SectionTitle eyebrow="Browse" title="Shop by Category" accent={accent} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cats.map(c => (
          <button key={c.name} type="button" onClick={() => onSelect?.(c.name)}
            className="group relative aspect-[4/5] rounded-2xl overflow-hidden text-left bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-xl transition-shadow">
            {c.image
              ? <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-4">
              <p className="text-white font-bold capitalize leading-tight">{c.name.replace(/-/g, ' ')}</p>
              <p className="text-white/75 text-xs mt-0.5">{c.count} product{c.count > 1 ? 's' : ''} →</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function ProductRail({ eyebrow, title, products, accent }) {
  const scroll = (dir) => {
    const el = document.getElementById(`rail-${title}`);
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  if (!products.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 pt-12">
      <SectionTitle eyebrow={eyebrow} title={title} accent={accent} right={(
        <div className="hidden sm:flex gap-2">
          {[[-1, FiChevronLeft], [1, FiChevronRight]].map(([dir, Icon]) => (
            <button key={dir} type="button" onClick={() => scroll(dir)}
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-white transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = accent; }} onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      )} />
      <div id={`rail-${title}`} className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map(p => (
          <div key={p._id} className="snap-start shrink-0 w-[46%] sm:w-[31%] lg:w-[23%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductGrid({ heading, products, accent, isFiltered, onClear }) {
  const [sort, setSort] = useState('newest');
  const sorted = useMemo(() => sortProducts(products, sort), [products, sort]);
  return (
    <section id="products" className="max-w-7xl mx-auto px-4 py-12 scroll-mt-20">
      <SectionTitle eyebrow={isFiltered ? 'Filtered' : 'Collection'} title={heading} accent={accent} right={(
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">{products.length} item{products.length === 1 ? '' : 's'}</span>
          {isFiltered && (
            <button type="button" onClick={onClear}
              className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full border"
              style={{ color: accent, borderColor: `${accent}55` }}>
              <FiX className="w-3.5 h-3.5" /> Clear filter
            </button>
          )}
          {products.length > 1 && (
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-full px-4 py-2 focus:outline-none">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
        </div>
      )} />
      {products.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <FiShoppingBag className="w-10 h-10 text-amber-700 mx-auto mb-3" aria-hidden="true" />
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {isFiltered ? 'No products match this filter.' : 'New collection coming soon!'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isFiltered ? 'Try another category or clear the filter.' : 'This store is adding products — check back shortly or message us on WhatsApp.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {sorted.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </section>
  );
}

export function StoreAbout({ seller, accent }) {
  const [lightbox, setLightbox] = useState(null);
  const location = storeLocation(seller);
  const wa = storeWhatsapp(seller);
  const hours = DAYS.filter(([k]) => seller?.workingHours?.[k]);
  const gallery = (seller?.gallery || []).filter(Boolean);
  const hasContact = location || seller?.phone || wa || seller?.footerEmail;
  if (!seller?.description && !hasContact && !hours.length && !gallery.length) return null;

  return (
    <section id="about" className="bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14 grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          <SectionTitle eyebrow="About us" title={`Welcome to ${seller.shopName}`} accent={accent} />
          {seller.description && <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{seller.description}</p>}
          {seller.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {seller.amenities.map(a => (
                <span key={a} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                  <FiCheck className="w-3.5 h-3.5" style={{ color: accent }} /> {a}
                </span>
              ))}
            </div>
          )}
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-8">
              {gallery.slice(0, 8).map((src, i) => (
                <button key={src + i} type="button" onClick={() => setLightbox(src)} className="aspect-square rounded-xl overflow-hidden group">
                  <img src={src} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {hasContact && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Visit or contact us</h3>
              {location && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${seller.shopName}, ${location}`)}`} target="_blank" rel="noreferrer"
                  className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300 hover:underline">
                  <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} /> {location}
                </a>
              )}
              {seller.phone && (
                <a href={`tel:${seller.phone}`} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 hover:underline">
                  <FiPhone className="w-4 h-4 shrink-0" style={{ color: accent }} /> {seller.phone}
                </a>
              )}
              {seller.footerEmail && (
                <a href={`mailto:${seller.footerEmail}`} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 hover:underline">
                  <FiMail className="w-4 h-4 shrink-0" style={{ color: accent }} /> {seller.footerEmail}
                </a>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white">
                    <FaWhatsapp className="w-4 h-4" /> Chat on WhatsApp
                  </a>
                )}
                {location && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${seller.shopName}, ${location}`)}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white" style={{ background: accent }}>
                    <FiNavigation className="w-4 h-4" /> Get Directions
                  </a>
                )}
              </div>
            </div>
          )}
          {hours.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><FiClock style={{ color: accent }} /> Opening Hours</h3>
              <ul className="space-y-1.5 text-sm">
                {DAYS.map(([k, label]) => (
                  <li key={k} className={`flex justify-between gap-3 px-2 py-1 rounded-lg ${k === TODAY ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}
                    style={k === TODAY ? { background: `${accent}14` } : undefined}>
                    <span>{label}{k === TODAY ? ' (Today)' : ''}</span>
                    <span>{seller.workingHours?.[k] || 'Closed'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white p-2" aria-label="Close"><FiX className="w-6 h-6" /></button>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-xl" />
        </div>
      )}
    </section>
  );
}

// Everything below a theme's hero.
export function StoreBody({
  seller, products, allProducts, accent, activeCategory, activeSub, activeSearch,
  offersSlot, onCategorySelect, onClearFilter, defaultHeading = 'All Products',
}) {
  const isFiltered = !!(activeCategory || activeSub || activeSearch);
  const heading = activeSearch
    ? `Results for "${activeSearch}"`
    : activeSub || (activeCategory ? activeCategory.replace(/-/g, ' ') : defaultHeading);
  const newArrivals = useMemo(() => sortProducts(allProducts, 'newest').slice(0, 10), [allProducts]);

  return (
    <>
      <TrustStrip seller={seller} accent={accent} />
      {offersSlot}
      {!isFiltered && <CategoryTiles products={allProducts} accent={accent} onSelect={onCategorySelect} />}
      {!isFiltered && allProducts.length > 4 && <ProductRail eyebrow="Just in" title="New Arrivals" products={newArrivals} accent={accent} />}
      <ProductGrid heading={heading} products={products} accent={accent} isFiltered={isFiltered} onClear={onClearFilter} />
      {!isFiltered && <StoreAbout seller={seller} accent={accent} />}
    </>
  );
}
