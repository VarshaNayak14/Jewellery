import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheckCircle, FiPackage, FiTruck, FiTag, FiAlertCircle, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';

const TYPE_CONFIG = {
  push:  { bg: 'bg-violet-50', icon: FiBell,        color: 'text-violet-600',  dot: 'bg-violet-500' },
  email: { bg: 'bg-emerald-50', icon: FiCheckCircle, color: 'text-emerald-600', dot: 'bg-emerald-500' },
  sms:   { bg: 'bg-orange-50',  icon: FiAlertCircle, color: 'text-orange-600',  dot: 'bg-orange-500' },
  order: { bg: 'bg-blue-50',    icon: FiPackage,     color: 'text-blue-600',    dot: 'bg-blue-500' },
  promo: { bg: 'bg-rose-50',    icon: FiTag,         color: 'text-rose-600',    dot: 'bg-rose-500' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function MyNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getMy();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
      setUnread(0);
      toast.success('All marked as read');
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            {unread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm">
                {unread}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{notifications.length} total notifications</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3.5 py-2 rounded-2xl transition-colors">
            <FiCheckCircle className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                <div className="h-3 bg-gray-100 rounded-full w-full" />
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiBell className="w-9 h-9 text-gray-200" />
          </div>
          <p className="font-bold text-gray-600 mb-1">All caught up!</p>
          <p className="text-sm text-gray-400">No notifications yet</p>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {notifications.map((n, idx) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.push;
              const Icon = cfg.icon;
              return (
                <motion.div key={n._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={`relative bg-white rounded-3xl border overflow-hidden cursor-pointer transition-all hover:shadow-md group ${
                    n.isRead ? 'border-gray-100' : 'border-rose-100 shadow-sm'
                  }`}>

                  {/* Unread left accent */}
                  {!n.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-l-3xl" />
                  )}

                  <div className="flex items-start gap-3.5 p-4 pl-5">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${n.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                          {n.title}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          {n.type}
                        </span>
                        {!n.isRead && (
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
