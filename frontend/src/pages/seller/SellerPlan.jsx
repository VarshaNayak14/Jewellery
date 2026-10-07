import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiAlertTriangle, FiCreditCard, FiArrowUp, FiArrowDown, FiRefreshCw, FiX, FiClock, FiSmartphone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import { sellerAPI, settingsAPI } from '../../services/api';
import BankPaymentModal from '../../components/seller/BankPaymentModal';
import { useSellerStore } from '../../store/sellerStore';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const COLOR = {
  gray: { dot: 'bg-gray-400', ring: 'ring-gray-300 dark:ring-gray-600' },
  blue: { dot: 'bg-blue-500', ring: 'ring-blue-400' },
  yellow: { dot: 'bg-yellow-400', ring: 'ring-yellow-400' },
  purple: { dot: 'bg-purple-500', ring: 'ring-purple-400' },
};
const SCOPE_LABEL = { tehsil: 'Your tehsil', district: 'Your district', state: 'Your whole state', india: 'All over India' };
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const period = (plan) => (plan?.billingCycle === 'monthly' ? 'month' : 'year');
const limitLabel = (n) => (n === -1 || n === undefined || n === null ? 'Unlimited products' : `Up to ${n} products`);
const withoutProductLimitFeature = (features = []) => features.filter(
  feature => !/^(up to \d+|unlimited)\s+product\s+listings?$/i.test(String(feature).trim()),
);
const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800';

