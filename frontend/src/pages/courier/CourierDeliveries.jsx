import { useState, useEffect, useCallback } from 'react';
import { FiMapPin, FiRefreshCw, FiUpload, FiExternalLink, FiPhone, FiNavigation } from 'react-icons/fi';
import { courierAPI } from '../../services/api';
import { formatPrice, getOrderDisplayAmount } from '../../utils/helpers';
import CourierLayout from './CourierLayout';
import { useCourierOrders } from './useCourierOrders';
import toast from 'react-hot-toast';

// Delivery moves forward only: a courier can pick any later step (or mark it
// failed), never go back to an earlier one.
const FLOW = ['ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
const nextStatuses = (status) => {
  const idx = FLOW.indexOf(status);
  return [...FLOW.slice(idx + 1), 'failed_delivery'];
};
const fullAddress = (a = {}) => [a.street, a.city, a.state, a.pincode].filter(Boolean).join(', ');

export default function CourierDeliveries() {
  const { active, settlements, loading, reload, setOrders } = useCourierOrders();
  const [updating, setUpdating] = useState(null);
  const [proofFiles, setProofFiles] = useState({});
  const [submittingProof, setSubmittingProof] = useState(null);
  // Return pickups assigned to this courier — shown here too so the courier
  // can move them forward without switching pages.
  const [returns, setReturns] = useState([]);
  const [updatingReturn, setUpdatingReturn] = useState(null);
  const loadReturns = useCallback(() => courierAPI.getMyReturns()
    .then(d => setReturns((d.returns || []).filter(r => ['pickup_scheduled', 'picked_up'].includes(r.status))))
    .catch(() => {}), []);
  useEffect(() => { loadReturns(); }, [loadReturns]);
  const refreshAll = () => { reload(); loadReturns(); };

  const updateReturn = async (id, status) => {
    if (status === 'approved' && !window.confirm('Return received? The refund will be credited to the customer wallet.')) return;
    setUpdatingReturn(id);
    try {
      await courierAPI.updateReturnStatus(id, { status });
      toast.success(status === 'approved' ? 'Return completed — customer wallet credited' : 'Return marked as picked up');
      loadReturns();
    } catch (error) { toast.error(error.message || 'Unable to update return'); }
    finally { setUpdatingReturn(null); }
  };

  const updateStatus = async (id, status) => {
    if (!status) return;
    if (status === 'delivered' && !window.confirm('Mark this order as delivered? This cannot be undone.')) return;
    if (status === 'failed_delivery' && !window.confirm('Mark this delivery as failed?')) return;
    setUpdating(id);
    try {
      const data = await courierAPI.updateOrderStatus(id, { status });
      setOrders(prev => prev.map(order => order._id === id ? { ...order, ...data.order, status } : order));
      await reload();
      toast.success('Delivery status updated');
    } catch (error) { toast.error(error.message || 'Unable to update status'); }
    finally { setUpdating(null); }
  };

  const submitProof = async (settlement) => {
    const file = proofFiles[settlement._id];
    if (!file) return toast.error('Select the payment screenshot first');
    setSubmittingProof(settlement._id);
    try {
      const uploaded = file ? await courierAPI.uploadImage(file) : null;
      await courierAPI.submitSellerPayment(settlement._id, { proofUrl: uploaded?.url || '' });
      toast.success('Payment proof sent to seller');
      reload();
    } catch (error) { toast.error(error.message || 'Could not submit proof'); }
    finally { setSubmittingProof(null); }
  };

  return (
    <CourierLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assigned Deliveries</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Update each order as it moves through delivery.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-semibold">{active.length} active</span>
          <button onClick={refreshAll} title="Refresh" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"><FiRefreshCw /></button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading deliveries...</div>
      ) : active.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-16 text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800">No active deliveries right now.</div>
      ) : (
        <div className="space-y-4">
          {active.map(order => (
            <article key={order._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {order.shippingAddress?.name || order.user?.name} · {order.shippingAddress?.phone || order.user?.phone || 'No phone'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold capitalize">{order.status?.replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiMapPin className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{fullAddress(order.shippingAddress)}</span>
              </div>
              {order.items?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {order.items.map((item, i) => (
                    <li key={item._id || i} className="flex items-center gap-2">
                      {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover" />}
                      <span className="truncate">{item.name}</span>
                      <span className="text-xs text-gray-400">× {item.quantity}{item.size ? ` · ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(order.shippingAddress?.phone || order.user?.phone) && (
                  <a href={`tel:${order.shippingAddress?.phone || order.user?.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <FiPhone className="w-3.5 h-3.5" /> Call customer
                  </a>
                )}
                {fullAddress(order.shippingAddress) && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(order.shippingAddress))}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <FiNavigation className="w-3.5 h-3.5" /> Open in Maps
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {order.paymentMethod === 'cod' ? `Collect ${formatPrice(getOrderDisplayAmount(order))} cash (COD)` : `${formatPrice(getOrderDisplayAmount(order))} · Paid online`}
                </span>
                <select disabled={updating === order._id} value="" onChange={e => updateStatus(order._id, e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm capitalize">
                  <option value="">{updating === order._id ? 'Updating...' : 'Update status'}</option>
                  {nextStatuses(order.status).map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
      {returns.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Return Pickups</h2>
          <div className="space-y-3">
            {returns.map(ret => {
              const addr = ret.order?.shippingAddress || {};
              const phone = ret.user?.phone || addr.phone;
              return (
                <article key={ret._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-500/30 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {ret.product?.images?.[0] && <img src={ret.product.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-gray-100">Return · #{ret.order?.orderNumber || '-'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{ret.product?.name || '-'} · Refund {formatPrice(ret.refundAmount || 0)}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold capitalize">{ret.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FiMapPin className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>{ret.user?.name || addr.name} · {fullAddress(addr) || 'Address unavailable'}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {phone && (
                        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <FiPhone className="w-3.5 h-3.5" /> Call customer
                        </a>
                      )}
                      {fullAddress(addr) && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(addr))}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <FiNavigation className="w-3.5 h-3.5" /> Open in Maps
                        </a>
                      )}
                    </div>
                    {ret.status === 'pickup_scheduled' ? (
                      <button disabled={updatingReturn === ret._id} onClick={() => updateReturn(ret._id, 'picked_up')}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                        {updatingReturn === ret._id ? 'Updating...' : 'Mark Picked Up'}
                      </button>
                    ) : (
                      <button disabled={updatingReturn === ret._id} onClick={() => updateReturn(ret._id, 'approved')}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                        {updatingReturn === ret._id ? 'Updating...' : 'Complete Return & Refund'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {settlements.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">COD Seller Settlements</h2>
          <div className="space-y-3">
            {settlements.map(settlement => (
              <article key={settlement._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{settlement.seller?.shopName || 'Seller'} · ₹{settlement.amount}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {settlement.settlementMode === 'manual' ? 'Manual payment · ' : 'Online proof · '}
                      {settlement.status === 'approved' ? 'Completed — seller confirmed'
                        : settlement.settlementMode === 'manual'
                          ? (settlement.status === 'disputed' ? 'Seller has not received it — contact the seller' : 'Give the cash to the seller; the seller will confirm it')
                          : settlement.status === 'disputed' ? 'Disputed — repay and resubmit'
                          : settlement.status === 'submitted' ? 'Screenshot sent — waiting for seller' : 'Pay the seller and upload the screenshot'}
                    </p>
                  </div>
                  {settlement.status !== 'approved' && settlement.settlementMode !== 'manual' && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {settlement.bankDetails?.accountNumber && <p>{[settlement.bankDetails.bankName, `A/C ${settlement.bankDetails.accountNumber}`, settlement.bankDetails.ifscCode].filter(Boolean).join(' · ')}</p>}
                      {settlement.bankDetails?.upiId && <p>UPI {settlement.bankDetails.upiId}</p>}
                      {settlement.bankDetails?.qrCodeImage && <a className="inline-flex items-center gap-1 text-blue-600 mt-1" href={settlement.bankDetails.qrCodeImage} target="_blank" rel="noreferrer">Open seller QR <FiExternalLink /></a>}
                    </div>
                  )}
                </div>
                {settlement.status !== 'approved' && settlement.settlementMode !== 'manual' && settlement.status !== 'submitted' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {<label className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm cursor-pointer">
                      <FiUpload /> {proofFiles[settlement._id]?.name || 'Choose payment screenshot'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => setProofFiles(prev => ({ ...prev, [settlement._id]: e.target.files?.[0] }))} />
                    </label>}
                    <button onClick={() => submitProof(settlement)} disabled={submittingProof === settlement._id}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                      {submittingProof === settlement._id ? 'Submitting...' : settlement.status === 'disputed' ? 'Resubmit Proof' : 'Submit Proof'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : !loading && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <h2 className="font-bold">COD Seller Settlement</h2>
          <p className="mt-1">No seller payment task was returned for these deliveries. Refresh once; if this is a COD order, verify that the product belongs to an approved seller and that the backend server is running the latest code.</p>
        </section>
      )}
    </CourierLayout>
  );
}
