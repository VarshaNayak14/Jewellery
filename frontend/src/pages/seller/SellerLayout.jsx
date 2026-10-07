import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiPackage, FiShoppingBag, FiSettings, FiUser, FiLogOut,
  FiMenu, FiX, FiBox, FiStar, FiPhoneCall, FiBell, FiTrendingUp, FiHome,
  FiChevronDown, FiFeather, FiShield, FiRefreshCw, FiTag, FiTruck, FiDollarSign, FiCreditCard, FiHeadphones, FiMessageSquare
} from 'react-icons/fi';
import { useSellerStore } from '../../store/sellerStore';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../../components/common/BrandLogo';
import NotificationBell from '../../components/common/NotificationBell';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const NAV_ITEMS = [
  { to: '/seller/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/seller/plan', icon: FiCreditCard, label: 'My Plan' },
  { to: '/seller/products', icon: FiPackage, label: 'My Products' },
  { to: '/seller/inventory', icon: FiBox, label: 'Inventory' },
  { to: '/seller/orders', icon: FiShoppingBag, label: 'Orders' },
  { to: '/seller/earnings', icon: FiDollarSign, label: 'Earnings & Referrals' },
  { to: '/seller/couriers', icon: FiTruck, label: 'Couriers' },
  { to: '/seller/returns', icon: FiRefreshCw, label: 'Returns' },
  { to: '/seller/reviews', icon: FiStar, label: 'Reviews' },
  { to: '/seller/offers', icon: FiTag, label: 'Festival & Homepage Offers' },
  { to: '/seller/analytics', icon: FiTrendingUp, label: 'Growth & Analytics' },
  { to: '/seller/kyc', icon: FiShield, label: 'KYC Verification' },
  { to: '/seller/customize', icon: FiFeather, label: 'Customize Store' },
  { to: '/seller/settings', icon: FiSettings, label: 'Shop Settings' },
  { to: '/seller/customer-tickets', icon: FiMessageSquare, label: 'Customer Tickets' },
  { to: '/seller/support', icon: FiHeadphones, label: 'Help & Support' },
];

/* ─────────────────────────  Top Bar  ───────────────────────── */
function SellerTopBar({ onMenuClick }) {
  const { seller, sellerUser, logout } = useSellerStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    const handler = (e) => { if (!profileRef.current?.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/seller/login'); };
  // Same pick as the storefront navbar: theme-matching logo first, plain logo as fallback.
  const sellerLogo = seller?.[isDark ? 'darkLogo' : 'lightLogo'] || seller?.logo;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-blue-600 flex items-center justify-between px-4 sm:px-6 z-40 shadow-md">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-white p-1.5 -ml-1.5">
          <FiMenu className="w-6 h-6" />
        </button>
        <Link to="/seller/dashboard" className="flex items-center gap-2.5">
          {sellerLogo ? (
            <img src={sellerLogo} alt={seller?.shopName} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <BrandLogo sizeClass="h-9" className="flex-shrink-0" />
          )}
          <p className="hidden sm:block text-white font-bold text-base truncate max-w-[200px]">{seller?.shopName || 'My Shop'}</p>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher dark />
        <NotificationBell dark={true} />

        <div ref={profileRef} className="relative ml-1">
          <button onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
            {(sellerUser?.avatar || sellerLogo) ? (
              <img src={sellerUser?.avatar || sellerLogo} alt={seller?.shopName} className="w-8 h-8 rounded-full object-cover border-2 border-white/40" />
            ) : (
              <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {seller?.shopName?.charAt(0) || 'S'}
              </div>
            )}
            <span className="hidden md:block text-white text-sm font-semibold max-w-28 truncate">{seller?.shopName || 'My Shop'}</span>
            <FiChevronDown className={`hidden md:block w-3.5 h-3.5 text-blue-200 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-56 py-2 z-50">
                <div className="px-4 py-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{seller?.shopName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{sellerUser?.email}</p>
                </div>
                <Link to="/seller/profile" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors">
                  <FiUser className="w-4 h-4" /> My Profile
                </Link>
                <Link to="/" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors">
                  <FiHome className="w-4 h-4" /> View Store
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-gray-100 dark:border-gray-800 mt-1 pt-2.5">
                  <FiLogOut className="w-4 h-4" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────  Sidebar  ───────────────────────── */
export function SellerNav({ onNavigate }) {
  const location = useLocation();

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 flex flex-col fixed left-0 top-16 z-30 border-r border-gray-100 dark:border-gray-800 overflow-y-auto">
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                active
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'
              }`}>
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />}
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}

/* ─────────────────────────  Layout Shell  ───────────────────────── */
export default function SellerLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SellerTopBar onMenuClick={() => setMobileOpen(true)} />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SellerNav />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 lg:hidden bg-white dark:bg-gray-900">
              <div className="h-16 bg-blue-600 flex items-center justify-between px-4">
                <span className="text-white font-bold">Seller Hub</span>
                <button onClick={() => setMobileOpen(false)} className="text-white p-1.5">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="h-[calc(100%-4rem)] overflow-y-auto">
                <nav className="p-3 space-y-0.5">
                  {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-all">
                      <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                    </Link>
                  ))}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="pt-16 lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}