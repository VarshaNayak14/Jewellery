import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiHeart, FiUser, FiMenu, FiX,
  FiChevronDown, FiChevronRight, FiLogOut, FiStar, FiShield, FiZap,
  FiBriefcase, FiMoreHorizontal, FiMapPin, FiShoppingBag, FiTag, FiPhone,
  FiShoppingCart, FiMail,
} from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import { productAPI, settingsAPI, businessAPI, searchAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import BrandLogo from '../common/BrandLogo';
import { getSavedLocation, saveLocation, onLocationChange, getCurrentCoords, reverseGeocodeToLocation } from '../../utils/location';
import { getEffectiveProductPrice, formatPrice } from '../../utils/helpers';
import './PublicJewelryTheme.css';

// Static fallback pictures (public/jewelry) when a category has no product photo yet.
const typeImage = (label = '') => {
  const k = label.toLowerCase();
  if (k.includes('ring')) return '/jewelry/ring.jpg';
  if (k.includes('neck') || k.includes('pendant') || k.includes('chain')) return '/jewelry/necklace.jpg';
  if (k.includes('ear')) return '/jewelry/earrings.jpg';
  if (k.includes('brace') || k.includes('bangle')) return '/jewelry/gold-detail.jpg';
  return '/jewelry/campaign.jpg';
};
// Which categories get a spot in the bar (the rest live inside "All Products").
const NAV_PRIORITY = ['rings', 'necklaces', 'earrings', 'bride', 'bracelets', 'bangles', 'pendants'];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Unified JustDial-style suggestions: shops first, then category shortcuts,
  // then products. Comes from GET /api/v1/search/suggest.
  const [suggest, setSuggest] = useState({ shops: [], categories: [], products: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  // Dynamic categories from DB
  const [categories, setCategories] = useState([]);
  // product photos shown inside each mega menu, loaded the first time it opens
  const [megaProducts, setMegaProducts] = useState({});
  // one real product photo per subcategory, used by the "All Products" mega menu
  const [typeImages, setTypeImages] = useState({});
  const typeImagesRequested = useRef(false);
  // Shopper's location, detected automatically (GPS) and remembered everywhere
  // (see utils/location.js); it scopes search suggestions to plan reach.
  const [currentLocation, setCurrentLocation] = useState(() => getSavedLocation());
  // "Search shops, services..." box — submits to
  // the /nearby business directory (same query params it already reads),
  // separate from the product search above.
  const [shopQuery, setShopQuery] = useState('');
  // Scrolling marquee — pulled from Admin Settings (Marquee tab) so it's
  // editable without a code change; falls back to sensible defaults until
  // that loads (or if it's ever left empty).
  const DEFAULT_MARQUEE = [
    'Complimentary delivery on orders above ₹999',
    'A little something extra on your first order — WELCOME10',
    'The new heirloom edit has arrived',
    'Thoughtful design, made to wear every day',
    'Secure checkout and easy returns',
    'Delivered with care, across India',
  ];
  const [marqueeMessages, setMarqueeMessages] = useState(DEFAULT_MARQUEE);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const megaRef = useRef(null);
  const megaTimer = useRef(null);
  const moreRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { wishlist, fetchWishlist } = useWishlistStore();
  const { cart, toggleCart } = useCartStore();

  const wishlistCount = wishlist?.products?.length || 0;
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    // On the home page the navbar should stay transparent for the full
    // height of the dark 3D hero, not just the first few px of scroll.
    const threshold = location.pathname === '/' ? 420 : 20;
    const onScroll = () => setIsScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) { fetchWishlist(); }
  }, [isAuthenticated]);

  // Keep in sync if the location is changed from elsewhere (e.g. the
  // /nearby page's own dropdowns)
  useEffect(() => onLocationChange(setCurrentLocation), []);

  // Auto-detect the shopper's location once per visit (browser GPS + reverse
  // geocoding). If permission is denied or it can't be matched, the last
  // saved location (if any) is kept.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { latitude, longitude } = await getCurrentCoords();
        const states = (await businessAPI.getStates()).data || [];
        const loc = await reverseGeocodeToLocation(
          latitude, longitude, states,
          async (st) => (await businessAPI.getDistricts(st)).data || [],
          async (d) => (await businessAPI.getTehsils(d)).data || [],
        );
        if (loc && !cancelled) saveLocation(loc);
      } catch {
        // denied / unsupported / offline — keep whatever was saved
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load the admin-editable marquee text (Admin → Settings → Marquee).
  // Keeps the hardcoded defaults on screen if the request fails or the
  // admin hasn't set anything yet, so the bar never renders empty.
  useEffect(() => {
    settingsAPI.getPublic()
      .then(d => {
        const msgs = d.settings?.marqueeMessages;
        if (Array.isArray(msgs) && msgs.length > 0) setMarqueeMessages(msgs);
      })
      .catch(() => {});
  }, []);

  // Mega menu categories — built from what's actually in the Product
  // collection (see productController.getCategoryTree), not a separately
  // maintained taxonomy. This is what stops "Clothing" / "Footwear" style
  // links from landing on an empty "0 products" page: a category or
  // subcategory chip only ever appears here if a real, live product has it.
  useEffect(() => {
    productAPI.getCategoryTree()
      .then(data => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  // As-you-type suggestions. Shops are the headline result (JustDial-style):
  // typing "restaurant", "plumber" or a shop name returns real businesses,
  // scoped to the shopper's detected location.
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSuggest({ shops: [], categories: [], products: [] });
      return;
    }
    setIsSearching(true);
    searchAPI.suggest({
      q: debouncedSearch,
      state: currentLocation?.state || '',
      district: currentLocation?.district || '',
      tehsil: currentLocation?.tehsil || '',
    })
      .then(d => setSuggest({
        shops: d.shops || [],
        categories: d.categories || [],
        products: d.products || [],
      }))
      .catch(() => setSuggest({ shops: [], categories: [], products: [] }))
      .finally(() => setIsSearching(false));
  }, [debouncedSearch, currentLocation]);

  const suggestCount =
    suggest.shops.length + suggest.categories.length + suggest.products.length;

  useEffect(() => {
    const handleClick = (e) => {
      if (!searchRef.current?.contains(e.target) && !mobileSearchRef.current?.contains(e.target)) setSearchQuery('');
      if (!megaRef.current?.contains(e.target)) setActiveMega(null);
      if (!moreRef.current?.contains(e.target)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => { logout(); setUserMenuOpen(false); navigate('/'); };

  // Enter / "See all results" → unified results page (shops tab by default).
  const submitSearch = (tab = 'shops') => {
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&tab=${tab}`);
    setSearchQuery('');
    setIsMobileOpen(false);
  };

  // Clicking a category suggestion goes straight to that category's shops.
  const goToCategorySearch = (cat) => {
    const p = new URLSearchParams({ tab: 'shops' });
    if (cat.label) p.set('q', cat.type || cat.label.split(' · ')[0]);
    if (cat.type) p.set('subCategory', cat.type);
    navigate(`/search?${p.toString()}`);
    setSearchQuery('');
    setIsMobileOpen(false);
  };

  // Flipkart-style "More" menu items — shown to every visitor, logged in or not
  const moreMenuItems = [
    { icon: FiMapPin, label: 'Nearby Businesses', path: '/nearby' },
    { icon: FiBriefcase, label: 'Become a Seller', path: '/seller/register' },
  ];

  const goTo = (path) => { navigate(path); setMoreMenuOpen(false); };
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);

  const openMega = (slug) => {
    clearTimeout(megaTimer.current);
    setActiveMega(slug);
  };

  const closeMega = () => {
    megaTimer.current = setTimeout(() => setActiveMega(null), 120);
  };

  const keepMegaOpen = () => {
    clearTimeout(megaTimer.current);
  };

  const navToShop = (slug, subCategory = '') => {
    const params = new URLSearchParams();
    if (subCategory) params.set('subCategory', subCategory);
    navigate(`/shop/${slug}${params.toString() ? '?' + params.toString() : ''}`);
    setActiveMega(null);
    setIsMobileOpen(false);
  };

  // On the landing page the navbar floats transparent over the dark 3D hero,
  // then solidifies (dark, matching the page) once scrolled past it. The
  // Shop page is dark-themed too, but has no hero image behind it, so its
  // navbar is always solid dark rather than transparent. Every other route
  // ── Self-measuring header height ────────────────────────────────────────
  // The header's real height changes (marquee on/off, category row wrapping
  // once categories load, "Nearby Shops"/"Flash Sale" links, etc.), so any
  // page that hardcodes a fixed padding-top to clear it (pt-24, pt-[104px]…)
  // WILL eventually drift out of sync and get its heading cut off — exactly
  // what kept happening. Instead we measure the real chrome height here and
  // publish it as a CSS variable; every other page just uses
  // `pt-[var(--navbar-height)]` and it can never go stale again.
  const chromeRef = useRef(null);

  useEffect(() => {
    const el = chromeRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty('--navbar-height', `${el.offsetHeight}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener('resize', publish);
    return () => { ro.disconnect(); window.removeEventListener('resize', publish); };
  }, [categories, marqueeMessages]);

  const isHome = location.pathname === '/';

  // Navbar = Home + All Products + 3 category links (5 in total). Every
  // subcategory is a link candidate; the most popular come first and the rest
  // are reachable from the "All Products" mega menu.
  const allTypeLinks = categories.flatMap((cat) => (cat.types?.length
    ? cat.types.map((t) => ({ key: `${cat.slug}::${t}`, label: t, slug: cat.slug, sub: t }))
    : [{ key: cat.slug, label: cat.name, slug: cat.slug, sub: '' }]));
  const rank = (l) => {
    const i = NAV_PRIORITY.indexOf(l.label.toLowerCase());
    return i === -1 ? 99 : i;
  };
  const directLinks = [...allTypeLinks].sort((x, y) => rank(x) - rank(y)).slice(0, 4);

  const loadMega = (l) => {
    if (megaProducts[l.key] !== undefined) return;
    setMegaProducts((m) => ({ ...m, [l.key]: [] }));
    productAPI.getAll({
      category: l.slug, subCategory: l.sub, limit: 4,
      state: currentLocation?.state || '',
      district: currentLocation?.district || '',
      tehsil: currentLocation?.tehsil || '',
    })
      .then((d) => setMegaProducts((m) => ({ ...m, [l.key]: d.products || [] })))
      .catch(() => {});
  };
  const activeLink = directLinks.find((l) => l.key === activeMega);

  // Photo for a subcategory tile: photo saved on the subcategory (DB) → real
  // product photo → the category's own image → static fallback.
  const catImage = (slug) => categories.find((c) => c.slug === slug)?.image;
  // photo saved for this subcategory in the DB (Category.typeImages), if any
  const savedTypeImage = (l) => {
    const map = categories.find((c) => c.slug === l.slug)?.typeImages || {};
    const key = Object.keys(map).find((k) => k.toLowerCase() === l.label.toLowerCase());
    return key ? map[key] : '';
  };
  const tileImage = (l) => savedTypeImage(l) || typeImages[`${l.slug}::${l.label.toLowerCase()}`] || catImage(l.slug) || typeImage(l.label);

  const loadTypeImages = () => {
    if (typeImagesRequested.current || categories.length === 0) return;
    typeImagesRequested.current = true;
    categories.forEach((cat) => {
      productAPI.getAll({
        category: cat.slug, limit: 60,
        state: currentLocation?.state || '',
        district: currentLocation?.district || '',
        tehsil: currentLocation?.tehsil || '',
      })
        .then((d) => {
          const found = {};
          (d.products || []).forEach((prod) => {
            const img = prod.images?.[0] || prod.variants?.find((v) => v.images?.length)?.images?.[0];
            const t = String(prod.subCategory || '').toLowerCase();
            const k = `${cat.slug}::${t}`;
            if (img && t && !found[k]) found[k] = img;
          });
          setTypeImages((m) => ({ ...found, ...m }));
        })
        .catch(() => {});
    });
  };
  // Navbar chrome now follows the actual light/dark theme instead of being
  // hardcoded per-route — previously Home/Shop/search/nearby always forced
  // a near-black navbar even in light mode, which looked like a stray black
  // bar once those pages became theme-aware themselves.
  // Light theme only — the dark mode toggle was removed from the navbar.
  const navDark = false;
  // The navbar used to float transparently over the Home hero and only
  // solidify on scroll. That looked fine when the hero was a fixed dark 3D
  // scene, but once Home itself became theme-aware it meant translucent
  // elements like the search box (bg-white/10 or bg-gray-50) were rendered
  // directly over the hero's animated/gradient background instead of a flat
  // navbar surface — showing up as a stray light or dark patch depending on
  // theme. Simpler and consistent: the navbar is always solid, on every
  // route and theme (see the spacer at the bottom of this file, which now
  // reserves space for it on Home too).

  return (
    <>
    <header
      className={`jewel-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        navDark
          ? 'bg-[#05070f]/90 backdrop-blur-md shadow-md'
          : 'bg-white dark:bg-gray-900'
      } ${isScrolled && !navDark ? 'shadow-md dark:shadow-black/40' : ''}`}
    >

      <div ref={chromeRef}>
      {/* ─── Marquee Top Bar ─────────────────────────────────────────── */}
      {marqueeMessages.length > 0 && (
        <div className="nv-marquee overflow-hidden">
          <style>{`
            @keyframes marqueeLeft { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
            .marquee-track { display: flex; width: max-content; white-space: nowrap; animation: marqueeLeft 20s linear infinite; }
          `}</style>
          <div className="marquee-track items-center text-xs sm:text-sm py-1.5 font-medium">
            {marqueeMessages.slice(0, 2).flatMap((msg, i) => [
              <span key={i} className="mx-16 tracking-wide">{String(msg).replace(/\p{Extended_Pictographic}/gu, '').trim()}</span>,
              <span key={`dup-${i}`} className="mx-16 tracking-wide">{String(msg).replace(/\p{Extended_Pictographic}/gu, '').trim()}</span>,
            ])}
          </div>
        </div>
      )}

      {/* ─── Main Nav Row ────────────────────────────────────────────── */}
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="nv-row flex items-center justify-between h-16 lg:h-[76px] gap-3 sm:gap-6">

          {/* Logo */}
          <Link to="/" className="nv-logo flex items-center flex-shrink-0">
            <BrandLogo className="origin-left" sizeClass="h-10 sm:h-12 lg:h-[54px]" dark={false} />
          </Link>

        <nav ref={megaRef} className="nv-nav hidden lg:flex items-center justify-center gap-0 min-w-0 flex-1">
          <Link to="/" onMouseEnter={closeMega}
            className={`nv-link ${location.pathname === '/' ? 'is-active' : ''}`}>
            Home
          </Link>

          {/* All Products → mega menu with every category */}
          <div className="nv-hit flex items-center" onMouseEnter={() => { openMega('all'); loadTypeImages(); }} onMouseLeave={closeMega}>
            <Link to="/shop" className={`nv-link ${activeMega === 'all' ? 'is-active' : ''}`}>
              All Products
              <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${activeMega === 'all' ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          {/* 3 category links — each opens its own mega menu with photos */}
          {directLinks.map((l) => (
            <div key={l.key} className="nv-hit flex items-center"
              onMouseEnter={() => { openMega(l.key); loadMega(l); }} onMouseLeave={closeMega}>
              <button onClick={() => navToShop(l.slug, l.sub)}
                className={`nv-link ${activeMega === l.key ? 'is-active' : ''}`}>
                {l.label}
                <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${activeMega === l.key ? 'rotate-180' : ''}`} />
              </button>
            </div>
          ))}

          <Link to="/blogs" onMouseEnter={closeMega}
            className={`nv-link ${location.pathname.startsWith('/blogs') ? 'is-active' : ''}`}>
            Blogs
          </Link>
          <Link to="/contact" onMouseEnter={closeMega}
            className={`nv-link ${location.pathname === '/contact' ? 'is-active' : ''}`}>
            Contact
          </Link>

          {/* ── FULL-WIDTH MEGA MENUS (edge to edge, with images) ── */}
          <AnimatePresence>
            {(activeMega === 'all' || activeLink) && (
              <motion.div
                key={activeMega}
                className="nv-mega"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                onMouseEnter={keepMegaOpen}
                onMouseLeave={closeMega}
              >
                <div className="nv-mega-inner">
                  {activeMega === 'all' ? (
                    <div className="nv-tiles">
                      {allTypeLinks.slice(0, 7).map((l) => (
                        <button key={l.key} className="nv-tile" onClick={() => navToShop(l.slug, l.sub)}>
                          <img src={tileImage(l)} alt={l.label} loading="lazy" />
                          <span className="nv-tile-label"><b>{l.label}</b><small>Shop now →</small></span>
                        </button>
                      ))}
                      <Link to="/shop?isFlashSale=true" className="nv-tile nv-tile-flash" onClick={() => setActiveMega(null)}>
                        <FiZap className="w-7 h-7" />
                        Flash Sale
                        <small>Limited time</small>
                      </Link>
                    </div>
                  ) : (
                    <div className="nv-mega-cat">
                      <div>
                        <span className="nv-mega-eyebrow">The collection</span>
                        <h3 className="nv-mega-heading">{activeLink.label}</h3>
                        <p className="nv-mega-text">Thoughtfully designed pieces, made to be worn every day and kept forever.</p>
                        <button className="nv-mega-cta" onClick={() => navToShop(activeLink.slug, activeLink.sub)}>
                          Shop all {activeLink.label} <FiChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="nv-tiles">
                        {(megaProducts[activeLink.key] || []).length > 0
                          ? megaProducts[activeLink.key].slice(0, 4).map((p) => {
                            const img = p.images?.[0] || p.variants?.find((v) => v.images?.length)?.images?.[0] || tileImage(activeLink);
                            return (
                              <Link key={p._id} to={`/product/${p._id}`} className="nv-tile" onClick={() => setActiveMega(null)}>
                                <img src={img} alt={p.name} loading="lazy" />
                                <span className="nv-tile-label"><b>{p.name}</b><small>{formatPrice(getEffectiveProductPrice(p))}</small></span>
                              </Link>
                            );
                          })
                          : [tileImage(activeLink), '/jewelry/campaign.jpg', '/jewelry/hero-gold.jpg'].map((src, i) => (
                            <button key={src} className="nv-tile" onClick={() => navToShop(activeLink.slug, activeLink.sub)}>
                              <img src={src} alt="" loading="lazy" />
                              <span className="nv-tile-label"><b>{i === 0 ? activeLink.label : 'Explore'}</b><small>Shop now →</small></span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ─── Nav links (desktop) — same line as the logo ───────────── */}
        <style>{`
          .nv-link{position:relative;display:inline-flex;align-items:center;gap:7px;padding:10px 16px;font-family:var(--font-body);font-size:12.5px;font-weight:500;letter-spacing:.09em;text-transform:uppercase;color:#4a3f2f;white-space:nowrap;background:none;border:0;cursor:pointer;transition:color .25s}
          .nv-link::after{content:'';position:absolute;left:16px;right:16px;bottom:3px;height:1px;background:#a98345;transform:scaleX(0);transform-origin:left;transition:transform .35s ease}
          .nv-link:hover,.nv-link.is-active{color:#92703b}
          .nv-link:hover::after,.nv-link.is-active::after{transform:scaleX(1)}
          @media (min-width:1280px){.nv-link{font-size:14px;padding:10px 22px}.nv-link::after{left:22px;right:22px}}

          /* full-width mega menu: touches the left and right screen edges */
          .nv-mega{position:absolute;left:0;right:0;top:100%;z-index:70;background:#faf6ec;border-top:1px solid rgba(169,131,69,.28);box-shadow:0 34px 60px rgba(47,38,25,.2)}
          .nv-mega-inner{width:100%;max-width:1680px;margin:0 auto;padding:40px clamp(24px,5vw,72px) 44px}
          .nv-mega-cat{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:52px;align-items:center}
          .nv-mega-eyebrow{display:block;margin-bottom:12px;font-family:var(--font-body);font-size:11px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;color:#92703b}
          .nv-mega-heading{margin:0;font-family:var(--font-display);font-size:clamp(30.4px,2.9vw,44.8px);font-weight:500;line-height:1.2;color:#2c241a}
          .nv-mega-text{margin:16px 0 26px;max-width:260px;font-family:var(--font-body);font-size:15px;font-weight:300;line-height:1.7;color:#6a5f4f}
          .nv-mega-cta{display:inline-flex;align-items:center;gap:10px;padding:0 0 5px;font-family:var(--font-body);font-size:12px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#92703b;background:none;border:0;border-bottom:1px solid rgba(146,112,59,.55);cursor:pointer}
          .nv-mega-cta:hover{color:#2c241a;border-color:#2c241a}

          .nv-tiles{display:flex;flex-wrap:nowrap;gap:18px;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;padding-bottom:14px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#a98345 rgba(169,131,69,.18)}
          .nv-tiles::-webkit-scrollbar{height:6px}
          .nv-tiles::-webkit-scrollbar-track{background:rgba(169,131,69,.18);border-radius:6px}
          .nv-tiles::-webkit-scrollbar-thumb{background:#a98345;border-radius:6px}
          .nv-mega-cat > .nv-tiles{min-width:0}
          .nv-tile{position:relative;display:block;flex:0 0 220px;width:220px;aspect-ratio:3/4;overflow:hidden;background:#eadfc9;cursor:pointer;border:0;padding:0;text-align:left}
          .nv-tile img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.7,.2,1)}
          .nv-tile:hover img{transform:scale(1.08)}
          .nv-tile::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(13,10,6,.72) 0%,rgba(13,10,6,0) 55%);pointer-events:none}
          .nv-tile-label{position:absolute;z-index:1;left:16px;right:16px;bottom:14px;color:#fff8ea}
          .nv-tile-label b{display:block;font-family:var(--font-display);font-size:18.4px;font-weight:500;line-height:1.2}
          .nv-tile-label small{display:block;margin-top:4px;font-family:var(--font-body);font-size:12px;letter-spacing:.08em;color:#e6c37e}
          .nv-tile-flash{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:linear-gradient(150deg,#3a2c17,#a98345);color:#fff8ea;font-family:var(--font-display);font-size:20.8px}
          .nv-tile-flash::after{display:none}
          .nv-tile-flash small{font-family:var(--font-body);font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#f3dca6}
        `}</style>



          {/* Right icons */}
          <div className="nv-right flex items-center gap-0 sm:gap-1 min-w-0">
            <Link to="/nearby" className="nv-icon hidden lg:inline-flex" title="Jewellers near you"><FiMapPin /></Link>
            {/* Wishlist — customers and guests (guests are sent to login) */}
            {(!isAuthenticated || user?.role === 'user') && (
              <Link to="/my-account/wishlist" title="Wishlist" className="nv-icon hidden sm:inline-flex">
                <FiHeart />
                {wishlistCount > 0 && (
                  <span className="nv-count">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* Cart — shown to guests too (guest cart); hidden only for staff
                accounts (admin/courier). Opens the slide-out CartDrawer. */}
            {(!isAuthenticated || user?.role === 'user') && (
              <button onClick={toggleCart} title="Cart" className="nv-icon">
                <FiShoppingCart />
                {cartCount > 0 && (
                  <span className="nv-count">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 p-1 sm:p-2 rounded-xl transition-colors sm:ml-1 ${navDark ? 'hover:bg-white/10' : 'nv-account-btn'}`}>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                    {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className={`text-xs leading-none ${navDark ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>Hello,</p>
                    <p className={`text-sm font-semibold leading-tight max-w-20 truncate ${navDark ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>{user?.name?.split(' ')[0]}</p>
                  </div>
                  <FiChevronDown className="w-3.5 h-3.5 hidden xl:block text-[#8b6835]" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 w-52 z-50">
                      <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                      </div>
                      {(user?.role === 'superadmin'
                        ? [{ icon: FiShield, label: 'Super Admin Panel', path: '/superadmin' }]
                        : user?.role === 'admin'
                        ? [{ icon: FiShield, label: 'Admin Panel', path: '/admin' }]
                        : [
                            { icon: FiUser, label: 'My Account', path: '/my-account' },
                            { icon: FiStar, label: 'My Reviews', path: '/my-account/reviews' },
                            { icon: FiHeart, label: 'Wishlist', path: '/my-account/wishlist' },
                            { icon: FiMapPin, label: 'Jewellers Near Me', path: '/nearby' },
                            { icon: FiBriefcase, label: 'Sell With Us', path: '/seller/register' },
                          ]
                      ).map(item => (
                        <Link key={item.path} to={item.path} onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all">
                          <item.icon className="w-4 h-4" /> {item.label}
                        </Link>
                      ))}
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all w-full mt-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                        <FiLogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative hidden lg:block" onMouseEnter={() => setGuestMenuOpen(true)} onMouseLeave={() => setGuestMenuOpen(false)}>
                <Link to="/login" className="nv-icon" title="Login / Sign up"><FiUser /></Link>
                <AnimatePresence>
                  {guestMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }} className="nv-guest">
                      <p className="nv-guest-title">Welcome</p>
                      <p className="nv-guest-text">Log in to track orders, save your wishlist and get member offers.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Link to="/login" className="nv-guest-btn is-solid" onClick={() => setGuestMenuOpen(false)}>Log In</Link>
                        <Link to="/register" className="nv-guest-btn" onClick={() => setGuestMenuOpen(false)}>Sign Up</Link>
                      </div>
                      <div className="nv-guest-links">
                        <Link to="/nearby" onClick={() => setGuestMenuOpen(false)}><FiMapPin /> Jewellers near me</Link>
                        <Link to="/seller/register" onClick={() => setGuestMenuOpen(false)}><FiBriefcase /> Sell with us</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button onClick={() => setIsMobileOpen(!isMobileOpen)}
              className={`lg:hidden p-2 transition-colors ${navDark ? 'text-white/85 hover:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'}`}>
              {isMobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      </div>
      {/* ── chromeRef wrapper ends here — mobile menu & modal below are
             intentionally outside it, so opening the mobile menu doesn't
             blow up the measured height used for other pages' spacing ── */}

      {/* ─── Mobile Menu ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="nv-drawer lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden"
          >
            <div className="p-4">

              {/* Mobile Search */}
              <div ref={mobileSearchRef} className="relative mb-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitSearch(); }}
                    placeholder="Search shops, services, products..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 dark:bg-gray-800/60"
                  />
                </div>
                {(suggestCount > 0 || isSearching) && searchQuery && (
                  <div className="mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden max-h-80 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">Searching...</div>
                    ) : (
                      <>
                        {suggest.shops.length > 0 && (
                          <>
                            <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Shops & Services</p>
                            {suggest.shops.map(shop => (
                              <Link key={shop._id} to={`/business/${shop.shopSlug}`}
                                onClick={() => { setSearchQuery(''); setIsMobileOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {shop.logo
                                    ? <img src={shop.logo} alt={shop.shopName} className="w-full h-full object-cover" />
                                    : <FiShoppingBag className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">{shop.shopName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                    {[shop.category, shop.city || shop.district].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </>
                        )}

                        {suggest.products.length > 0 && (
                          <>
                            <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-t border-gray-100 dark:border-gray-800">Products</p>
                            {suggest.products.map(product => (
                              <Link key={product._id} to={`/product/${product._id}`}
                                onClick={() => { setSearchQuery(''); setIsMobileOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                <img src={product.images?.[0]} alt={product.name} className="w-9 h-9 object-cover rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-1">{product.name}</p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">₹{getEffectiveProductPrice(product)}</p>
                                </div>
                              </Link>
                            ))}
                          </>
                        )}

                        <button onClick={() => submitSearch('shops')}
                          className="block w-full text-center py-2.5 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-t border-gray-100 dark:border-gray-800">
                          See all results for "{searchQuery}" →
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Nav Links */}
              <div className="space-y-1">
                <Link to="/" onClick={() => setIsMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                  Home
                </Link>
                <Link to="/shop" onClick={() => setIsMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                  All Products
                </Link>

                {categories.map((cat) => (
                  <div key={cat.slug}>
                    {/* Category row */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navToShop(cat.slug)}
                        className="flex-1 text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                      >
                        {cat.name}
                      </button>
                      {cat.types?.length > 0 && (
                        <button
                          onClick={() => setMobileExpanded(mobileExpanded === cat.slug ? null : cat.slug)}
                          className="p-3 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <FiChevronDown className={`w-4 h-4 transition-transform ${mobileExpanded === cat.slug ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Subcategories */}
                    <AnimatePresence>
                      {mobileExpanded === cat.slug && cat.types?.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-1 py-2">
                            {cat.types.map(subType => (
                              <button
                                key={subType}
                                onClick={() => navToShop(cat.slug, subType)}
                                className="text-left text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:font-medium py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-all truncate"
                              >
                                {subType}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                <Link to="/shop?isFlashSale=true" onClick={() => setIsMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-bold text-blue-500 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2">
                  <FiZap className="w-4 h-4" /> Flash Sale
                </Link>

                <Link to="/blogs" onClick={() => setIsMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                  Blogs
                </Link>
                <Link to="/contact" onClick={() => setIsMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                  <FiMail className="inline w-4 h-4 mr-2" />Contact
                </Link>

                {!isAuthenticated && (
                  <Link to="/login" onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center bg-blue-600 text-white font-bold py-3 rounded-xl mt-3 hover:bg-blue-700 transition-colors">
                    Login
                  </Link>
                )}

                {/* More links — mobile */}
                <div className="border-t border-gray-100 dark:border-gray-800 mt-3 pt-3">
                  <p className="px-4 pb-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">More</p>
                  {moreMenuItems.map(item => (
                    <button
                      key={item.label}
                      onClick={() => { navigate(item.path); setIsMobileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-left"
                    >
                      <item.icon className="w-4 h-4" /> {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </header>

    {/* ─── Auto spacer ─────────────────────────────────────────────────
        Pushes page content down by the header's REAL measured height, so
        it can never get cut off — no more guessing pt-24 / pt-[104px]. Now
        applies on every route including Home, since the navbar is always
        solid rather than floating transparently over the hero. */}
    <div style={{ height: 'var(--navbar-height, 96px)' }} />
    </>
  );
}