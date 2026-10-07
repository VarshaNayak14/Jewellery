import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FiPackage, FiStar, FiTrendingUp, FiArrowRight, FiPlus, FiBox, FiBell, FiAlertCircle, FiShield, FiBarChart2 } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import { useSellerStore } from '../../store/sellerStore';
import SellerLayout from './SellerLayout';
import ShareStoreCard from '../../components/seller/ShareStoreCard';
import { capsOf } from '../../utils/planFeatures';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUICK_LINKS = [
  { to: '/seller/inventory', label: 'Inventory', icon: FiBox },
  { to: '/seller/reviews', label: 'Reviews', icon: FiStar },
  { to: '/seller/analytics', label: 'Growth', icon: FiTrendingUp },
];

const StatCard = ({ title, value, icon: Icon, color, subtext, linkTo }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-500/30 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-2xl flex items-center justify-center`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
          View <FiArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
    <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}
  </motion.div>
);

export default function SellerDashboard() {
  const { seller } = useSellerStore();
  const [stats, setStats] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, productsData] = await Promise.all([
          sellerAPI.getDashboardStats(),
          sellerAPI.getProducts({ limit: 5 }),
        ]);
        setStats(statsData.stats);
        setRevenueByMonth(statsData.revenueByMonth || []);
        setProducts(productsData.products || []);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const revenueChartData = revenueByMonth.map(m => ({
    label: MONTHS[(m._id?.month || 1) - 1],
    revenue: m.revenue,
  }));

  const productHealthData = stats ? [
    { name: 'Total', value: stats.totalProducts || 0, fill: '#a98345' },
    { name: 'Active', value: stats.activeProducts || 0, fill: '#16a34a' },
    { name: 'Out of Stock', value: stats.outOfStock || 0, fill: '#dc2626' },
  ] : [];

  const isPendingApproval = seller?.status === 'pending';

  return (
    <SellerLayout>
      {/* Approval banner — Flipkart-style account status strip */}
      {isPendingApproval && (
        <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-400 rounded-2xl px-4 py-3 mb-6 text-sm">
          <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Your seller account is awaiting admin approval. Some features will unlock once you're verified.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {seller?.shopName}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Here's what's happening in your shop today.</p>
        </div>
        <Link to="/seller/products?add=1"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors text-sm shadow-md w-full sm:w-auto">
          <FiPlus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {!isPendingApproval && capsOf(seller?.planSnapshot).storefront && <ShareStoreCard seller={seller} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8">
        {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-600 transition-all">
            <Icon className="w-4 h-4" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid — listing health, not sales (no platform orders in this model) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Products" icon={FiPackage} color="bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
              value={stats?.totalProducts || 0} subtext={`${stats?.activeProducts || 0} active`}
              linkTo="/seller/products"
            />
            <StatCard
              title="Out of Stock" icon={FiBox} color="bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
              value={stats?.outOfStock || 0} subtext="Products with 0 stock"
              linkTo="/seller/inventory"
            />
            <StatCard
              title="Rating" icon={FiStar} color="bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              value={stats?.avgRating || '—'} subtext={`${stats?.totalReviews || 0} reviews`}
              linkTo="/seller/reviews"
            />
            <StatCard
              title="KYC Status" icon={FiShield} color="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              value={(stats?.kycStatus || 'not submitted').replace('_', ' ')} subtext={stats?.plan ? `${stats.plan} plan` : ''}
              linkTo="/seller/kyc"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            {/* Revenue Trend */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Revenue Trend (last 6 months)</h3>
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sellerRevenueTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a98345" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#a98345" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#a98345" strokeWidth={2} fill="url(#sellerRevenueTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <FiTrendingUp className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No revenue yet</p>
                </div>
              )}
            </div>

            {/* Product Health */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Product Snapshot</h3>
              {productHealthData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={productHealthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={30} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {productHealthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <FiBarChart2 className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No products yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">My Products</h3>
              <Link to="/seller/products" className="text-xs text-blue-600 font-medium hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {products.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                  <FiPackage className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No products yet</p>
                  <Link to="/seller/products?add=1" className="text-blue-600 text-sm font-medium mt-2 inline-block">Add your first product →</Link>
                </div>
              ) : products.map(p => (
                <div key={p._id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-3">
                  <img src={p.images?.[0] || p.variants?.[0]?.images?.[0]} alt={p.name}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{p.category} · {p.subCategory || p.productType || '—'}</p>
                  </div>
                  <div className="sm:text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">₹{p.price}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.stock} in stock</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </SellerLayout>
  );
}
