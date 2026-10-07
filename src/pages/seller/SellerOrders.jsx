import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiChevronDown, FiPackage, FiTruck, FiX } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import SellerLayout from './SellerLayout';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:            { label: 'Pending',            color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', badge: '🕐' },
  confirmed:          { label: 'Confirmed',          color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',    badge: '✅' },
  packed:             { label: 'Packed',             color: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', badge: '📦' },
  ready_for_pickup:   { label: 'Ready for Pickup',   color: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400', badge: '🚛' },
  picked_up:          { label: 'Picked Up',          color: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', badge: '📤' },
  in_transit:         { label: 'In Transit',         color: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', badge: '🚚' },
  out_for_delivery:   { label: 'Out for Delivery',   color: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', badge: '🚚' },
  shipped:            { label: 'Shipped',            color: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', badge: '🚚' },
  delivered:          { label: 'Delivered',          color: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',   badge: '✅' },
  failed_delivery:    { label: 'Delivery Failed',    color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',       badge: '⚠️' },
  cancelled:          { label: 'Cancelled',          color: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',       badge: '❌' },
};

const SELLER_ACTIONS = {
  pending:    ['confirmed'],
  confirmed:  ['packed'],
  packed:     ['shipped'],
  shipped:    ['delivered'],
};

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Assign Courier modal
  const [assignOrder, setAssignOrder] = useState(null);
  const [approvedCouriers, setApprovedCouriers] = useState([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await sellerAPI.getOrders({ status: statusFilter || undefined });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const handleStatusUpdate = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await sellerAPI.updateOrderStatus(orderId, { status });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (err) { toast.error(err.message || 'Failed to update'); }
    finally { setUpdatingId(null); }
  };

  const openAssignModal = async (order) => {
    setAssignOrder(order);
    setSelectedCourierId('');
    setLoadingCouriers(true);
    try {
      const data = await sellerAPI.getCouriers();
      setApprovedCouriers((data.couriers || []).filter(c => c.status !== 'suspended' && c.user?.isActive !== false));
    } catch (err) { toast.error('Could not load couriers: ' + err.message); }
    finally { setLoadingCouriers(false); }
  };

  const handleAssignCourier = async () => {
    if (!selectedCourierId) { toast.error('Please select a courier'); return; }
    setAssigning(true);
    try {
      await sellerAPI.assignCourierToOrder(assignOrder._id, { courierId: selectedCourierId });
      toast.success('Courier assigned successfully! 🚚');
      setAssignOrder(null);
      fetchOrders();
    } catch (err) { toast.error(err.message || 'Failed to assign courier'); }
    finally { setAssigning(false); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <SellerLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{total} orders for your products</p>
        </div>

        {/* Status filter */}
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-4 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-900 dark:text-gray-100 appearance-none">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-24 animate-pulse" />
        )) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 py-16 text-center">
            <FiPackage className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No orders found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Orders for your products will appear here</p>
          </div>
        ) : orders.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const nextStatuses = SELLER_ACTIONS[order.status] || [];
          const itemsTotal = order.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0;

          return (
            <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Order header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cfg.badge}</span>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {order.user?.name} · {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{fmt(Math.max(itemsTotal - Number(order.walletAmountUsed || 0), 0))}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{order.items?.length} item(s)</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>

              {/* Order items (seller's products only) */}
              <div className="px-5 py-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                      {item.image && <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />}
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{item.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">×{item.quantity} · {fmt(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping info */}
                {order.shippingAddress && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    📍 {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                )}

                {/* Courier info, once assigned */}
                {order.assignedCourier && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-1.5">
                    <FiTruck className="w-3.5 h-3.5" /> Handed off to your courier — they'll update delivery status from here.
                  </p>
                )}

                {/* Actions */}
                {(nextStatuses.length > 0 || (order.status === 'packed' && !order.assignedCourier)) && (
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map(s => (
                      <button key={s} onClick={() => handleStatusUpdate(order._id, s)}
                        disabled={updatingId === order._id}
                        className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        {updatingId === order._id ? 'Updating...' : `Mark as ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                      </button>
                    ))}
                    {['pending', 'confirmed', 'packed'].includes(order.status) && !order.assignedCourier && (
                      <button onClick={() => openAssignModal(order)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-2 border-purple-500 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors">
                        <FiTruck className="w-4 h-4" /> Assign Courier
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Assign Courier Modal */}
      <AnimatePresence>
        {assignOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssignOrder(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FiTruck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" /> Assign Courier</h3>
                <button onClick={() => setAssignOrder(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><FiX className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Order #{assignOrder.orderNumber}</p>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Select Courier *</label>
              {loadingCouriers ? (
                <div className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 dark:text-gray-500 animate-pulse dark:bg-gray-800">Loading couriers...</div>
              ) : approvedCouriers.length === 0 ? (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl px-3 py-3">
                  ⚠️ No active couriers yet. Add one from <a href="/seller/couriers" className="underline font-medium">My Delivery Partners</a> to assign it directly.
                </p>
              ) : (
                <select value={selectedCourierId} onChange={e => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                  <option value="">-- Select courier --</option>
                  {approvedCouriers.map(c => (
                    <option key={c._id} value={c._id}>{c.user?.name} · {c.vehicleType}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setAssignOrder(null)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleAssignCourier} disabled={assigning || approvedCouriers.length === 0}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                  {assigning ? 'Assigning...' : '🚚 Assign Courier'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