export default function SellerPlan() {
  const { updateSeller, refreshSeller } = useSellerStore();
  const [data, setData] = useState(null);
  // Plan payment history table shows 10 rows per page.
  const tablePage = usePagedList(data?.payments, 10);
  const [loading, setLoading] = useState(true);
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [paying, setPaying] = useState(false);
  const [bankPlan, setBankPlan] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const load = useCallback(() => sellerAPI.getSellerPlans()
    .then(setData)
    .catch(err => toast.error(err.message || 'Failed to load plans'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    settingsAPI.getPaymentDetails().then(d => setPaymentDetails(d.paymentDetails || null)).catch(() => {});
  }, []);
  const razorpayEnabled = Boolean(paymentDetails?.razorpayEnabled);
  const bankEnabled = Boolean(paymentDetails?.bankTransferEnabled);

  const submitBank = async (paymentReference, paymentScreenshot) => {
    await sellerAPI.submitSellerPlanBankPayment({ planId: bankPlan._id, paymentReference, paymentScreenshot });
    toast.success('Payment submitted. Your plan will be activated after admin verification.');
    setBankPlan(null);
    setConfirmPlan(null);
    load();
  };

  const onActivated = async (result, planName) => {
    updateSeller(result.seller);
    await refreshSeller();
    toast.success(`${planName} plan is now active`);
    setConfirmPlan(null);
    load();
  };

  const pay = async (plan) => {
    setPaying(true);
    try {
      const order = await sellerAPI.createSellerPlanPayment({ planId: plan._id });
      if (order.freeUpgrade) {
        const result = await sellerAPI.activateSellerPlan({ planId: plan._id });
        await onActivated(result, plan.name);
        setPaying(false);
        return;
      }
      if (!window.Razorpay) throw new Error('Payment gateway is loading. Please try again.');
      const checkout = new window.Razorpay({
        key: order.key, amount: order.amount, currency: order.currency, name: 'growthkarts',
        description: `${plan.name} plan - ${rupees(order.pricing?.payableAmount ?? plan.price)}`,
        order_id: order.razorpayOrderId, theme: { color: '#a98345' },
        handler: async (response) => {
          try {
            const result = await sellerAPI.activateSellerPlan({
              planId: plan._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await onActivated(result, plan.name);
          } catch (err) {
            toast.error(err.message || 'Payment received but plan activation failed. Contact support.');
          } finally { setPaying(false); }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.on('payment.failed', () => { toast.error('Payment failed. Please try again.'); setPaying(false); });
      checkout.open();
    } catch (err) {
      toast.error(err.message || 'Could not start payment');
      setPaying(false);
    }
  };

  if (loading) return <SellerLayout><div className="p-4 text-center text-gray-400 dark:text-gray-500">Loading plans...</div></SellerLayout>;
  if (!data) return <SellerLayout><div className="p-4 text-center text-gray-400 dark:text-gray-500">Could not load plans.</div></SellerLayout>;

  const { plans, current, productCount, payments, pendingPayment } = data;
  const currentPlan = plans.find(p => String(p._id) === String(current.plan));
  const snap = current.planSnapshot || {};
  const currentPrice = currentPlan?.price ?? snap.price ?? 0;
  const daysLeft = current.planExpiresAt ? Math.ceil((new Date(current.planExpiresAt) - Date.now()) / 86400000) : null;
  const limit = currentPlan?.productLimit ?? snap.productLimit;
  const currentFeatures = withoutProductLimitFeature(currentPlan?.features);

  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Plan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">See your current plan and switch to another plan anytime — just pay, no new registration.</p>
        </div>

        {current.expired && (
          <div className="flex items-start gap-3 mb-5 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <FiAlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">Your plan expired on {fmtDate(current.planExpiresAt)}</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">Your shop is hidden and the seller panel is locked. Renew or pick a plan below to continue — your shop, products and orders are all safe.</p>
            </div>
          </div>
        )}

        {pendingPayment && (
          <div className="flex items-start gap-3 mb-5 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
            <FiClock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">{pendingPayment.planName} payment is waiting for admin verification</p>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                {rupees(pendingPayment.amount)} via bank / QR · UTR {pendingPayment.transactionId} · submitted {fmtDate(pendingPayment.createdAt)}.
                The plan activates as soon as admin verifies it.
              </p>
            </div>
          </div>
        )}

        {/* Current plan */}
        <div className={`${cardCls} p-5 sm:p-6 mb-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Current plan</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-3 h-3 rounded-full ${COLOR[currentPlan?.color]?.dot || 'bg-indigo-500'}`} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{snap.name || currentPlan?.name || 'No plan'}</h2>
                {current.expired
                  ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">EXPIRED</span>
                  : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">ACTIVE</span>}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-1"><span className="text-lg font-bold">{rupees(currentPrice)}</span> / {period(currentPlan)}</p>
            </div>
            {currentPlan && (
              <button onClick={() => setConfirmPlan(currentPlan)} disabled={!!pendingPayment}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                <FiRefreshCw className="w-4 h-4" /> Renew {currentPlan.name}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Started on', value: fmtDate(current.planPurchasedAt) },
              { label: current.expired ? 'Expired on' : 'Valid till', value: fmtDate(current.planExpiresAt) },
              { label: 'Days left', value: daysLeft === null ? '—' : Math.max(0, daysLeft) },
              { label: 'Products used', value: `${productCount} / ${limit === -1 || limit == null ? '∞' : limit}` },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {!current.expired && daysLeft !== null && daysLeft <= 30 && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><FiClock className="w-4 h-4" /> Your plan ends in {daysLeft} day(s). Renew now to avoid your shop going offline.</p>
          )}
          {(limit != null || currentFeatures.length > 0) && (
            <ul className="mt-4 grid sm:grid-cols-2 gap-1.5">
              {limit != null && (
                <li key="product-limit" className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                  <FiCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {limit === -1 ? 'Unlimited product listings' : `Up to ${limit} product listings`}
                </li>
              )}
              {currentFeatures.map(f => (
                <li key={f} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"><FiCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {f}</li>
              ))}
            </ul>
          )}
        </div>

        {/* All plans */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Change plan</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Credit from your last plan payment is adjusted automatically (100% within 60 days of purchase, 50% after that). The new plan starts today.</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {plans.map(plan => {
            const isCurrent = String(plan._id) === String(current.plan);
            const isUp = plan.price > currentPrice;
            const { pricing = {} } = plan;
            const overLimit = plan.productLimit !== -1 && productCount > plan.productLimit;
            return (
              <div key={plan._id} className={`${cardCls} p-5 flex flex-col relative ${isCurrent ? `ring-2 ${COLOR[plan.color]?.ring || 'ring-indigo-400'}` : ''}`}>
                {(isCurrent || plan.badge) && (
                  <span className={`absolute -top-2.5 left-5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'}`}>
                    {isCurrent ? 'Your plan' : plan.badge}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${COLOR[plan.color]?.dot || 'bg-indigo-500'}`} />
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                </div>
                <p className="mt-2"><span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{rupees(plan.price)}</span><span className="text-sm text-gray-400"> / {period(plan)}</span></p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{limitLabel(plan.productLimit)} · {SCOPE_LABEL[plan.visibilityScope] || plan.visibilityScope}</p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {withoutProductLimitFeature(plan.features).map(f => (
                    <li key={f} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5"><FiCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {f}</li>
                  ))}
                </ul>
                {pricing.creditAmount > 0 && (
                  <p className="mt-3 text-[11px] text-green-600 dark:text-green-400">{rupees(pricing.creditAmount)} credit applied → you pay <b>{rupees(pricing.payableAmount)}</b></p>
                )}
                {overLimit && (
                  <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">You have {productCount} products; this plan allows {plan.productLimit}. Delete {productCount - plan.productLimit} product(s) to switch.</p>
                )}
                <button onClick={() => setConfirmPlan(plan)} disabled={paying || !!pendingPayment || overLimit}
                  className={`mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 ${
                    isCurrent ? 'border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                      : isUp ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {isCurrent ? <><FiRefreshCw className="w-4 h-4" /> Renew</> : isUp ? <><FiArrowUp className="w-4 h-4" /> Upgrade</> : <><FiArrowDown className="w-4 h-4" /> Switch</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment history */}
        <div className={`${cardCls} p-5`}>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><FiCreditCard className="w-4 h-4" /> Plan payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No plan payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Plan</th>
                    <th className="py-2 pr-3 font-medium">Amount</th><th className="py-2 pr-3 font-medium">Valid till</th><th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tablePage.pageItems.map(p => (
                    <tr key={p._id} className="text-gray-700 dark:text-gray-300">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(p.purchasedAt || p.createdAt)}</td>
                      <td className="py-2 pr-3">{p.planName}</td>
                      <td className="py-2 pr-3">{rupees(p.amount)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(p.expiresAt)}</td>
                      <td className="py-2 capitalize">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
            </div>
          )}
        </div>
      </div>

      {/* Confirm & pay */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !paying && setConfirmPlan(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {String(confirmPlan._id) === String(current.plan) ? 'Renew' : 'Switch to'} {confirmPlan.name}
              </h3>
              <button onClick={() => setConfirmPlan(null)} disabled={paying} className="p-1 text-gray-400 hover:text-gray-600"><FiX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-300"><span>{confirmPlan.name} plan (1 {period(confirmPlan)})</span><span>{rupees(confirmPlan.price)}</span></div>
              {confirmPlan.pricing?.creditAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Credit from {confirmPlan.pricing.previousPlanName || 'previous plan'} ({confirmPlan.pricing.creditPercent}%)</span>
                  <span>− {rupees(confirmPlan.pricing.creditAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t border-gray-100 dark:border-gray-800 pt-2">
                <span>To pay now</span><span>{rupees(confirmPlan.pricing?.payableAmount ?? confirmPlan.price)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              The {confirmPlan.name} plan starts today and replaces your current plan. Your shop, products, orders and account stay exactly as they are.
            </p>
            {(confirmPlan.pricing?.payableAmount ?? confirmPlan.price) > 0 ? (
              <>
                <p className="mt-5 mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Choose payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => pay(confirmPlan)} disabled={paying || !razorpayEnabled}
                    title={razorpayEnabled ? '' : 'Online payment is not enabled right now'}
                    className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-40">
                    <FiCreditCard className="w-4 h-4" />
                    {paying ? 'Processing...' : 'Pay Online'}
                    <span className="text-[10px] font-normal opacity-80">UPI · Card · Netbanking</span>
                  </button>
                  <button onClick={() => setBankPlan(confirmPlan)} disabled={paying || !bankEnabled}
                    title={bankEnabled ? '' : 'Bank / QR payment is not enabled right now'}
                    className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
                    <FiSmartphone className="w-4 h-4" />
                    Bank / QR
                    <span className="text-[10px] font-normal opacity-80">Admin verifies UTR</span>
                  </button>
                </div>
                {paymentDetails && !razorpayEnabled && !bankEnabled && (
                  <p className="mt-2 text-xs text-red-500">No payment method is enabled right now. Please contact the admin.</p>
                )}
              </>
            ) : (
              <button onClick={() => pay(confirmPlan)} disabled={paying}
                className="mt-5 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-60">
                {paying ? 'Processing...' : 'Activate with credit'}
              </button>
            )}
          </div>
        </div>
      )}

      {bankPlan && (
        <BankPaymentModal
          planName={bankPlan.name}
          amount={bankPlan.pricing?.payableAmount ?? bankPlan.price}
          note="Pay the exact payable amount below, then submit your UTR. Admin will verify it and your new plan starts from that day."
          details={paymentDetails}
          onClose={() => setBankPlan(null)}
          onSubmit={submitBank}
        />
      )}
    </SellerLayout>
  );
}
