import { Fragment, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiCheck, FiSlash, FiEye, FiChevronDown, FiUsers, FiShield, FiPlus } from 'react-icons/fi';
import { adminAPI, planAPI } from '../../services/api';
import { getStoreUrl } from '../../utils/subdomain';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import AddSellerModal from './AddSellerModal';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', badge: '🕐' },
  approved: { label: 'Approved', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',   badge: '✅' },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',       badge: '❌' },
  blocked:  { label: 'Blocked',  color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',     badge: '🚫' },
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function AdminSellers({ Wrapper = AdminPageWrapper }) {
  const [sellers, setSellers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  // Seller whose "Reject" reason box is open under their table row.
  const [rejectingId, setRejectingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [sellerPlans, setSellerPlans] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [assigningPlan, setAssigningPlan] = useState(false);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const [sellersData, analyticsData] = await Promise.all([
        adminAPI.getAllSellers({
          status: statusFilter || undefined, page, limit: 20,
          search: debouncedSearch || undefined, from: dateFrom || undefined, to: dateTo || undefined,
        }),
        adminAPI.getSellerAnalytics(),
      ]);
      setSellers(sellersData.sellers || []);
      setTotal(sellersData.total || 0);
      setAnalytics(analyticsData.analytics || null);
    } catch { toast.error('Failed to load sellers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSellers(); }, [statusFilter, page, debouncedSearch, dateFrom, dateTo]);
  // Active seller plans — both Admin and Super Admin can assign one.
  useEffect(() => {
    planAPI.getAll().then(data => setSellerPlans((data.plans || []).filter(p => p.purpose !== 'offer'))).catch(() => toast.error('Failed to load seller plans'));
  }, []);

  const assignPlan = async (sellerId, planId) => {
    if (!planId) return;
    setAssigningPlan(true);
    try {
      const data = await adminAPI.assignSellerPlan(sellerId, { planId });
      setSelectedSeller(data.seller);
      toast.success('Plan assigned and expiry updated');
      fetchSellers();
    } catch (err) { toast.error(err.message || 'Failed to assign plan'); }
    finally { setAssigningPlan(false); }
  };

  const handleStatusUpdate = async (sellerId, status, reason = '') => {
    setUpdatingId(sellerId);
    try {
      await adminAPI.updateSellerStatus(sellerId, { status, rejectionReason: reason });
      toast.success(`Seller ${status}!`);
      setRejectingId(null);
      setRejectionReason('');
      fetchSellers();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setUpdatingId(null); }
  };

  const openDetail = async (seller) => {
    setSelectedSeller(seller);
    setShowDetailModal(true);
  };

  return (
    <Wrapper
      title="Sellers"
      subtitle={`${total} registered sellers`}
      actions={
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus className="w-4 h-4" /> Add Seller
        </button>
      }
    >
      <AddSellerModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => fetchSellers()} />
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { label: 'Total Sellers', value: analytics.totalSellers, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
            { label: 'Active', value: analytics.activeSellers, color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' },
            { label: 'Pending', value: analytics.pendingSellers, color: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
            { label: 'Blocked', value: analytics.blockedSellers, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl p-3 sm:p-4 min-w-0 ${color}`}>
              <p className="text-xs font-medium opacity-70 truncate">{label}</p>
              <p className="text-lg sm:text-xl font-bold mt-1 truncate">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative w-full xs:w-auto">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full xs:w-auto pl-4 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 appearance-none">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shop name..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600" />
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Clear</button>
          )}
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
              <tr>{['Seller', 'Shop', 'Contact', 'Products', 'Revenue', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-3 sm:px-4 py-3"><div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" /></td></tr>
              )) : sellers.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <FiUsers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No sellers found</p>
                  </div>
                </td></tr>
              ) : sellers.map(seller => {
                const cfg = STATUS_CONFIG[seller.status] || STATUS_CONFIG.pending;
                return (
                  <Fragment key={seller._id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                    <td className="px-3 sm:px-4 py-3 max-w-[160px]">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{seller.user?.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{seller.user?.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(seller.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 max-w-[160px]">
                      <div className="flex items-center gap-2 min-w-0">
                        {seller.logo && <img src={seller.logo} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{seller.shopName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">/{seller.shopSlug}</p>
                          {seller.shopSlug && (
                            <a
                              href={getStoreUrl(seller.shopSlug)}
                              target="_blank" rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline truncate block"
                              title={getStoreUrl(seller.shopSlug)}
                            >
                              {getStoreUrl(seller.shopSlug).replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{seller.user?.phone || '—'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-28">{seller.address || '—'}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{seller.stats?.productCount || 0}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{seller.stats?.orderCount || 0} orders</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmt(seller.stats?.totalRevenue)}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${cfg.color}`}>
                        {cfg.badge} {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(seller)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" title="View Details">
                          <FiEye className="w-4 h-4" />
                        </button>
                        {(seller.status === 'pending' || seller.status === 'rejected') && (
                          <button onClick={() => handleStatusUpdate(seller._id, 'approved')}
                            disabled={updatingId === seller._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60 whitespace-nowrap">
                            <FiCheck className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        {seller.status === 'pending' && (
                          <button onClick={() => { setRejectingId(rejectingId === seller._id ? null : seller._id); setRejectionReason(''); }}
                            disabled={updatingId === seller._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-60 whitespace-nowrap">
                            <FiX className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}
                        {seller.status === 'approved' && (
                          <button onClick={() => { if (window.confirm(`Block ${seller.shopName}? Their shop goes offline and they can't log in.`)) handleStatusUpdate(seller._id, 'blocked'); }}
                            disabled={updatingId === seller._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 whitespace-nowrap">
                            <FiSlash className="w-3.5 h-3.5" /> Block
                          </button>
                        )}
                        {seller.status === 'blocked' && (
                          <button onClick={() => handleStatusUpdate(seller._id, 'approved')}
                            disabled={updatingId === seller._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60 whitespace-nowrap">
                            <FiCheck className="w-3.5 h-3.5" /> Unblock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {rejectingId === seller._id && (
                    <tr className="bg-red-50/60 dark:bg-red-500/5">
                      <td colSpan={7} className="px-3 sm:px-4 py-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} autoFocus
                            placeholder={`Reason for rejecting ${seller.shopName} (shown to the seller)…`}
                            className="flex-1 min-w-0 px-3 py-2 border border-red-200 dark:border-red-500/30 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
                          <div className="flex gap-2">
                            <button onClick={() => setRejectingId(null)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                            <button onClick={() => handleStatusUpdate(seller._id, 'rejected', rejectionReason)} disabled={updatingId === seller._id}
                              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">Confirm Reject</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} limit={20} total={total} onPageChange={setPage} />
      </div>

      {/* Seller Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSeller && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 gap-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base sm:text-lg">Seller Details</h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"><FiX className="dark:text-gray-300" /></button>
              </div>

              {/* Shop info */}
              <div className="flex items-center gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 mb-5">
                {selectedSeller.logo ? (
                  <img src={selectedSeller.logo} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {selectedSeller.shopName?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{selectedSeller.shopName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">/{selectedSeller.shopSlug}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_CONFIG[selectedSeller.status]?.color}`}>
                    {selectedSeller.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-5 text-sm">
                {[
                  ['Name', selectedSeller.user?.name],
                  ['Email', selectedSeller.user?.email],
                  ['Phone', selectedSeller.user?.phone || selectedSeller.phone || '—'],
                  ['Address', selectedSeller.address || '—'],
                  ['Plan', selectedSeller.planSnapshot?.name ? `${selectedSeller.planSnapshot.name} (₹${selectedSeller.planSnapshot.price?.toLocaleString('en-IN')})` : '—'],
                  ['Registered', new Date(selectedSeller.createdAt).toLocaleDateString('en-IN')],
                  ['Products', selectedSeller.stats?.productCount || 0],
                  ['Orders', selectedSeller.stats?.orderCount || 0],
                  ['Total Revenue', fmt(selectedSeller.stats?.totalRevenue)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-2 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{k}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-right truncate">{v}</span>
                  </div>
                ))}
              </div>

              {/* Payment proof — Razorpay verification (preferred) or a legacy uploaded screenshot */}
              {(
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Assign Seller Plan</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Current: {selectedSeller.planSnapshot?.name || 'No plan'}{selectedSeller.planExpiresAt ? ` · valid till ${new Date(selectedSeller.planExpiresAt).toLocaleDateString('en-IN')}` : ''}
                  </p>
                  <select key={selectedSeller._id + (selectedSeller.planSnapshot?.name || '')} defaultValue="" disabled={assigningPlan} onChange={e => { const p = sellerPlans.find(x => x._id === e.target.value); if (p && window.confirm(`Assign the ${p.name} plan to ${selectedSeller.shopName}? It starts today.`)) assignPlan(selectedSeller._id, p._id); else e.target.value = ''; }}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                    <option value="">Choose plan...</option>
                    {sellerPlans.filter(plan => plan.isActive).map(plan => <option key={plan._id} value={plan._id}>{plan.name} - ₹{Number(plan.price).toLocaleString('en-IN')} {plan.billingCycle === 'monthly' ? '/ Month' : '/ Year'}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Assignment starts today and expiry is calculated from the plan's monthly/yearly cycle.</p>
                </div>
              )}

              {/* Payment proof — Razorpay verification (preferred) or a legacy uploaded screenshot */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Plan Payment</p>
                {selectedSeller.razorpayPaymentId ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      {selectedSeller.paymentVerified ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><FiCheck className="w-3.5 h-3.5" /> Verified via Razorpay</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">⚠ Not verified server-side</span>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Payment ID: <span className="font-mono text-gray-700 dark:text-gray-300">{selectedSeller.razorpayPaymentId}</span></p>
                    {selectedSeller.razorpayOrderId && (
                      <p className="text-gray-500 dark:text-gray-400">Order ID: <span className="font-mono text-gray-700 dark:text-gray-300">{selectedSeller.razorpayOrderId}</span></p>
                    )}
                  </div>
                ) : selectedSeller.paymentScreenshot || selectedSeller.paymentReference ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Bank / QR transfer — {selectedSeller.paymentVerified ? <span className="text-green-600 dark:text-green-400">verified</span> : <span className="text-amber-600 dark:text-amber-400">verify before approving</span>}
                    </p>
                    {selectedSeller.paymentReference && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">UTR / Reference: <span className="font-mono text-gray-700 dark:text-gray-300">{selectedSeller.paymentReference}</span></p>
                    )}
                    {selectedSeller.paymentScreenshot && (
                      <a href={selectedSeller.paymentScreenshot} target="_blank" rel="noreferrer">
                        <img src={selectedSeller.paymentScreenshot} alt="Payment screenshot" className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700 object-contain hover:opacity-90" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Not provided</p>
                )}
              </div>

              {/* Description */}
              {selectedSeller.description && (
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 mb-5 text-sm text-gray-600 dark:text-gray-400">
                  {selectedSeller.description}
                </div>
              )}

              {/* KYC review */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <FiShield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> KYC Status:{' '}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedSeller.kyc?.status === 'approved' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                    selectedSeller.kyc?.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                    selectedSeller.kyc?.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {(selectedSeller.kyc?.status || 'not_submitted').replace('_', ' ')}
                  </span>
                </p>
                {selectedSeller.kyc?.panNumber && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-3">
                    <p>PAN: <span className="font-medium">{selectedSeller.kyc.panNumber}</span></p>
                    <div className="flex gap-3 mt-1">
                      {selectedSeller.kyc.panDocument && (
                        <a href={selectedSeller.kyc.panDocument} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">View PAN Doc</a>
                      )}
                      {selectedSeller.kyc.idDocument && (
                        <a href={selectedSeller.kyc.idDocument} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">View ID Doc</a>
                      )}
                      {selectedSeller.kyc.addressProofDocument && (
                        <a href={selectedSeller.kyc.addressProofDocument} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">View Address Proof</a>
                      )}
                    </div>
                    {selectedSeller.kyc.addressProofType && <p>Address proof: <span className="font-medium">{selectedSeller.kyc.addressProofType}</span></p>}
                    {selectedSeller.kyc.selfie && (
                      <a href={selectedSeller.kyc.selfie} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-1">
                        <img src={selectedSeller.kyc.selfie} alt="Seller selfie" className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                        <span className="text-indigo-600 dark:text-indigo-400 hover:underline">Selfie</span>
                      </a>
                    )}
                  </div>
                )}
                {selectedSeller.kyc?.status === 'pending' && (
                  <Link to="/admin/kyc" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Review in KYC Management →
                  </Link>
                )}
                {(!selectedSeller.kyc || selectedSeller.kyc.status === 'not_submitted') && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Seller hasn't submitted KYC documents yet.</p>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Wrapper>
  );
}