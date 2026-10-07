import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiStar, FiHeart, FiHelpCircle,
  FiBell, FiShield, FiChevronRight, FiLogOut, FiHome, FiPackage, FiTruck, FiRefreshCw, FiCreditCard, FiMessageSquare
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { orderAPI, walletAPI, wishlistAPI, reviewAPI, returnAPI } from '../../services/api';
import { formatPrice, getOrderDisplayAmount } from '../../utils/helpers';
import MyProfile from './MyProfile';
import MyReviews from './MyReviews';
import MyWishlist from './MyWishlist';
import HelpCenter from './HelpCenter';
import MyTickets from './MyTickets';
import SecuritySettings from './SecuritySettings';
import MyOrders from './MyOrders';
import MyReturns from './MyReturns';
import MyWallet from './MyWallet';
import OrderTracking from './OrderTracking';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiHome },
  { key: 'orders', label: 'My Orders', icon: FiPackage },
  { key: 'tracking', label: 'Track Order', icon: FiTruck },
  { key: 'returns', label: 'Returns', icon: FiRefreshCw },
  { key: 'wallet', label: 'Wallet', icon: FiCreditCard },
  { key: 'reviews', label: 'My Reviews', icon: FiStar },
  { key: 'wishlist', label: 'Wishlist', icon: FiHeart },
  { key: 'profile', label: 'My Profile', icon: FiUser },
  { key: 'tickets', label: 'Support Tickets', icon: FiMessageSquare },
  { key: 'help', label: 'Help Center', icon: FiHelpCircle },
  { key: 'security', label: 'Security Settings', icon: FiShield },
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  confirmed: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  packed: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  shipped: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  in_transit: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  out_for_delivery: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  delivered: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  returned: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  refunded: 'bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
};
const DONE_STATUSES = ['delivered', 'cancelled', 'returned', 'refunded'];
const CLOSED_RETURN_STATUSES = ['rejected', 'refund_completed'];

function Dashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Each source loads independently — one failing API mustn't blank the page.
    Promise.allSettled([
      orderAPI.getMyOrders({ limit: 100 }),
      walletAPI.get(),
      wishlistAPI.get(),
      reviewAPI.getMyReviews(),
      returnAPI.getMyReturns(),
    ]).then(([o, w, wl, r, rt]) => {
      const val = (x) => (x.status === 'fulfilled' && x.value ? x.value : {});
      const wishlist = val(wl).wishlist || val(wl);
      setData({
        orders: val(o).orders || [],
        balance: val(w).wallet?.balance || 0,
        wishlistCount: wishlist?.products?.length || 0,
        reviewCount: (val(r).reviews || []).length,
        returns: val(rt).returns || [],
      });
    });
  }, []);

  const orders = data?.orders || [];
  const activeOrders = orders.filter(o => !DONE_STATUSES.includes(o.status));
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const spent = orders
    .filter(o => !['cancelled', 'refunded'].includes(o.status))
    .reduce((sum, o) => sum + (Number(getOrderDisplayAmount(o)) || 0), 0);
  const openReturns = (data?.returns || []).filter(r => !CLOSED_RETURN_STATUSES.includes(r.status)).length;

  const stats = [
    { label: 'Total Orders', value: orders.length, sub: `${deliveredCount} delivered`, icon: FiPackage, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', to: 'orders' },
    { label: 'Active Orders', value: activeOrders.length, sub: 'On the way', icon: FiTruck, tone: 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400', to: 'tracking' },
    { label: 'Wallet Balance', value: formatPrice(data?.balance || 0), sub: 'Use at checkout', icon: FiCreditCard, tone: 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400', to: 'wallet' },
    { label: 'Wishlist', value: data?.wishlistCount || 0, sub: 'Saved items', icon: FiHeart, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400', to: 'wishlist' },
    { label: 'My Reviews', value: data?.reviewCount || 0, sub: 'Written', icon: FiStar, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', to: 'reviews' },
    { label: 'Returns', value: openReturns, sub: 'In progress', icon: FiRefreshCw, tone: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400', to: 'returns' },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-3xl p-5 sm:p-7 text-white bg-[linear-gradient(100deg,rgba(26,18,9,0.94),rgba(26,18,9,0.75)_55%,rgba(66,12,36,0.7)),url('/jewelry/necklace.jpg')] bg-cover bg-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : user?.name?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold break-words">{user?.name}</h2>
            <p className="text-[#e8d6b4] text-sm break-all">{user?.email}</p>
            <p className="text-[#c9b48c] text-xs mt-1">Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[#e6c37e] text-xs uppercase tracking-[0.2em]">Total spent</p>
            <p className="text-2xl font-bold">{data ? formatPrice(spent) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {stats.map(({ label, value, sub, icon: Icon, tone, to }) => (
          <button key={label} onClick={() => onNavigate(to)}
            className="text-left bg-white dark:bg-gray-900 rounded-2xl border border-blue-100 dark:border-gray-800 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-gray-700 transition-all">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tone}`}><Icon className="w-4 h-4" /></div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{data ? value : '—'}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
          </button>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-blue-100 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-blue-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Orders</h3>
          {orders.length > 0 && (
            <button onClick={() => onNavigate('orders')} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all <FiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {!data ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <FiPackage className="w-10 h-10 mx-auto text-blue-200 dark:text-gray-700 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">You haven&apos;t placed any orders yet.</p>
            <Link to="/shop" className="inline-block px-5 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800">Start shopping</Link>
          </div>
        ) : (
          <ul className="divide-y divide-blue-50 dark:divide-gray-800">
            {orders.slice(0, 5).map(order => {
              const first = order.items?.[0];
              const more = (order.items?.length || 0) - 1;
              return (
                <li key={order._id}>
                  <button onClick={() => onNavigate('orders')} className="w-full flex items-center gap-3 p-4 text-left hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                      {first?.image && <img src={first.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {first?.name || 'Order'}{more > 0 ? ` +${more} more` : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        #{order.orderNumber || order._id.slice(-6)} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(getOrderDisplayAmount(order))}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.returned}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Track Order', icon: FiTruck, to: 'tracking' },
          { label: 'Edit Profile', icon: FiUser, to: 'profile' },
          { label: 'Security', icon: FiShield, to: 'security' },
          { label: 'Help Center', icon: FiHelpCircle, to: 'help' },
        ].map(({ label, icon: Icon, to }) => (
          <button key={to} onClick={() => onNavigate(to)}
            className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 text-sm font-medium text-blue-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors">
            <Icon className="w-4 h-4 shrink-0" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MyAccount({ basePath = '' }) {
  const { section } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [active, setActive] = useState(section || 'dashboard');
  const accountBasePath = basePath === '/' ? '' : basePath;

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  const handleNav = (key) => {
    setActive(key);
    navigate(`${accountBasePath}/my-account/${key}`);
  };

  const handleLogout = () => {
    logout();
    navigate(accountBasePath || '/');
    toast.success('Logged out!');
  };

  const renderContent = () => {
    switch (active) {
      case 'reviews': return <MyReviews />;
      case 'orders': return <MyOrders basePath={accountBasePath} />;
      case 'tracking': return <OrderTracking />;
      case 'returns': return <MyReturns />;
      case 'wallet': return <MyWallet />;
      case 'wishlist': return <MyWishlist />;
      case 'profile': return <MyProfile />;
      case 'tickets': return <MyTickets />;
      case 'help': return <HelpCenter />;
      case 'security': return <SecuritySettings />;
      default: return <Dashboard user={user} onNavigate={handleNav} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6ee] dark:bg-[#15110d] pt-20 sm:pt-20 lg:pt-32">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-24 self-start">
            <div className="bg-[#fffdf8] dark:bg-[#1e1913] rounded-3xl shadow-sm border border-blue-100 dark:border-[rgba(218,190,138,0.15)] overflow-hidden">
              <div className="p-4 border-b border-blue-100 dark:border-gray-800 bg-[linear-gradient(100deg,#1a1209,#3d0c24)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                    {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{user?.name}</p>
                    <p className="text-[#e6c37e] text-xs">My Account</p>
                  </div>
                </div>
              </div>
              <nav className="p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {MENU_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} onClick={() => handleNav(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                        active === item.key ? 'bg-[#a98345] text-white shadow-sm' : 'text-blue-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                      {active === item.key && <FiChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                  );
                })}
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors mt-1 border-t border-blue-100 dark:border-gray-800 pt-4 col-span-2 sm:col-span-3 lg:col-span-1">
                  <FiLogOut className="w-4 h-4" /> Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
