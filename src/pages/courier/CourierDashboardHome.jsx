import { Link } from 'react-router-dom';
import { FiPackage, FiCheckCircle, FiXCircle, FiTruck, FiArrowRight } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import CourierLayout from './CourierLayout';
import { useCourierOrders } from './useCourierOrders';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function CourierDashboardHome() {
  const { user } = useAuthStore();
  const { orders, active, delivered, failed, loading } = useCourierOrders();

  return (
    <CourierLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's how your deliveries are looking.</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={FiPackage} label="Total assigned" value={orders.length} color="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" />
            <StatCard icon={FiTruck} label="Active deliveries" value={active.length} color="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400" />
            <StatCard icon={FiCheckCircle} label="Delivered" value={delivered.length} color="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" />
            <StatCard icon={FiXCircle} label="Failed" value={failed.length} color="bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Deliveries needing action</h2>
              <Link to="/courier/deliveries" className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                View all <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Nothing pending — you're all caught up.</p>
            ) : (
              <div className="space-y-3">
                {active.slice(0, 5).map(order => (
                  <div key={order._id} className="flex items-center justify-between border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.user?.name}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold capitalize">{order.status?.replace(/_/g, ' ')}</span>
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
