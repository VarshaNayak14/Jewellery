import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiTruck, FiSearch, FiCheck, FiClock } from 'react-icons/fi';
import { trackingAPI, orderAPI } from '../../services/api';

const TRACKING_STEPS = [
  { status: 'order_placed', label: 'Order Placed' },
  { status: 'seller_accepted', label: 'Seller Accepted' },
  { status: 'packed', label: 'Packed' },
  { status: 'ready_for_pickup', label: 'Ready for Pickup' },
  { status: 'picked_up', label: 'Picked Up by Courier' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'reached_sorting_center', label: 'Reached Sorting Center' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'reached_destination_city', label: 'Reached Destination City' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
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
      const myOrders = await orderAPI.getMyOrders({ limit: 100 });
      const matchedOrder = (myOrders.orders || []).find(order =>
        order._id === reference || order.orderNumber?.replace(/^#/, '').toLowerCase() === reference.toLowerCase()
      );
      const orderReference = matchedOrder?._id || reference;
      const [trackData, orderData] = await Promise.all([
        trackingAPI.getOrderTracking(orderReference),
        orderAPI.getById(orderReference),
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

  useEffect(() => {
    if (orderId) fetchTracking(orderId);
  }, []);

  const getStepStatus = (stepStatus) => {
    const completedStatuses = tracking.map(t => t.status);
    if (completedStatuses.includes(stepStatus)) return 'completed';
    const lastCompleted = tracking[tracking.length - 1]?.status;
    const lastIdx = TRACKING_STEPS.findIndex(s => s.status === lastCompleted);
    const thisIdx = TRACKING_STEPS.findIndex(s => s.status === stepStatus);
    if (thisIdx === lastIdx + 1) return 'current';
    return 'pending';
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Order Tracking</h2>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder="Enter Order ID to track..." value={orderId} onChange={e => setOrderId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTracking(orderId)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
          </div>
          <button onClick={() => fetchTracking(orderId)} disabled={loading}
            className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
            {loading ? 'Tracking...' : 'Track'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl p-4 mb-4 text-sm">{error}</div>}

      {order && order.status === 'delivered' && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-5 text-sm text-green-800 dark:text-green-300">
          <p className="font-semibold">This order has already been delivered.</p>
          <p className="mt-1">Tracking is no longer active for delivered orders. You can still view the order details and return or refund options if available.</p>
        </div>
      )}

      {order && order.status !== 'delivered' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Order Info */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                <p className="font-bold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
              </div>
              {order.trackingNumber && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tracking ID</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{order.trackingNumber}</p>
                </div>
              )}
              {order.courierCompany && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Courier Company</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{order.courierCompany}</p>
                </div>
              )}
              {order.estimatedDelivery && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expected Delivery</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                  order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                }`}>{order.status?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="p-6">
            {tracking.length > 0 ? (
              <div className="flex gap-6">
                {/* Steps */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Tracking Timeline</h3>
                  <div className="space-y-0">
                    {TRACKING_STEPS.map((step, idx) => {
                      const stepStatus = getStepStatus(step.status);
                      const trackEntry = tracking.find(t => t.status === step.status);
                      return (
                        <div key={step.status} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              stepStatus === 'completed' ? 'bg-green-500 text-white' :
                              stepStatus === 'current' ? 'bg-blue-500 text-white animate-pulse' :
                              'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}>
                              {stepStatus === 'completed' ? <FiCheck className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
                            </div>
                            {idx < TRACKING_STEPS.length - 1 && (
                              <div className={`w-0.5 h-10 ${stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            )}
                          </div>
                          <div className="pb-8">
                            <p className={`text-sm font-semibold ${stepStatus === 'pending' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                              {step.label}
                            </p>
                            {trackEntry && (
                              <div className="mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(trackEntry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                                {trackEntry.location && <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{trackEntry.location}</p>}
                                {trackEntry.note && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{trackEntry.note}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="w-64 shrink-0">
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Delivery Address</h3>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.shippingAddress?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.shippingAddress?.phone}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{order.shippingAddress?.street}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FiTruck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No tracking updates yet. Check back soon.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!order && !loading && orderId && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiTruck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Enter your order ID above to track your package</p>
        </div>
      )}
    </div>
  );
}
