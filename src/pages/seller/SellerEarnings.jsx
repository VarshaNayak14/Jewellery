import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FiDollarSign, FiTrendingUp, FiClock, FiCheck, FiX, FiShield, FiUsers, FiCopy, FiGift } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import { useSellerStore } from '../../store/sellerStore';
import SellerLayout from './SellerLayout';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatBox = ({ label, value, sub, color, icon: Icon }) => (
  <div className={`rounded-2xl p-5 ${color}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 opacity-70" />
      <span className="text-sm font-medium opacity-80">{label}</span>
    </div>
    <p className="text-2xl font-bold">{value}</p>
    {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
  </div>
);

const codStatusLabel = (payment) => {
  const manual = payment.settlementMode === 'manual';
  switch (payment.status) {
    case 'approved': return 'Completed';
    case 'disputed': return manual ? 'Disputed — waiting for courier' : 'Disputed — waiting for new screenshot';
    case 'submitted': return manual ? 'Courier says paid — please confirm' : 'Screenshot submitted — please review';
    default: return manual ? 'Waiting for courier to pay you' : 'Waiting for courier screenshot';
  }
};

export default function SellerEarnings() {
  const { seller } = useSellerStore();
  const kycApproved = seller?.kyc?.status === 'approved';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referrals, setReferrals] = useState(null);
  const [courierPayments, setCourierPayments] = useState([]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await sellerAPI.getEarnings();
      setData(res);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchEarnings();
    sellerAPI.getReferrals().then(setReferrals).catch(() => {});
    sellerAPI.getCourierPayments().then(data => setCourierPayments(data.payments || [])).catch(() => {});
  }, []);

  const referralLink = referrals?.referralCode
    ? `${window.location.origin}/seller/register?ref=${referrals.referralCode}`
    : '';

  const copyReferralCode = () => {
    if (!referrals?.referralCode) return;
    navigator.clipboard?.writeText(referrals.referralCode);
    toast.success('Referral code copied!');
  };

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard?.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) < 100) {
      toast.error('Minimum withdrawal is ₹100'); return;
    }
    setSubmitting(true);
    try {
      await sellerAPI.requestWithdrawal({ amount: Number(withdrawAmount), notes: withdrawNotes });
      toast.success('Withdrawal request submitted!');
      setShowWithdrawForm(false);
      setWithdrawAmount(''); setWithdrawNotes('');
      fetchEarnings();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const WITHDRAWAL_STATUS = {
    pending:   { label: 'Pending',   color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: FiClock },
    approved:  { label: 'Approved',  color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',     icon: FiCheck },
    completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',   icon: FiCheck },
    rejected:  { label: 'Rejected',  color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',       icon: FiX },
  };

  if (loading) return (
    <SellerLayout>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-28 animate-pulse" />)}
      </div>
    </SellerLayout>
  );

  const e = data?.earnings || {};
  const revenueChartData = (data?.revenueByMonth || []).map(m => ({
    label: MONTHS[(m._id?.month || 1) - 1],
    revenue: m.revenue,
  }));

  return (
    <SellerLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Earnings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">You keep 100% of every sale — no platform commission.</p>
        </div>
        <button onClick={() => {
          if (Number(data?.earnings?.referralBalance || 0) < 100) {
            toast.error('Only referral earnings can be withdrawn. Minimum referral balance is ₹100.');
            return;
          }
          setShowWithdrawForm(true);
        }}
          className="px-4 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors text-sm shadow-md">
          Request Withdrawal
        </button>
      </div>

      {!kycApproved && (
        <Link to="/seller/kyc"
          className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 mb-6 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
          <FiShield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Complete KYC verification to withdraw earnings</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Required once before your first withdrawal — tap to submit your documents.</p>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total Sales" value={fmt(e.totalSales)} sub={`${e.totalOrders} orders delivered`}
          color="bg-gradient-to-br from-green-500 to-emerald-400 text-white" icon={FiDollarSign} />
        <StatBox label="Referral Withdrawable" value={fmt(e.referralBalance)} sub="Only referral earnings can be withdrawn"
          color="bg-gradient-to-br from-blue-500 to-cyan-400 text-white" icon={FiDollarSign} />
        <StatBox label="This Month Sales" value={fmt(e.monthSales)} sub="No commission deducted"
          color="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-100" icon={FiTrendingUp} />
        <StatBox label="Total Withdrawn" value={fmt(e.totalWithdrawn)} sub="All time"
          color="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-100" icon={FiCheck} />
      </div>

      {/* Referral Program */}
      {referrals && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiGift className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Refer a Seller, Earn a Bonus</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your referral code</p>
              <button onClick={copyReferralCode}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-500/40 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-mono font-bold text-sm hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors">
                {referrals.referralCode}
                <FiCopy className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FiUsers className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{referrals.totalReferred}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sellers referred</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <FiDollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(referrals.totalEarned)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Earned from referrals</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your referral link — share this, it opens registration with your code already applied</p>
            <button onClick={copyReferralLink}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="truncate font-mono">{referralLink}</span>
              <FiCopy className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Share your code or link with other sellers — when they sign up with it, you get a one-time bonus credited straight to your available balance.
          </p>
          {referrals.bonuses?.length > 0 && (
            <div className="divide-y divide-gray-50 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              {referrals.bonuses.map(b => (
                <div key={b._id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{b.referredSeller?.shopName || 'Seller'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(b.createdAt).toLocaleDateString('en-IN')} · {b.percent}% of {fmt(b.planAmount)} plan</p>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">+{fmt(b.bonusAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revenue Chart */}
      {revenueChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6 mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-5">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsRevenueBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c99a52" stopOpacity={0.95} />
                  <stop offset="95%" stopColor="#8b6835" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value) => [fmt(value), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="url(#earningsRevenueBar)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Courier COD Payments</h3>
          <p className="text-xs text-gray-500 mt-1">Online: approve only after checking the transfer screenshot. Manual: confirm once the courier has paid you. Change the mode in Shop Settings → Courier COD Settlement.</p>
        </div>
        {courierPayments.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No COD deliveries to settle yet.</p>
        ) : courierPayments.map(payment => (
          <div key={payment._id} className="px-6 py-4 border-b last:border-0 border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">₹{payment.amount} · Order #{payment.order?.orderNumber || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Courier: {payment.courier?.user?.name || '-'} · {payment.settlementMode === 'manual' ? 'Manual payment' : 'Online proof'} · {codStatusLabel(payment)}
                </p>
              </div>
              {payment.proofUrl && <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View screenshot</a>}
            </div>
            {(payment.status === 'submitted' || (payment.settlementMode === 'manual' && payment.status !== 'approved')) && (
              <div className="flex gap-2 mt-3">
                <button onClick={async () => {
                  try {
                    await sellerAPI.reviewCourierPayment(payment._id, { status: 'approved' });
                    toast.success(payment.settlementMode === 'manual' ? 'Manual payment confirmed and added to wallet' : 'Payment approved and added to wallet');
                    setCourierPayments(prev => prev.map(item => item._id === payment._id ? { ...item, status: 'approved' } : item));
                    fetchEarnings();
                  } catch (error) { toast.error(error.message || 'Approval failed'); }
                }} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">{payment.settlementMode === 'manual' ? 'Confirm Payment & Credit Wallet' : 'Approve & Credit Wallet'}</button>
                {payment.status === 'submitted' && <button onClick={async () => {
                  try {
                    await sellerAPI.reviewCourierPayment(payment._id, { status: 'disputed' });
                    toast.success('Payment disputed; courier has been notified');
                    setCourierPayments(prev => prev.map(item => item._id === payment._id ? { ...item, status: 'disputed' } : item));
                  } catch (error) { toast.error(error.message || 'Could not dispute payment'); }
                }} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">Reject / Dispute</button>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Withdrawal History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Withdrawal History</h3>
        </div>
        {!data?.withdrawals?.length ? (
          <div className="py-10 text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">No withdrawal requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {data.withdrawals.map(w => {
              const cfg = WITHDRAWAL_STATUS[w.status] || WITHDRAWAL_STATUS.pending;
              return (
                <div key={w._id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{fmt(w.amount)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(w.requestedAt).toLocaleDateString('en-IN')}</p>
                    {w.transactionId && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Txn: {w.transactionId}</p>}
                    {w.adminNotes && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{w.adminNotes}</p>}
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">Request Withdrawal</h3>
                <button onClick={() => setShowWithdrawForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><FiX /></button>
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 mb-5">
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>Referral Balance Available:</strong> {fmt(e.referralBalance)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Only referral earnings can be withdrawn. Minimum: ₹100</p>
              </div>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Amount (₹) *</label>
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    min={100} max={e.referralBalance} required placeholder="Enter referral amount"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Notes (optional)</label>
                  <textarea value={withdrawNotes} onChange={e => setWithdrawNotes(e.target.value)} rows={2}
                    placeholder="Any additional notes..."
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                  Payment will be processed to your registered bank account. Ensure your bank details are updated in Shop Settings.
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowWithdrawForm(false)}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 text-sm">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
