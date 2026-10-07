import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPackage, FiMapPin, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { orderAPI } from '../services/api';
import { formatPrice, formatDate, getOrderDisplayAmount, getOrderStatusColor, getOrderStatusLabel } from '../utils/helpers';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    orderAPI.getOne(id).then(data => setOrder(data.order)).catch(() => navigate('/my-account/orders')).finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const data = await orderAPI.cancel(id);
      setOrder(data.order);
      toast.success('Order cancelled');
    } catch (err) { toast.error(err.message || 'Cannot cancel order'); }
    finally { setCancelling(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!order) return null;

  const statusIndex = STATUS_STEPS.indexOf(order.status);
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/my-account/orders')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"><FiArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">Order #{order.orderNumber}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="ml-auto flex gap-3">
            <span className={`badge ${getOrderStatusColor(order.status)} px-4 py-2 text-sm font-semibold`}>{getOrderStatusLabel(order.status)}</span>
            {canCancel && <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancel}>Cancel Order</Button>}
          </div>
        </div>

        {/* Status tracker */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <div className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-5 flex items-center gap-2"><FiPackage className="text-blue-600 dark:text-blue-400" /> Order Tracking</h2>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 z-0">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(0, (statusIndex / (STATUS_STEPS.length - 1)) * 100)}%` }} />
              </div>
              {STATUS_STEPS.map((status, i) => (
                <div key={status} className="flex flex-col items-center z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= statusIndex ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                    {i < statusIndex ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-2 capitalize font-medium ${i <= statusIndex ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{status}</span>
                </div>
              ))}
            </div>
            {order.trackingNumber && <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">Tracking: <span className="font-semibold text-blue-600 dark:text-blue-400">{order.trackingNumber}</span></p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Shipping address */}
          <div className="bg-white dark:bg-gray-800/60 rounded-3xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><FiMapPin className="text-blue-600 dark:text-blue-400" /> Shipping Address</h3>
            <p className="text-gray-800 dark:text-gray-100 font-medium">{order.shippingAddress?.name}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{order.shippingAddress?.phone}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{order.shippingAddress?.street},<br />{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
          </div>

          {/* Payment */}
          <div className="bg-white dark:bg-gray-800/60 rounded-3xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><FiCreditCard className="text-blue-600 dark:text-blue-400" /> Payment Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Method</span><span className="font-medium text-gray-800 dark:text-gray-200">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Status</span><span className={order.isPaid ? 'text-green-600 dark:text-green-400 font-medium' : 'text-yellow-600 dark:text-yellow-400 font-medium'}>{order.isPaid ? '✅ Paid' : '⏳ Pending'}</span></div>
              {order.paidAt && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Paid on</span><span className="text-gray-800 dark:text-gray-200">{formatDate(order.paidAt)}</span></div>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <img src={item.image || item.product?.images?.[0]} alt={item.name} className="w-20 h-20 object-cover rounded-xl" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {item.size && `Size: ${item.size}`} {item.color && `• Color: ${item.color}`} • Qty: {item.quantity}
                  </p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-2">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 mt-5 pt-5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Items Subtotal</span><span>{formatPrice(order.itemsPrice)}</span></div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Shipping</span><span>{order.shippingPrice === 0 ? 'FREE' : formatPrice(order.shippingPrice)}</span></div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Tax</span><span>{formatPrice(order.taxPrice)}</span></div>
            {Number(order.walletAmountUsed || 0) > 0 && <div className="flex justify-between text-blue-600 dark:text-blue-400"><span>Wallet Used</span><span>-{formatPrice(order.walletAmountUsed)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base pt-2 border-t border-gray-100 dark:border-gray-700">
              <span>{Number(order.walletAmountUsed || 0) >= Number(order.totalPrice || 0) && Number(order.totalPrice || 0) > 0 ? 'Order Total (Wallet Paid)' : order.paymentMethod === 'cod' ? 'Payable on Delivery' : 'Total Payable'}</span><span>{formatPrice(getOrderDisplayAmount(order))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;