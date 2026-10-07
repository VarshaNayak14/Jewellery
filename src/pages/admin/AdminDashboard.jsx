import { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiShoppingBag, FiPackage, FiUsers, FiTruck, FiTag,
  FiDollarSign, FiRefreshCw, FiStar, FiBell, FiSettings,
  FiLogOut, FiChevronRight, FiChevronLeft, FiTrendingUp, FiTrendingDown,
  FiArrowRight, FiAlertCircle, FiCheckCircle, FiClock, FiBarChart2, FiShield, FiBox, FiCreditCard,
  FiHome, FiFileText, FiMenu, FiX, FiImage, FiUser, FiHeadphones, FiMessageSquare
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import BrandLogo from '../../components/common/BrandLogo';
import NotificationBell from '../../components/common/NotificationBell';
import { formatPrice, formatDateShort } from '../../utils/helpers';

// Fixed palette cycled by index for pie/donut slices — keeps colors consistent
// and theme-neutral across light/dark.
const PIE_COLORS = ['#a98345', '#10b981', '#f59e0b', '#ef4444', '#7a1f45', '#06b6d4'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatMonthLabel = (m) => `${MONTH_LABELS[(m?.month || 1) - 1]} '${String(m?.year ?? '').slice(-2)}`;

// ─── Layout constants (keep these in sync!) ───────────────────────────────────
// Sidebar width and the main content's left margin MUST match, or you'll get
// either an overlap or an empty gap on large screens.
const SIDEBAR_WIDTH = 'w-[85vw] sm:w-72';       // responsive mobile drawer width + desktop width
const CONTENT_MARGIN = 'lg:ml-72';  // must equal SIDEBAR_WIDTH
const SIDEBAR_WIDTH_COLLAPSED = 'w-20';       // 5rem / 80px, icon-only rail
const CONTENT_MARGIN_COLLAPSED = 'lg:ml-20';  // must equal SIDEBAR_WIDTH_COLLAPSED

// ─── Sidebar Nav Config ───────────────────────────────────────────────────────
// `key` matches a Super Admin permission grant (see AVAILABLE_PERMISSIONS in
// superAdminController.js). Items without a `key` are always visible to any admin.
const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/admin', icon: FiGrid, label: 'Dashboard', exact: true, key: 'dashboard' },
      { to: '/admin/orders', icon: FiTruck, label: 'Orders', key: 'orders' },
      { to: '/admin/couriers', icon: FiTruck, label: 'Couriers', key: 'orders' },
      { to: '/admin/products', icon: FiShoppingBag, label: 'Products', key: 'products' },
      { to: '/admin/inventory', icon: FiBox, label: 'Inventory', key: 'inventory' },
      { to: '/admin/users', icon: FiUsers, label: 'Users', key: 'users' },
    ],
  },
  {
    label: 'Sellers',
    items: [
      { to: '/admin/sellers', icon: FiBarChart2, label: 'Sellers', key: 'sellers' },
      { to: '/admin/kyc', icon: FiShield, label: 'KYC Management', key: 'kyc' },
      { to: '/admin/withdrawals', icon: FiCreditCard, label: 'Withdrawals', key: 'sellers' },
      { to: '/admin/subscription-payments', icon: FiCreditCard, label: 'Subscription Payments', key: 'subscriptions' },
      { to: '/admin/support', icon: FiHeadphones, label: 'Seller Support', key: 'support' },
      { to: '/admin/customer-tickets', icon: FiMessageSquare, label: 'Customer Tickets', key: 'support' },
      { to: '/admin/whatsapp', icon: FaWhatsapp, label: 'WhatsApp Enquiries', key: 'support' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/metal-rates', icon: FiTrendingUp, label: 'Gold & Metal Rates', key: 'rates' },
      { to: '/admin/categories', icon: FiTag, label: 'Categories', key: 'categories' },
      { to: '/admin/reviews', icon: FiStar, label: 'Reviews', key: 'reviews' },
      { to: '/admin/offers', icon: FiImage, label: 'Festival & Homepage Offers', key: 'offers' },
      { to: '/admin/blogs', icon: FiFileText, label: 'Blogs', key: 'blogs' },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/admin/returns', icon: FiRefreshCw, label: 'Returns', key: 'returns' },
      { to: '/admin/reports', icon: FiFileText, label: 'Reports', key: 'reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', icon: FiSettings, label: 'Settings', key: 'settings' },
      { to: '/admin/profile', icon: FiUser, label: 'My Profile' },
      { to: '/', icon: FiHome, label: 'View Store' },
    ],
  },
];

