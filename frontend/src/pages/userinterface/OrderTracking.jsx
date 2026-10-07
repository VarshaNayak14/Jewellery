import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTruck, FiSearch, FiCheck, FiClock, FiMapPin, FiPackage } from 'react-icons/fi';
import { trackingAPI, orderAPI } from '../../services/api';

const TRACKING_STEPS = [
  { status: 'order_placed',             label: 'Order Placed' },
  { status: 'seller_accepted',          label: 'Seller Accepted' },
  { status: 'packed',                   label: 'Packed' },
  { status: 'ready_for_pickup',         label: 'Ready for Pickup' },
  { status: 'picked_up',                label: 'Picked Up by Courier' },
  { status: 'shipped',                  label: 'Shipped' },
  { status: 'reached_sorting_center',   label: 'Sorting Center' },
  { status: 'in_transit',              label: 'In Transit' },
  { status: 'reached_destination_city', label: 'Reached Your City' },
  { status: 'out_for_delivery',         label: 'Out for Delivery' },
  { status: 'delivered',               label: 'Delivered' },
];

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('orderId') || '');
  const [tracking, setTracking] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (id) => {
    const reference = String(id || '').replace(/^#/, '').trim();
    if (!reference) return;
    setLoading(true); setError('');
    try {
      const [trackData, orderData] = await Promise.all([
        trackingAPI.getOrderTracking(reference),
        orderAPI.getById(reference),
      ]);
      const fetchedOrder = orderData.order;
      setOrder(fetchedOrder);
      if (fetchedOrder?.status === 'delivered') {
        setTracking([]);
        return;
      }
      setTracking(trackData.trackingHistory || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (orderId) fetchTracking(orderId); }, []);

  const completedStatuses = tracking.map(t => t.status);
  const lastCompleted = tracking[tracking.length - 1]?.status;
  const lastIdx = TRACKING_STEPS.findIndex(s => s.status === lastCompleted);

  const getStepState = (stepStatus, stepIdx) => {
    if (completedStatuses.includes(stepStatus)) return 'done';
    if (stepIdx === lastIdx + 1) return 'current';
    return 'pending';
  };

  const getTrackEntry = (stepStatus) => tracking.find(t => t.status === stepStatus);

  const progressPct = lastIdx >= 0 ? Math.round(((lastIdx + 1) / TRACKING_STEPS.length) * 100) : 0;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Order Tracking</h2>
        <p className="text-sm text-gray-500 mt-0.5">Track your package in real time</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 mb-5 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Enter Order ID to track..."
              value={orderId} onChange={e => setOrderId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTracking(orderId)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all" />
          </div>
          <button onClick={() => fetchTracking(orderId)} disabled={loading || !orderId}
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-md shadow-rose-200 whitespace-nowrap">
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Track'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl p-4 mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {!order && !loading && (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiTruck className="w-9 h-9 text-violet-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Track your order</p>
          <p className="text-sm text-gray-400">Enter your order ID above to see live tracking updates</p>
        </div>
      )}

      {order && order.status === 'delivered' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 mb-4 text-sm font-medium">
          This order has already been delivered. Tracking is no longer active for delivered orders.
        </div>
      )}

      {order && order.status !== 'delivered' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-4">

          {/* Order Summary Card */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-white/70 text-xs font-medium">Order Number</p>
                  <p className="font-bold text-lg font-mono">#{order.orderNumber}</p>
                </div>
                {order.trackingNumber && (
                  <div className="text-right">
                    <p className="text-white/70 text-xs font-medium">Tracking ID</p>
                    <p className="font-bold font-mono text-sm">{order.trackingNumber}</p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-white/70 text-xs mb-2">
                  <span>Progress</span>
                  <span className="font-bold text-white">{progressPct}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full" />
                </div>
              </div>
            </div>

            {/* Items Preview */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
              <div className="flex -space-x-2">
                {order.items?.slice(0, 3).map((item, i) => (
                  <div key={i} className="w-10 h-10 rounded-xl border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                    {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{order.items?.[0]?.name}</p>
                {order.items?.length > 1 && <p className="text-xs text-gray-400">+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}</p>}
              </div>
              <p className="text-sm font-bold text-gray-900 shrink-0">₹{order.totalPrice}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Tracking Timeline */}
            <div className="flex-1 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-gray-900">Tracking Timeline</h3>
              </div>
              <div className="p-5">
                {tracking.length === 0 ? (
                  <div className="text-center py-8">
                    <FiClock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No tracking updates yet</p>
                    <p className="text-xs text-gray-300 mt-1">Check back soon</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {TRACKING_STEPS.map((step, idx) => {
                      const state = getStepState(step.status, idx);
                      const entry = getTrackEntry(step.status);
                      const isLast = idx === TRACKING_STEPS.length - 1;

                      return (
                        <div key={step.status} className="flex gap-4">
                          {/* Line + Icon */}
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base shrink-0 transition-all ${
                              state === 'done' ? 'bg-emerald-500 shadow-md shadow-emerald-200' :
                              state === 'current' ? 'bg-violet-500 shadow-md shadow-violet-200 animate-pulse' :
                              'bg-gray-100'
                            }`}>
                              {state === 'done'
                                ? <FiCheck className="w-4 h-4 text-white" />
                                : state === 'current'
                                  ? <FiTruck className="w-4 h-4 text-white" />
                                  : <span className="text-xs opacity-50">{String(idx + 1).padStart(2, '0')}</span>}
                            </div>
                            {!isLast && (
                              <div className={`w-0.5 flex-1 my-1 min-h-[20px] rounded-full transition-all ${
                                state === 'done' ? 'bg-emerald-300' : 'bg-gray-100'
                              }`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
                            <p className={`text-sm font-semibold leading-tight ${
                              state === 'done' ? 'text-gray-900' :
                              state === 'current' ? 'text-violet-700' :
                              'text-gray-300'
                            }`}>
                              {step.label}
                            </p>
                            {entry && (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-xs text-gray-500">
                                  {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                                {entry.location && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <FiMapPin className="w-3 h-3" /> {entry.location}
                                  </p>
                                )}
                                {entry.note && <p className="text-xs text-gray-400 italic">{entry.note}</p>}
                              </div>
                            )}
                            {state === 'current' && (
                              <span className="inline-block mt-1 text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full font-semibold">
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="lg:w-64 space-y-4">
              <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">
                    <FiMapPin className="w-4 h-4 text-rose-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Delivery Address</h3>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-gray-900">{order.shippingAddress?.name}</p>
                  <p className="text-sm text-gray-600">{order.shippingAddress?.phone}</p>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {order.shippingAddress?.street},<br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.state}<br />
                    — {order.shippingAddress?.pincode}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
                    <FiPackage className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Order Details</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Total', value: `₹${order.totalPrice}` },
                    { label: 'Payment', value: order.paymentMethod?.toUpperCase() },
                    { label: 'Status', value: order.isPaid ? '✓ Paid' : 'Unpaid' },
                  ].map(d => (
                    <div key={d.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{d.label}</span>
                      <span className="text-xs font-semibold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}