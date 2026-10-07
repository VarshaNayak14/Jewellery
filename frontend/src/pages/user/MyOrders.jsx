import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiSearch, FiChevronRight, FiStar, FiCheckCircle } from 'react-icons/fi';
import { orderAPI, reviewAPI } from '../../services/api';
import ReviewModal from '../../components/common/ReviewModal';
import { formatPrice, getOrderDisplayAmount } from '../../utils/helpers';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'];

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  confirmed: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  packed: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  shipped: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  in_transit: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  out_for_delivery: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  delivered: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  returned: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  refunded: 'bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
};

export default function MyOrders({ basePath = '' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    orderAPI.getMyOrders({ limit: 100 }).then(d => setOrders(d.orders || [])).catch(() => {}).finally(() => setLoading(false));
    reviewAPI.getMyReviews()
      .then(d => setReviewedIds(new Set((d.reviews || []).map(r => (r.product?._id || r.product)?.toString()))))
      .catch(() => {});
  }, []);

  // items.product comes back populated ({_id, name, images}) from getMyOrders,
  // not a plain id string — always resolve through _id first.
  const productIdOf = (item) => (item.product?._id || item.product)?.toString();

  const openReview = (item) => setReviewTarget({ productId: productIdOf(item), name: item.name, image: item.image });
  const handleReviewed = () => {
    setReviewedIds(prev => new Set(prev).add(reviewTarget.productId));
    setReviewTarget(null);
  };

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter;
    const matchSearch = !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.some(i => i.name?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">My Orders</h2>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-4">
        <div className="flex gap-2 flex-wrap mb-3">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search by order ID or product name..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiPackage className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <div key={order._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Order Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                    {order.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(getOrderDisplayAmount(order))}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {order.items?.map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity} · ₹{item.price} · {item.size} {item.color}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">₹{(item.price * item.quantity).toFixed(0)}</span>
                    {order.status === 'delivered' && (
                      reviewedIds.has(productIdOf(item)) ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                          <FiCheckCircle className="w-3.5 h-3.5" /> Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={() => openReview(item)}
                          className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 border border-amber-200 dark:border-amber-500/30 rounded-lg px-2.5 py-1.5 shrink-0 transition-colors"
                        >
                          <FiStar className="w-3.5 h-3.5" /> Rate & Review
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{order.paymentMethod === 'cod' ? 'COD' : 'ONLINE PAYMENT'} · {order.paymentMethod === 'cod' ? 'Cash on Delivery' : (order.isPaid ? 'Paid' : 'Unpaid')}</span>
                <div className="flex gap-2">
                  {order.status === 'delivered' ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <FiCheckCircle className="w-3.5 h-3.5" /> Delivered
                    </span>
                  ) : (
                    <Link to={`${basePath}/my-account/tracking?orderId=${order._id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1">
                      Track Order <FiChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                  {order.status === 'delivered' && (order.items || []).some(item => item.product?.returnAvailable !== false) && (
                    <Link to={`${basePath}/my-account/returns?orderId=${order._id}`} className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium">
                      Return/Refund
                    </Link>
                  )}
                  <Link to={`${basePath}/my-account/tickets?order=${order._id}`} className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium">
                    Need help?
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          product={reviewTarget}
          heading="Rate & Review"
          subheading="Share your experience with this product."
          onClose={() => setReviewTarget(null)}
          onSubmitted={handleReviewed}
        />
      )}
    </div>
  );
}
