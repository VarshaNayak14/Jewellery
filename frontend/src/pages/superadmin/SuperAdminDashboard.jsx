import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiUserCheck, FiShoppingBag, FiUsers, FiPackage,
  FiDollarSign, FiAlertCircle,
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { superAdminAPI } from '../../services/api';
import { SuperAdminPageWrapper } from './SuperAdminLayout';

// Fixed palette cycled by index for pie/donut slices — keeps colors consistent
// and theme-neutral across light/dark.
const PIE_COLORS = ['#a98345', '#10b981', '#f59e0b', '#ef4444', '#7a1f45', '#06b6d4'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatMonthLabel = (m) => `${MONTH_LABELS[(m?.month || 1) - 1]} '${String(m?.year ?? '').slice(-2)}`;

const StatCard = ({ title, value, icon: Icon, color, prefix = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow min-w-0"
  >
    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 mb-4 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
      {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : (value ?? '—')}
    </p>
    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium truncate">{title}</p>
  </motion.div>
);

const ChartCard = ({ title, children, empty }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</p>
    {empty ? (
      <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">Not enough data yet</p>
    ) : children}
  </div>
);

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [sellersByPlan, setSellersByPlan] = useState([]);
  const [sellersByStatus, setSellersByStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminAPI.getDashboardStats()
      .then(d => {
        setStats(d.stats);
        setRevenueByMonth(d.revenueByMonth || []);
        setSellersByPlan(d.sellersByPlan || []);
        setSellersByStatus(d.sellersByStatus || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const revenueChart = revenueByMonth.map(m => ({ label: formatMonthLabel(m._id), revenue: m.revenue || 0 }));
  const planChart = sellersByPlan.map(p => ({ name: p._id || 'Unknown', count: p.count || 0 }));
  const statusChart = sellersByStatus.map(s => ({ name: s._id || 'Unknown', value: s.count || 0 }));

  return (
    <SuperAdminPageWrapper title="Platform Overview" subtitle="Full visibility across the entire growthkarts platform">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 sm:h-32 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard title="Subscription Revenue" value={stats?.totalRevenue} prefix="₹"
              icon={FiDollarSign} color="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
            <StatCard title="Total Products" value={stats?.totalProducts}
              icon={FiPackage} color="bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
            <StatCard title="Admin Staff" value={stats?.totalAdmins}
              icon={FiUserCheck} color="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
            <StatCard title="Total Customers" value={stats?.totalUsers}
              icon={FiUsers} color="bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400" />
            <StatCard title="Total Sellers" value={stats?.totalSellers}
              icon={FiShoppingBag} color="bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" />
            <StatCard title="Pending Seller Approvals" value={stats?.pendingSellers}
              icon={FiAlertCircle} color="bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <ChartCard title="Subscription Revenue (last 12 months)" empty={revenueChart.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="superAdminRevenueTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a98345" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a98345" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#a98345" strokeWidth={2} fill="url(#superAdminRevenueTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <ChartCard title="Sellers by Plan" empty={planChart.length === 0}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={planChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={30} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="count" name="Sellers" fill="#a98345" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Sellers by Status" empty={statusChart.length === 0}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                      {statusChart.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </SuperAdminPageWrapper>
  );
}