// ─── Shared AdminNav ──────────────────────────────────────────────────────────
export const AdminNav = ({ onMobileClose, collapsed = false, onToggleCollapse }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  // Super Admin always sees every module; a regular admin only sees what the
  // Super Admin has granted them (Super Admin > Admins > permissions).
  const canAccess = (item) => user?.role === 'superadmin' || !item.key || user?.permissions?.includes(item.key);
  const visibleGroups = NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(canAccess) }))
    .filter(group => group.items.length > 0);

  return (
    <aside
      className={`${collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH} max-w-[85vw] h-[100dvh] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col fixed left-0 top-0 z-40 shadow-sm overflow-hidden transition-[width] duration-300 ease-in-out`}
    >
      {/* Logo */}
      <div className={`px-3 sm:px-4 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 flex items-center shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
         
          {!collapsed && (
            <div className="min-w-0">
              <BrandLogo sizeClass="h-12" />
               <p className="text-xs text-gray-400 dark:text-gray-500">Admin Panel</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile close (X) */}
            {onMobileClose && (
              <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close menu">
                <FiX className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {/* Collapse toggle — sits to the right of the X */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <FiChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center mx-auto mt-2 mb-1 w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <FiChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 min-h-0">
        {visibleGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = item.exact
                  ? location.pathname === item.to
                  : location.pathname === item.to ||
                    (item.to !== '/admin' && item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && active && <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <Link to="/admin/profile" onClick={onMobileClose} title="My Profile"
          className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 mb-2 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Administrator</p>
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-medium ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <FiLogOut className="w-4 h-4" /> {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
};

// ─── Mobile drawer wrapper (shared by every admin page) ──────────────────────
const MobileSidebar = ({ open, onClose, collapsed, onToggleCollapse }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
        <motion.div
          initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed left-0 top-0 z-40 lg:hidden"
        >
          <AdminNav onMobileClose={onClose} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── Page Wrapper (use in every admin page) ───────────────────────────────────
export const AdminPageWrapper = ({ children, title, subtitle, actions }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed(c => !c);
  return (
    <div className="flex min-h-[100dvh] bg-slate-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminNav collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <main className={`${collapsed ? CONTENT_MARGIN_COLLAPSED : CONTENT_MARGIN} transition-[margin] duration-300 ease-in-out flex-1 flex flex-col min-h-[100dvh] w-full min-w-0 overflow-x-hidden`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <FiX className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <FiMenu className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <NotificationBell />
            {actions}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, change, color, prefix = '', suffix = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow min-w-0"
  >
    <div className="flex items-start justify-between mb-4 gap-2">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      {change !== undefined && (
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
          change >= 0 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
        }`}>
          {change >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
      {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : (value ?? '—')}{suffix}
    </p>
    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium truncate">{title}</p>
  </motion.div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore();
  const canAccess = (item) => user?.role === 'superadmin' || !item.key || user?.permissions?.includes(item.key);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboardStats()
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const revenueChart = (data?.revenueByMonth || []).map(m => ({
    label: formatMonthLabel(m._id),
    revenue: m.revenue || 0,
  }));
  const statusChart = (data?.sellersByStatus || []).map(s => ({
    name: s._id || 'Unknown',
    value: s.count || 0,
  }));

  return (
    <AdminPageWrapper title="Dashboard" subtitle="Welcome back! Here's what's happening.">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 sm:h-32 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards — revenue is subscription-based (connect-only model, no orders) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard title="Subscription Revenue" value={stats.currentRevenue} prefix="₹"
              icon={FiDollarSign} change={stats.revenueGrowth}
              color="bg-red-100 text-red-600" />
            <StatCard title="Total Sellers" value={stats.totalSellers}
              icon={FiBarChart2} change={stats.sellerGrowth}
              color="bg-blue-100 text-blue-600" />
            <StatCard title="Total Customers" value={stats.totalUsers}
              icon={FiUsers}
              color="bg-emerald-100 text-emerald-600" />
            <StatCard title="Total Products" value={stats.totalProducts}
              icon={FiShoppingBag}
              color="bg-amber-100 text-amber-600" />
            <StatCard title="Pending Sellers" value={stats.pendingSellers}
              icon={FiAlertCircle}
              color="bg-red-100 text-red-600" />
            <StatCard title="New Sellers This Month" value={stats.newSellersThisMonth}
              icon={FiTrendingUp}
              color="bg-teal-100 text-teal-600" />
            <StatCard title="Low Stock Products" value={stats.lowStockProducts}
              icon={FiClock}
              color="bg-indigo-100 text-indigo-600" />
          </div>

          {/* Revenue chart + Quick actions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mb-5">
            {/* Revenue chart */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">Revenue Overview</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last 12 months</p>
                </div>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full w-fit">
                  ₹{(stats.totalRevenue || 0).toLocaleString('en-IN')} total
                </span>
              </div>
              {revenueChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminRevenueTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a98345" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#a98345" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#a98345" strokeWidth={2} fill="url(#adminRevenueTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-16 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">No revenue data yet</div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { to: '/admin/sellers?status=pending', label: 'Seller Requests', count: stats.pendingSellers, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10', key: 'sellers' },
                  { to: '/admin/kyc?status=pending', label: 'Pending KYC', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10', key: 'kyc' },
                  { to: '/admin/inventory?stockStatus=low', label: 'Low Stock Products', count: stats.lowStockProducts, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10', key: 'inventory' },
                ].filter(canAccess).map(qa => (
                  <Link key={qa.to} to={qa.to}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{qa.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {qa.count > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qa.color}`}>
                          {qa.count}
                        </span>
                      )}
                      <FiChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Subscription Payments + Sellers by Status */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
            {/* Recent Subscription Payments */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-w-0">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between gap-2">
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Recent Subscription Payments</h2>
                <Link to="/admin/subscription-payments" className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1 font-medium shrink-0">
                  View all <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {(data?.recentPayments || []).length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No payments yet</div>
                ) : (data?.recentPayments || []).map(payment => (
                  <div key={payment._id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{payment.seller?.shopName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{payment.planName} plan</p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{payment.amount?.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateShort(payment.purchasedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sellers by Status */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-w-0">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between gap-2">
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Sellers by Status</h2>
                <Link to="/admin/sellers" className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1 font-medium shrink-0">
                  View all <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {statusChart.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No sellers yet</div>
              ) : (
                <>
                  <div className="px-4 sm:px-5 pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                          {statusChart.map((entry, i) => (
                            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {statusChart.map((s, i) => (
                      <div key={s.name} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {s.name}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </AdminPageWrapper>
  );
}