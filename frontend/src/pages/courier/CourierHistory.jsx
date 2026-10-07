import { FiMapPin, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { formatPrice, getOrderDisplayAmount } from '../../utils/helpers';
import CourierLayout from './CourierLayout';
import { useCourierOrders } from './useCourierOrders';

export default function CourierHistory() {
  const { history, loading } = useCourierOrders();

  return (
    <CourierLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Delivery History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Every order you've completed or failed to deliver.</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-16 text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800">No completed deliveries yet.</div>
      ) : (
        <div className="space-y-3">
          {history.map(order => (
            <article key={order._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.user?.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {order.status === 'delivered' && order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-IN') : new Date(order.updatedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'delivered' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                  {order.status === 'delivered' ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiXCircle className="w-3.5 h-3.5" />}
                  {order.status === 'delivered' ? 'Delivered' : 'Failed'}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiMapPin className="mt-0.5 text-gray-400 shrink-0" />
                <span>{order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</span>
              </div>
              <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatPrice(getOrderDisplayAmount(order))} · {order.paymentMethod === 'cod' ? 'COD' : 'Online Payment'}</p>
            </article>
          ))}
        </div>
      )}
    </CourierLayout>
  );
}
