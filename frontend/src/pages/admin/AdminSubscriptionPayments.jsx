import { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiClock, FiXCircle, FiExternalLink, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import { formatPrice, formatDateShort } from '../../utils/helpers';
import { useDebounce } from '../../hooks/useDebounce';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending Verification' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export default function AdminSubscriptionPayments({ Wrapper = AdminPageWrapper }) {
  const location = useLocation();
  const isSuperAdmin = location.pathname.startsWith('/superadmin');
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    adminAPI.getSubscriptionPayments({
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      page,
      limit: LIMIT,
    })
      .then((data) => { setPayments(data.payments || []); setStats(data.stats || {}); setPages(data.pages || 1); })
      .catch(() => toast.error('Failed to load subscription payments'))
      .finally(() => setLoading(false));
  }, [statusFilter, debouncedSearch, dateFrom, dateTo, page]);
  // Any filter/search change should snap back to page 1 — staying on page 4
  // of a filter that now has 1 page of results would just show an empty table.
  useEffect(() => { setPage(1); }, [statusFilter, debouncedSearch, dateFrom, dateTo]);

  const isExpiringSoon = (seller) => {
    if (!seller?.planExpiresAt) return false;
    const expiry = new Date(seller.planExpiresAt);
    const days = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  };

  const setPaymentStatus = (id, status) =>
    setPayments(current => current.map(item => (item._id === id ? { ...item, status } : item)));

  const verifyPayment = async (payment) => {
    try {
      if (payment.purpose === 'offer') await adminAPI.verifyOfferPlanPayment(payment._id);
      else await adminAPI.verifySellerPlanPayment(payment._id);
      toast.success(`${payment.planName} plan activated for ${payment.seller?.shopName || 'seller'}`);
      setPaymentStatus(payment._id, 'paid');
    } catch (err) { toast.error(err.message || 'Verification failed'); }
  };

  const rejectPayment = async (payment) => {
    if (!window.confirm(`Reject ${payment.seller?.shopName || 'this seller'}'s ${payment.planName} payment (UTR ${payment.transactionId})?`)) return;
    try {
      await adminAPI.rejectPlanPayment(payment._id);
      toast.success('Payment rejected');
      setPaymentStatus(payment._id, 'failed');
    } catch (err) { toast.error(err.message || 'Could not reject payment'); }
  };

  // Bank/QR plan changes (offer plans, or seller plan renew/switch from an
  // already-approved seller) are verified here. Sign-up payments of pending
  // sellers are confirmed by approving the seller instead.
  const canReview = (p) => p.status === 'pending' && p.paymentMethod === 'bank_qr'
    && (p.purpose === 'offer' || p.seller?.status === 'approved');

  return (
    <Wrapper title="Subscription Payments" subtitle="Seller plan purchases &amp; renewals">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-green-500 to-emerald-400 text-white">
          <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue || 0)}</p>
          <p className="text-xs font-medium mt-1 opacity-90">Total Revenue</p>
        </div>
        <div className="rounded-2xl p-4 bg-green-50 dark:bg-green-500/10">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.activeSubscriptions || 0}</p>
          <p className="text-xs font-medium mt-1 text-green-700 dark:text-green-400">Active Subscriptions</p>
        </div>
        <div className="rounded-2xl p-4 bg-yellow-50 dark:bg-yellow-500/10">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.expiringSoon || 0}</p>
          <p className="text-xs font-medium mt-1 text-yellow-700 dark:text-yellow-400">Expiring in 30 Days</p>
        </div>
        <div className="rounded-2xl p-4 bg-red-50 dark:bg-red-500/10">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.expired || 0}</p>
          <p className="text-xs font-medium mt-1 text-red-700 dark:text-red-400">Expired</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by shop name..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 [color-scheme:light] dark:[color-scheme:dark]" />
          <span className="text-xs text-gray-400 dark:text-gray-500">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined}
            className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 [color-scheme:light] dark:[color-scheme:dark]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">Clear</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === tab.key ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">No subscription payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Seller', 'Plan', 'Amount', 'Method', 'Purchased', 'Expires', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        {p.seller?.logo ? (
                          <img src={p.seller.logo} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {p.seller?.shopName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.seller?.shopName || 'Deleted Seller'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.seller?.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"><span>{p.planName}</span>{p.purpose === 'offer' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Offer</span>}{p.paymentScreenshot && <a href={p.paymentScreenshot} target="_blank" rel="noreferrer" className="block text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">View proof</a>}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 capitalize whitespace-nowrap">{p.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateShort(p.purchasedAt)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={isExpiringSoon(p.seller) ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                        {p.expiresAt ? formatDateShort(p.expiresAt) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        p.status === 'paid' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                        p.status === 'refunded' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                        p.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                        'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                      }`}>
                        {p.status === 'paid' ? <FiCheckCircle className="w-3 h-3" /> : p.status === 'refunded' || p.status === 'pending' ? <FiClock className="w-3 h-3" /> : <FiXCircle className="w-3 h-3" />}
                        {p.status}
                      </span>
                      {canReview(p) && (
                        <div className="mt-1 flex items-center gap-2 whitespace-nowrap">
                          <button onClick={() => verifyPayment(p)} className="text-[11px] font-semibold text-green-600 dark:text-green-400 hover:underline">Verify & Activate</button>
                          <button onClick={() => rejectPayment(p)} className="text-[11px] font-semibold text-red-500 hover:underline">Reject</button>
                        </div>
                      )}
                      {p.status === 'pending' && p.paymentMethod === 'bank_qr' && p.transactionId && (
                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">UTR: {p.transactionId}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && payments.length > 0 && pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <FiChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              Next <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1.5">
          <FiDollarSign className="w-3.5 h-3.5" />
          Need to change a plan's price or features? Head to{' '}
          <Link to="/superadmin/plans" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">Subscription Plans <FiExternalLink className="w-3 h-3" /></Link>
        </p>
      )}
    </Wrapper>
  );
}
