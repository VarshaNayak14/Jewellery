import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';

export default function AdminNotifications({ Wrapper = AdminPageWrapper }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', type: 'push', targetRole: 'all' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    notificationAPI.adminGetAll().then(d => setNotifications(d.notifications || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!form.title || !form.message) return toast.error('Title and message required');
    setSending(true);
    try {
      await notificationAPI.adminSend(form);
      toast.success('Notification sent!');
      setForm({ title: '', message: '', type: 'push', targetRole: 'all' });
      const data = await notificationAPI.adminGetAll();
      setNotifications(data.notifications || []);
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  return (
    <Wrapper title="Notification Management" subtitle="Send updates to users and review recent notifications.">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notification Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Send updates to users and review recent notifications.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="w-full">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
                <FiBell className="h-5 w-5" /> Send Notification
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Title</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Big Sale Started!"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Message</label>
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Notification message..."
                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm">
                    <option value="push">Push Notification</option>
                    <option value="email">Email Notification</option>
                    <option value="sms">SMS Notification</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Target Audience</label>
                  <select value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm">
                    <option value="all">All Users</option>
                    <option value="user">Customers Only</option>
                    <option value="seller">Sellers Only</option>
                    <option value="admin">Admins Only</option>
                    <option value="superadmin">Super Admins Only</option>
                  </select>
                </div>
                <button onClick={handleSend} disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50">
                  <FiSend className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>

              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Quick Templates:</p>
                <div className="space-y-2">
                  {[
                    { title: 'Big Sale Started!', message: 'Flat 50% OFF on all items! Shop now.' },
                    { title: 'New Arrivals', message: 'Fresh collection just landed. Check it out!' },
                    { title: 'Weekend Offer', message: 'Special weekend deals available now.' },
                  ].map(t => (
                    <button key={t.title} onClick={() => setForm({ ...form, title: t.title, message: t.message })}
                      className="w-full rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                      <p className="font-medium">{t.title}</p>
                      <p className="text-gray-500 dark:text-gray-400">{t.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="border-b border-gray-100 dark:border-gray-800 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Notification History</h2>
              </div>
              {loading ? (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500">No notifications sent yet</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.map(n => (
                    <motion.div key={n._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              n.type === 'push' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                              n.type === 'email' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'
                            }`}>{n.type}</span>
                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{n.targetRole}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 sm:ml-4">{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </Wrapper>
  );
}
