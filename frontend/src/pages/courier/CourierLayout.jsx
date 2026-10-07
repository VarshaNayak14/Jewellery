import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiGrid, FiPackage, FiClock, FiDollarSign, FiUser, FiLogOut, FiMenu, FiX, FiTruck, FiRefreshCw } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import NotificationBell from '../../components/common/NotificationBell';

const NAV_ITEMS = [
  { to: '/courier', icon: FiGrid, label: 'Dashboard' },
  { to: '/courier/deliveries', icon: FiPackage, label: 'Deliveries' },
  { to: '/courier/returns', icon: FiRefreshCw, label: 'Returns' },
  { to: '/courier/history', icon: FiClock, label: 'History' },
  { to: '/courier/earnings', icon: FiDollarSign, label: 'Earnings' },
  { to: '/courier/profile', icon: FiUser, label: 'My Profile' },
];

function CourierTopBar({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/courier/login'); };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-blue-700 flex items-center justify-between px-4 sm:px-6 z-40 shadow-md">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-white p-1.5 -ml-1.5">
          <FiMenu className="w-6 h-6" />
        </button>
        <Link to="/courier" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <FiTruck className="w-5 h-5 text-blue-700" />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-white font-bold text-base -mb-0.5">growthkarts</p>
            <p className="text-blue-200 text-[11px] tracking-wide">COURIER</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <NotificationBell dark={true} />
        <Link to="/courier/profile" title="My Profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10">
          <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-white text-sm font-semibold">{user?.name}</p>
            <p className="text-blue-200 text-xs">{user?.email}</p>
          </div>
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
          <FiLogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

function CourierNav() {
  const location = useLocation();
  return (
    <aside className="w-64 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 flex flex-col fixed left-0 top-16 z-30 border-r border-gray-100 dark:border-gray-800 overflow-y-auto">
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                active ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-400'
              }`}>
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-700 rounded-r-full" />}
              <Icon className="w-4 h-4 flex-shrink-0" /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function CourierLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <CourierTopBar onMenuClick={() => setMobileOpen(true)} />

      <div className="hidden lg:block">
        <CourierNav />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 lg:hidden bg-white dark:bg-gray-900">
              <div className="h-16 bg-blue-700 flex items-center justify-between px-4">
                <span className="text-white font-bold">Courier</span>
                <button onClick={() => setMobileOpen(false)} className="text-white p-1.5"><FiX className="w-5 h-5" /></button>
              </div>
              <div className="h-[calc(100%-4rem)] overflow-y-auto">
                <nav className="p-3 space-y-0.5">
                  {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 transition-all">
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
