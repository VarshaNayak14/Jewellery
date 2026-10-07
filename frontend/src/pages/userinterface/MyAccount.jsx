import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiStar, FiHeart, FiHelpCircle,
  FiBell, FiShield, FiChevronRight, FiLogOut, FiHome
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import MyProfile from './MyProfile';
import MyReviews from './MyReviews';
import MyWishlist from './MyWishlist';
import MyNotifications from './MyNotifications';
import HelpCenter from './HelpCenter';
import SecuritySettings from './SecuritySettings';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiHome },
  { key: 'reviews', label: 'My Reviews', icon: FiStar },
  { key: 'wishlist', label: 'Wishlist', icon: FiHeart },
  { key: 'profile', label: 'My Profile', icon: FiUser },
  { key: 'notifications', label: 'Notifications', icon: FiBell },
  { key: 'help', label: 'Help Center', icon: FiHelpCircle },
  { key: 'security', label: 'Security Settings', icon: FiShield },
];

function Dashboard({ user }) {
  return (
    <div>
      {/* Profile Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-4 sm:p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : user?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold break-words">{user?.name}</h2>
            <p className="text-blue-300 text-sm break-all">{user?.email}</p>
            <p className="text-blue-400 text-xs mt-1">Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 p-6 text-center text-blue-500 text-sm">
        Browse businesses, save your favourites to Wishlist, and reach out directly by call or WhatsApp — no account needed to contact a business.
      </div>
    </div>
  );
}

export default function MyAccount() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [active, setActive] = useState(section || 'dashboard');

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  const handleNav = (key) => {
    setActive(key);
    navigate(`/my-account/${key}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out!');
  };

  const renderContent = () => {
    switch (active) {
      case 'reviews': return <MyReviews />;
      case 'wishlist': return <MyWishlist />;
      case 'profile': return <MyProfile />;
      case 'notifications': return <MyNotifications />;
      case 'help': return <HelpCenter />;
      case 'security': return <SecuritySettings />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 pt-0">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 lg:shrink-0 lg:sticky self-start" style={{ top: 'var(--navbar-height, 96px)' }}>
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="p-4 border-b border-blue-100 bg-gradient-to-r from-blue-900 to-blue-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                    {user?.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{user?.name}</p>
                    <p className="text-blue-400 text-xs">My Account</p>
                  </div>
                </div>
              </div>
              <nav className="p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {MENU_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} onClick={() => handleNav(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                        active === item.key ? 'bg-blue-900 text-white' : 'text-blue-700 hover:bg-blue-50'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                      {active === item.key && <FiChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                  );
                })}
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors mt-1 border-t border-blue-100 pt-4 col-span-2 sm:col-span-3 lg:col-span-1">
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