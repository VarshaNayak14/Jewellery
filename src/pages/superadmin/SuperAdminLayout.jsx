import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiUserCheck, FiLogOut, FiMenu, FiX, FiHome, FiShield,
  FiTag, FiShoppingBag, FiSettings, FiCreditCard, FiTrendingUp,
  FiPackage, FiUsers, FiStar, FiFileText, FiBox, FiDollarSign, FiImage, FiTruck, FiBell, FiUser, FiHeadphones, FiMessageSquare, FiMail,
} from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import NotificationBell from '../../components/common/NotificationBell';

const SIDEBAR_WIDTH = 'w-[85vw] sm:w-72';
const CONTENT_MARGIN = 'lg:ml-72';

// Every item here reuses the exact same Admin Panel screen (via the `Wrapper`
// prop each page now accepts) so Super Admin gets full control of every
// module without ever leaving the Super Admin shell — no jump to /admin/*.
const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/superadmin', icon: FiGrid, label: 'Dashboard', exact: true },
      { to: '/superadmin/admins', icon: FiUserCheck, label: 'Admin Management' },
      { to: '/superadmin/plans', icon: FiCreditCard, label: 'Subscription Plans' },
      { to: '/superadmin/subscription-payments', icon: FiDollarSign, label: 'Subscription Payments' },
    ],
  },
  {
    label: 'Catalog & Sales',
    items: [
      { to: '/superadmin/metal-rates', icon: FiTrendingUp, label: 'Gold & Metal Rates' },
      { to: '/superadmin/categories', icon: FiTag, label: 'Category Management' },
      { to: '/superadmin/products', icon: FiPackage, label: 'Product Management' },
      { to: '/superadmin/inventory', icon: FiBox, label: 'Inventory Management' },
      { to: '/superadmin/reviews', icon: FiStar, label: 'Reviews & Ratings' },
      { to: '/superadmin/offers', icon: FiImage, label: 'Festival & Homepage Offers' },
      { to: '/superadmin/blogs', icon: FiFileText, label: 'Blogs' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/superadmin/orders', icon: FiPackage, label: 'Orders' },
      { to: '/superadmin/couriers', icon: FiTruck, label: 'Couriers' },
      { to: '/superadmin/users', icon: FiUsers, label: 'Customer Management' },
      { to: '/superadmin/sellers', icon: FiShoppingBag, label: 'Seller Management' },
      { to: '/superadmin/support', icon: FiHeadphones, label: 'Seller Support' },
      { to: '/superadmin/contact-messages', icon: FiMail, label: 'Contact Messages' },
      { to: '/superadmin/customer-tickets', icon: FiMessageSquare, label: 'Customer Tickets' },
      { to: '/superadmin/whatsapp', icon: FaWhatsapp, label: 'WhatsApp Enquiries' },
      { to: '/superadmin/kyc', icon: FiShield, label: 'KYC Management' },
      { to: '/superadmin/withdrawals', icon: FiDollarSign, label: 'Withdrawals' },
    ],
  },
  {
    label: 'Finance & Insights',
    items: [
      { to: '/superadmin/payment-settings', icon: FiCreditCard, label: 'Payment Settings' },
      { to: '/superadmin/reports', icon: FiFileText, label: 'Reports & Analytics' },
    ],
  },
  {
    label: 'Support & Operations',
    items: [
      { to: '/superadmin/returns', icon: FiBell, label: 'Returns & Refunds' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/superadmin/settings', icon: FiSettings, label: 'Global Settings' },
      { to: '/superadmin/profile', icon: FiUser, label: 'My Profile' },
    ],
  },
];

export const SuperAdminNav = ({ onMobileClose }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside className={`${SIDEBAR_WIDTH} max-w-[85vw] h-[100dvh] bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-40 shadow-sm overflow-hidden`}>
      <div className="px-4 py-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <FiShield className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Fine Jewellery</p>
            <p className="text-xs text-slate-400">Super Admin</p>
          </div>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800">
            <FiX className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 min-h-0">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onMobileClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <FiHome className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 truncate">View Store</span>
        </Link>
      </nav>

      <div className="px-3 py-4 border-t border-slate-800 shrink-0">
        <Link to="/superadmin/profile" onClick={onMobileClose} title="My Profile"
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 mb-2">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400">Super Administrator</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium"
        >
          <FiLogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
};

const MobileSidebar = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
        <motion.div
          initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed left-0 top-0 z-40 lg:hidden"
        >
          <SuperAdminNav onMobileClose={onClose} />
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const SuperAdminPageWrapper = ({ children, title, subtitle, actions }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0b1120] transition-colors duration-200">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SuperAdminNav />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className={`${CONTENT_MARGIN} min-w-0 overflow-x-hidden`}>
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
        <header className="sticky top-0 z-20 mb-4 rounded-2xl border border-gray-200/80 bg-white/80 dark:border-gray-800 dark:bg-[#111827]/90 backdrop-blur-sm px-4 py-3 shadow-sm sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? <FiX className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <FiMenu className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <NotificationBell />
              {actions}
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
          {children}
        </div>
      </div>
      </main>
    </div>
  );
};