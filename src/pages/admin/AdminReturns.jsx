import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { returnAPI, courierAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400',
  under_review: 'bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400',
  pickup_scheduled: 'bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400',
  picked_up: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400',
  refund_initiated: 'bg-orange-100 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400',
  refund_completed: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400',
};

export default function AdminReturns({ Wrapper = AdminPageWrapper }) {
  const [returns, setReturns] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(returns);
  const [stats, setStats] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({ status: '', adminNotes: '', refundAmount: '', refundMethod: 'wallet' });
  const [couriers, setCouriers] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [returnsData, statsData] = await Promise.all([
        returnAPI.adminGetAll({ status: statusFilter || undefined }),
        returnAPI.adminGetStats(),
      ]);
      setReturns(returnsData.returns || []);
      setStats(statsData.stats || {});
      const courierData = await courierAPI.adminGetApproved();
      setCouriers(courierData.couriers || []);
    } catch { toast.error('Failed to load returns'); }
    finally { setLoading(false); }
  };

  const assignCourier = async (id, courierId) => {
    if (!courierId) return;
    try {
      const data = await returnAPI.adminAssignCourier(id, { courierId });
      setReturns(prev => prev.map(item => item._id === id ? data.return : item));
      toast.success('Courier assigned');
    } catch (err) { toast.error(err.message || 'Failed to assign courier'); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openDetail = (ret) => {
    setSelected(ret);
    setForm({ status: ret.status, adminNotes: ret.adminNotes || '', refundAmount: ret.refundAmount || '', refundMethod: ret.refundMethod || 'wallet' });
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await returnAPI.adminUpdate(selected._id, form);
      toast.success('Return updated!');
      setSelected(null);
      fetchData();
    } catch (err) { toast.error(err.message); }
    finally { setUpdating(false); }
  };

  return (
    <Wrapper title="Return & Refund Management" subtitle="Review return requests and manage refund actions.">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Return & Refund Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review return requests and manage refund actions.</p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Pending', value: stats.pending || 0, color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400' },
            { label: 'Approved', value: stats.approved || 0, color: 'bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400' },
            { label: 'Rejected', value: stats.rejected || 0, color: 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400' },
            { label: 'Refunded', value: stats.refunded || 0, color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{s.label} Returns</p>
              <p className={`inline-block rounded-lg px-2 py-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap gap-2">
            {['', 'pending', 'under_review', 'approved', 'rejected', 'refund_completed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${statusFilter === s ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading...</div>
          ) : returns.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">No returns found</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      {['Order #', 'Customer', 'Product', 'Reason', 'Refund Amt', 'Status', 'Courier', 'Date', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {tablePage.pageItems.map(ret => (
                      <tr key={ret._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">#{ret.order?.orderNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{ret.user?.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{ret.user?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{ret.product?.name?.slice(0, 25) || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{ret.reason?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100">₹{ret.refundAmount}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[ret.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                            {ret.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {ret.assignedCourier?.user?.name || ['approved', 'pickup_scheduled'].includes(ret.status) ? (
                            ret.assignedCourier?.user?.name || <select value="" onChange={e => assignCourier(ret._id, e.target.value)}
                              className="text-xs rounded border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                              <option value="">{couriers.length ? 'Assign' : 'No active courier'}</option>
                              {couriers.map(c => <option key={c._id} value={c._id}>{c.user?.name || c.user?.email}</option>)}
                            </select>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(ret.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(ret)} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                            <FiEye className="h-4 w-4" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />

              <div className="space-y-3 p-3 md:hidden">
                {returns.map(ret => (
                  <div key={ret._id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">#{ret.order?.orderNumber || '-'}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{ret.product?.name?.slice(0, 25) || '-'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[ret.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        {ret.status?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p><span className="font-medium text-gray-700 dark:text-gray-300">Customer:</span> {ret.user?.name}</p>
                      <p><span className="font-medium text-gray-700 dark:text-gray-300">Email:</span> {ret.user?.email}</p>
                      <p><span className="font-medium text-gray-700 dark:text-gray-300">Reason:</span> {ret.reason?.replace(/_/g, ' ')}</p>
                      <p><span className="font-medium text-gray-700 dark:text-gray-300">Refund:</span> ₹{ret.refundAmount}</p>
                      <p><span className="font-medium text-gray-700 dark:text-gray-300">Date:</span> {new Date(ret.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>

                    <button onClick={() => openDetail(ret)} className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <FiEye className="h-4 w-4" /> View details
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Return Request Details</h2>
                <button onClick={() => setSelected(null)} className="text-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">×</button>
              </div>
              <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2 text-gray-700 dark:text-gray-300">
                <div><span className="text-gray-500 dark:text-gray-400">Customer:</span> <strong className="text-gray-900 dark:text-gray-100">{selected.user?.name}</strong></div>
                <div><span className="text-gray-500 dark:text-gray-400">Order:</span> <strong className="text-gray-900 dark:text-gray-100">#{selected.order?.orderNumber}</strong></div>
                <div><span className="text-gray-500 dark:text-gray-400">Reason:</span> <strong className="text-gray-900 dark:text-gray-100">{selected.reason?.replace(/_/g, ' ')}</strong></div>
                <div><span className="text-gray-500 dark:text-gray-400">Refund Amount:</span> <strong className="text-gray-900 dark:text-gray-100">₹{selected.refundAmount}</strong></div>
              </div>
              <div className="mb-4">
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">Description:</p>
                <p className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-sm text-gray-700 dark:text-gray-300">{selected.description}</p>
              </div>
              {selected.images?.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Evidence Images:</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.images.map((img, i) => (
                      <img key={i} src={img} alt="evidence" className="h-16 w-16 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Update Return</h3>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm">
                    {['pending', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'refund_initiated', 'refund_completed'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Refund Method</label>
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    Wallet credit only
                  </div>
                  <input type="hidden" value="wallet" onChange={() => {}} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Refund Amount (₹)</label>
                  <input type="number" value={form.refundAmount} onChange={e => setForm({ ...form, refundAmount: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Admin Notes</label>
                  <textarea value={form.adminNotes} onChange={e => setForm({ ...form, adminNotes: e.target.value })} rows={3}
                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={handleUpdate} disabled={updating}
                    className="flex-1 rounded-lg bg-gray-900 dark:bg-gray-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50">
                    {updating ? 'Updating...' : 'Update Return'}
                  </button>
                  <button onClick={() => setSelected(null)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </Wrapper>
  );
}
