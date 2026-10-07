import { useEffect, useState } from 'react';
import { FiDollarSign, FiPackage, FiTrendingUp } from 'react-icons/fi';
import { courierAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import CourierLayout from './CourierLayout';
import { useCourierOrders } from './useCourierOrders';

export default function CourierEarnings() {
  const { delivered, loading } = useCourierOrders();
  const [fee, setFee] = useState(0);
  const [loadingFee, setLoadingFee] = useState(true);

  useEffect(() => {
    courierAPI.getMe()
      .then(data => setFee(data.courier?.perDeliveryFee || 0))
      .finally(() => setLoadingFee(false));
  }, []);

  const total = delivered.length * fee;

  return (
    <CourierLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Earnings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Based on your per-delivery fee, set by whoever added your account.</p>
      </div>

      {loading || loadingFee ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : fee === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 rounded-2xl p-6 text-sm">
          No per-delivery fee has been set on your account yet. Ask your admin (or the seller who added you) to set one.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center mb-3"><FiDollarSign className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatPrice(total)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total earnings</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-3"><FiPackage className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{delivered.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Deliveries completed</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3"><FiTrendingUp className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatPrice(fee)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fee per delivery</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Delivered Orders</h2>
            {delivered.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No delivered orders yet.</p>
            ) : (
              <div className="space-y-2">
                {delivered.map(order => (
                  <div key={order._id} className="flex items-center justify-between border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-IN') : '—'}</p>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400 text-sm">+{formatPrice(fee)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </CourierLayout>
  );
}
