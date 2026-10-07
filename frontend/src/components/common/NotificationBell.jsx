import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiBell, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';

const formatNoteTime = (date) => {
  if (!date) return 'Just now';
  try {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
};

export default function NotificationBell({ dark = false }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationAPI.getMy();
      const list = data.notifications || [];
      setNotifications(list);
      setUnreadCount(data.unread || list.filter(item => !item.isRead).length);
    } catch (error) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(item => item._id === id ? { ...item, isRead: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Unable to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Unable to mark all as read');
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Notifications cleared');
    } catch (error) {
      toast.error('Unable to clear notifications');
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.isRead) await handleMarkRead(item._id);
    setOpen(false);
    if (item.relatedReturn) {
      if (location.pathname.startsWith('/seller')) navigate('/seller/returns');
      else if (location.pathname.startsWith('/admin')) navigate('/admin/returns');
      else if (location.pathname.startsWith('/superadmin')) navigate('/superadmin/returns');
      else if (location.pathname.startsWith('/courier')) navigate('/courier/returns');
      else navigate('/my-account/returns');
    } else if (item.relatedOrder) {
      if (location.pathname.startsWith('/courier')) navigate('/courier/deliveries');
      else if (location.pathname.startsWith('/seller')) navigate('/seller/orders');
      else if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin')) navigate('/admin/orders');
      else navigate(`/my-account/tracking?orderId=${item.relatedOrder}`);
    }
  };

  const panelClasses = dark
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const buttonClasses = dark
    ? 'text-blue-100 hover:bg-white/10 hover:text-white'
    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`relative p-2.5 rounded-xl transition-colors ${buttonClasses}`}
        aria-label="Notifications"
        title="Notifications"
      >
        <FiBell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className={`absolute right-0 top-full mt-2 w-[min(92vw,360px)] rounded-2xl border shadow-2xl z-50 overflow-hidden ${panelClasses}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/10">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-[11px] opacity-70">{unreadCount} unread</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                Close
              </button>
            </div>

            <div className="flex gap-2 px-3 py-2 border-b border-gray-200/10">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="flex-1 rounded-xl bg-blue-600 text-white text-xs font-semibold px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className="flex-1 rounded-xl bg-red-500/10 text-red-500 text-xs font-semibold px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-sm opacity-70 text-center">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-sm opacity-70 text-center">No notifications yet.</div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-200/10 transition-colors ${
                      item.isRead ? 'opacity-70' : 'bg-blue-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{item.title || 'Update'}</p>
                        <p className="text-xs opacity-80 mt-1 whitespace-pre-wrap break-words">{item.message}</p>
                        <p className="text-[10px] opacity-60 mt-2">{formatNoteTime(item.createdAt)}</p>
                      </div>
                      {!item.isRead && (
                        <span className="mt-1 flex-shrink-0 rounded-full bg-blue-500 p-1.5 text-white">
                          <FiCheck className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
