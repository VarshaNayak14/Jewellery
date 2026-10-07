import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiEye, FiChevronDown, FiDollarSign } from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  approved:  { label: 'Approved',  color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'    },
  completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'  },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'      },
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function AdminWithdrawals({ Wrapper = AdminPageWrapper }) {
  const [withdrawals, setWithdrawals] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(withdrawals);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedW, setSelectedW] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAllWithdrawals({ status: statusFilter || undefined });
      setWithdrawals(data.withdrawals || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load withdrawals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWithdrawals(); }, [statusFilter]);

  const openModal = (w) => {
    setSelectedW(w);
    setTxnId(w.transactionId || '');
    setAdminNotes(w.adminNotes || '');
    setShowModal(true);
  };

  const handleUpdate = async (status) => {
    setUpdating(true);
    try {
      await adminAPI.updateWithdrawal(selectedW._id, { status, transactionId: txnId, adminNotes });
      toast.success(`Withdrawal ${status}!`);
      setShowModal(false);
      fetchWithdrawals();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setUpdating(false); }
  };

  // Summary stats
  const pendingTotal = withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0);
  const completedTotal = withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + w.amount, 0);

  return (
    <Wrapper title="Withdrawals" subtitle={`${total} withdrawal requests`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Withdrawals</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">{total} withdrawal requests</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-2xl p-4 sm:p-5">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Pending Amount</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-800 dark:text-yellow-400 mt-1 break-words">{fmt(pendingTotal)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-500/10 rounded-2xl p-4 sm:p-5">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">Completed (All Time)</p>
            <p className="text-xl sm:text-2xl font-bold text-green-800 dark:text-green-400 mt-1 break-words">{fmt(completedTotal)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 sm:p-5 col-span-1 xs:col-span-2 sm:col-span-1">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Requests</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-400 mt-1">{total}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="relative w-full sm:w-auto">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto pl-4 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 appearance-none">
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        {/* Table (desktop / tablet) */}
        <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <tr>{['Seller', 'Shop', 'Amount', 'Method', 'Requested', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" /></td></tr>
                )) : withdrawals.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                      <FiDollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No withdrawal requests</p>
                    </div>
                  </td></tr>
                ) : tablePage.pageItems.map(w => {
                  const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={w._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{w.seller?.user?.name || '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{w.seller?.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{w.seller?.shopName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(w.amount)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{w.paymentMethod?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(w.requestedAt).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openModal(w)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all">
                          <FiEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
        </div>

        {/* Card list (mobile) */}
        <div className="sm:hidden space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
          )) : withdrawals.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center py-16 text-gray-400 dark:text-gray-500">
              <FiDollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No withdrawal requests</p>
            </div>
          ) : withdrawals.map(w => {
            const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
            return (
              <button key={w._id} onClick={() => openModal(w)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{w.seller?.user?.name || '—'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{w.seller?.shopName}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(w.amount)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(w.requestedAt).toLocaleDateString('en-IN')}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">{w.paymentMethod?.replace(/_/g, ' ')}</p>
              </button>
            );
          })}
        </div>

        {/* Action Modal */}
        <AnimatePresence>
          {showModal && selectedW && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">Withdrawal Request</h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300"><FiX /></button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 mb-5 space-y-2 text-sm">
                  {[
                    ['Seller', selectedW.seller?.user?.name],
                    ['Shop', selectedW.seller?.shopName],
                    ['Amount', fmt(selectedW.amount)],
                    ['Method', selectedW.paymentMethod?.replace(/_/g, ' ')],
                    ['Requested', new Date(selectedW.requestedAt).toLocaleString('en-IN')],
                    ['Status', selectedW.status],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{k}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100 capitalize text-right break-words">{v}</span>
                    </div>
                  ))}
                  {selectedW.notes && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400">Seller Notes:</p>
                      <p className="text-gray-700 dark:text-gray-300 text-xs mt-1 break-words">{selectedW.notes}</p>
                    </div>
                  )}
                </div>

                {/* Bank details */}
                {selectedW.seller?.bankDetails && Object.keys(selectedW.seller.bankDetails).length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-5 text-xs space-y-1">
                    <p className="font-semibold text-blue-800 dark:text-blue-400 mb-2">Bank Details</p>
                    {Object.entries(selectedW.seller.bankDetails).map(([k, v]) => v ? (
                      <div key={k} className="flex justify-between gap-3 text-blue-700 dark:text-blue-400">
                        <span className="capitalize shrink-0">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium text-right break-words">{v}</span>
                      </div>
                    ) : null)}
                  </div>
                )}

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Transaction ID</label>
                    <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="Enter transaction ID"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Admin Notes</label>
                    <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                      placeholder="Notes for seller..."
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500 resize-none" />
                  </div>
                </div>

                <div className="flex flex-col xs:flex-row gap-2">
                  {selectedW.status === 'pending' && (
                    <>
                      <button onClick={() => handleUpdate('approved')} disabled={updating}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm">
                        <FiCheck className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleUpdate('rejected')} disabled={updating}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-60 text-sm">
                        <FiX className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {selectedW.status === 'approved' && (
                    <button onClick={() => handleUpdate('completed')} disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 text-sm">
                      <FiCheck className="w-4 h-4" /> Mark as Completed
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </Wrapper>
  );
}