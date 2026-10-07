import { useState, useEffect } from 'react';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';
import SellerLayout from './SellerLayout';

export default function SellerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const data = await notificationAPI.getMy();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const markAll = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(n => n.map(x => ({...x, isRead: true})));
      setUnread(0);
    } catch {}
  };

  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notifications {unread > 0 && <span className="ml-2 px-2 py-0.5 rounded-full text-sm bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold">{unread}</span>}
        </h1>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <FiCheckCircle className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div> :
      notifications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiBell className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${n.isRead ? 'border-gray-100 dark:border-gray-800 opacity-80' : 'border-blue-100 dark:border-blue-500/30 bg-blue-50/20 dark:bg-blue-500/10'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.isRead ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </SellerLayout>
  );
}
