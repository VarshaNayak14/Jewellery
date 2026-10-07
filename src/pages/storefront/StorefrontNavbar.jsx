import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHeart, FiSearch, FiMenu, FiX, FiChevronDown, FiShoppingCart, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import { getMainSiteUrl } from '../../utils/subdomain';
import BrandLogo from '../../components/common/BrandLogo';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

// Storefront navbar with a category mega-menu built from this seller's own
// products (grouped by category -> subCategory), so it adapts to whatever
// the seller actually sells instead of the marketplace's global categories.
export default function StorefrontNavbar({ seller, categories, accent, search, onSearch, onCategorySelect, basePath = '' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMega, setActiveMega] = useState(null);
  const [searchInput, setSearchInput] = useState(search || '');
  const megaTimer = useRef(null);
  const location = useLocation();

  const { isAuthenticated, user } = useAuthStore();
  const { isDark } = useTheme();
  const { wishlist } = useWishlistStore();
  const { cart, toggleCart, fetchCart } = useCartStore();

  const wishlistCount = wishlist?.products?.length || 0;
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const sellerLogo = seller?.[isDark ? 'darkLogo' : 'lightLogo'] || seller?.logo;

  // Guests have a browser-only cart too; fetchCart() loads it (or the account
  // cart, merging guest items, once logged in).
  useEffect(() => { fetchCart(); }, [isAuthenticated]);

  const handleCartClick = () => toggleCart();

  useEffect(() => setSearchInput(search || ''), [search]);

  const submitSearch = (e) => {
    e.preventDefault();
    onSearch(searchInput);
    setMobileOpen(false);
  };

  const openMega = (name) => { clearTimeout(megaTimer.current); setActiveMega(name); };
  const closeMegaDelayed = () => { megaTimer.current = setTimeout(() => setActiveMega(null), 150); };

  const showAllProducts = () => onCategorySelect();
  const loginReturnTo = { pathname: location.pathname, search: location.search };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 shadow-sm dark:shadow-black/40">
      <div className="h-1" style={{ background: accent }} />
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <a href={getMainSiteUrl()} onClick={(e) => e.stopPropagation()} className="flex items-center flex-shrink-0" title="Jewellery">
              <BrandLogo sizeClass="h-12 sm:h-16" />
            </a>
            <span className="h-9 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <Link to={basePath || '/'} className="flex items-center gap-3 min-w-0">
              {sellerLogo ? (
                <img src={sellerLogo} alt={seller.shopName} className="h-9 w-auto object-contain flex-shrink-0" />
              ) : (
                <span className="w-9 h-9 rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-white" style={{ background: accent }}>
                  {seller?.shopName?.charAt(0) || 'S'}
                </span>
              )}
              <span className="font-bold text-gray-900 dark:text-gray-100 truncate hidden sm:block">{seller?.shopName || 'Store'}</span>
            </Link>
          </div>

          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-md relative">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search in ${seller?.shopName || 'store'}...`}
              className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:border-gray-400 dark:focus:border-gray-500"
            />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: accent }}>
              <FiSearch className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSwitcher />
            {isAuthenticated && user?.role === 'user' && (
              <Link to={`${basePath}/wishlist`} title="Wishlist" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
                <FiHeart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center" style={{ background: accent }}>{wishlistCount}</span>
                )}
              </Link>
            )}
            <Link
              to={isAuthenticated ? `${basePath}/my-account` : `${basePath}/login`}
              state={!isAuthenticated ? { from: loginReturnTo } : undefined}
              title={isAuthenticated ? 'My account' : 'Customer login'}
              className={isAuthenticated
                ? 'hidden sm:inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors'
                : 'hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors'}
            >
              {!isAuthenticated && <FiUser className="w-4 h-4" />}
              {isAuthenticated ? 'My Account' : 'Login'}
            </Link>
            <button onClick={handleCartClick} title="Cart" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
              <FiShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center" style={{ background: accent }}>{cartCount}</span>
              )}
            </button>
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
              <FiMenu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {categories.length > 0 && (
            <nav className="hidden md:flex items-center border-t border-gray-100 dark:border-gray-800">
            <button onClick={showAllProducts} className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">All Products</button>
            {categories.map((cat) => (
              <div key={cat.name} className="relative" onMouseEnter={() => openMega(cat.name)} onMouseLeave={closeMegaDelayed}>
                <button
                  onClick={() => onCategorySelect(cat.name)}
                  className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 capitalize"
                >
                  {cat.name} {cat.subCategories.length > 0 && <FiChevronDown className="w-3 h-3" />}
                </button>
                {activeMega === cat.name && cat.subCategories.length > 0 && (
                  <div className="absolute left-0 top-full bg-white dark:bg-gray-900 shadow-xl rounded-xl border border-gray-100 dark:border-gray-800 py-3 px-4 min-w-[200px] z-50">
                    {cat.subCategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => { onCategorySelect(cat.name, sub); setActiveMega(null); }}
                        className="block w-full text-left px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-900 dark:text-gray-100">{seller?.shopName}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={submitSearch} className="mb-4">
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search..."
                className="w-full px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
            </form>
            <div className="space-y-1">
              <button onClick={() => { showAllProducts(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">All Products</button>
              {categories.map((cat) => (
                <div key={cat.name}>
                  <button onClick={() => { onCategorySelect(cat.name); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 capitalize">{cat.name}</button>
                  {cat.subCategories.map((sub) => (
                    <button key={sub} onClick={() => { onCategorySelect(cat.name, sub); setMobileOpen(false); }} className="block w-full text-left px-6 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{sub}</button>
                  ))}
                </div>
              ))}
              <Link
                to={isAuthenticated ? `${basePath}/my-account` : `${basePath}/login`}
                state={!isAuthenticated ? { from: loginReturnTo } : undefined}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >{isAuthenticated ? 'My Account' : 'Login'}</Link>
              <button onClick={() => { setMobileOpen(false); handleCartClick(); }} className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                <span>Cart</span>
                {cartCount > 0 && <span className="text-xs text-white rounded-full px-2 py-0.5" style={{ background: accent }}>{cartCount}</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}