import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPackage, FiSearch, FiChevronRight, FiTruck, FiRefreshCw, FiX } from 'react-icons/fi';
import { orderAPI } from '../../services/api';
import { formatPrice, getOrderDisplayAmount } from '../../utils/helpers';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

const STATUS_STYLE = {
  pending:          { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  confirmed:        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  packed:           { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-400' },
  shipped:          { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-400' },
  in_transit:       { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  out_for_delivery: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-400' },
  delivered:        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  cancelled:        { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400' },
  returned:         { bg: 'bg-gray-100',   text: 'text-gray-700',    dot: 'bg-gray-400' },
  refunded:         { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    orderAPI.getMyOrders({ limit: 100 })
      .then(d => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter;
    const matchSearch = !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some(i => i.name?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <button onClick={() => { setLoading(true); orderAPI.getMyOrders({ limit: 100 }).then(d => setOrders(d.orders || [])).catch(() => {}).finally(() => setLoading(false)); }}
          className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <FiRefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by order ID or product name..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent shadow-sm" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {STATUS_FILTERS.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === s.key
                ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-500'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-1/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiPackage className="w-9 h-9 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No orders found</p>
          <p className="text-sm text-gray-400">
            {search ? 'Try a different search term' : filter !== 'all' ? 'No orders with this status' : 'You haven\'t placed any orders yet'}
          </p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="mt-4 text-sm text-rose-500 font-semibold">
              Show all orders
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((order, idx) => (
              <motion.div key={order._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200 transition-all">

                {/* Order Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-gray-50/80 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-gray-900">#{order.orderNumber}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(getOrderDisplayAmount(order))}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="p-4">
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {order.items?.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex-shrink-0">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
                          {item.image
                            ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                            : <FiPackage className="w-5 h-5 text-gray-300 m-auto mt-4.5" />}
                        </div>
                      </div>
                    ))}
                    {order.items?.length > 4 && (
                      <div className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded-2xl border border-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">+{order.items.length - 4}</span>
                      </div>
                    )}
                  </div>

                  {order.items?.[0] && (
                    <div className="mt-2.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{order.items[0].name}</p>
                      {order.items.length > 1 && (
                        <p className="text-xs text-gray-400">+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${order.isPaid ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {order.isPaid ? '✓ Paid' : 'Unpaid'}
                    </span>
                    <span className="text-xs text-gray-400 uppercase">{order.paymentMethod}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status !== 'delivered' && order.trackingNumber && (
                      <Link to={`/my-account/tracking?orderId=${order._id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-xl hover:bg-violet-100 transition-colors">
                        <FiTruck className="w-3 h-3" /> Track
                      </Link>
                    )}
                    {order.status === 'delivered' && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                        Delivered
                      </span>
                    )}
                    {order.status === 'delivered' && (
                      <Link to={`/my-account/returns?orderId=${order._id}`}
                        className="text-xs font-semibold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors">
                        Return
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}