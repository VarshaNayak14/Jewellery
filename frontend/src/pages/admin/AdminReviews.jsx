import { useState, useEffect } from 'react';
import { FiStar, FiTrash2, FiEyeOff, FiEye, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { reviewAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import DateRangeFilter from '../../components/common/DateRangeFilter';

const StarRating = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <FiStar key={s} className={`w-3 h-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-700'}`} />
    ))}
  </div>
);

export default function AdminReviews({ Wrapper = AdminPageWrapper }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewAPI.adminGetAll({ page, limit: 20, from: dateFrom || undefined, to: dateTo || undefined });
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, [page, dateFrom, dateTo]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      await reviewAPI.adminDelete(id);
      toast.success('Review deleted');
      fetchReviews();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleFeatured = async (id) => {
    try {
      const res = await reviewAPI.adminToggleFeatured(id);
      toast.success(res.message || 'Updated');
      fetchReviews();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleVisibility = async (id) => {
    try {
      await reviewAPI.adminToggleVisibility(id);
      toast.success('Review visibility toggled');
      fetchReviews();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <Wrapper title="Review Management" subtitle={`Total: ${total} reviews`}>
      <div className="mb-4">
        <DateRangeFilter from={dateFrom} to={dateTo}
          onFromChange={v => { setDateFrom(v); setPage(1); }}
          onToChange={v => { setDateTo(v); setPage(1); }}
          onClear={() => { setDateFrom(''); setDateTo(''); setPage(1); }} />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">No reviews found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Customer', 'Product', 'Rating', 'Review', 'Verified', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reviews.map(r => (
                  <tr key={r._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/60 ${r.isHidden ? 'opacity-50' : ''}`}>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2 max-w-[160px]">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {r.user?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.user?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{r.product?.name}</td>
                    <td className="px-3 sm:px-4 py-3"><StarRating rating={r.rating} /></td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px]">
                      <p className="font-medium truncate text-gray-800 dark:text-gray-200">{r.title}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2">{r.comment}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      {r.isVerifiedPurchase && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 whitespace-nowrap">✓ Verified</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleFeatured(r._id)} title={r.isFeatured ? 'Remove from homepage' : 'Show on homepage testimonials'}
                          className={`p-1 rounded-md ${r.isFeatured ? 'text-white bg-amber-500' : 'text-gray-400 hover:text-amber-600'}`}>
                          <FiHome className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleVisibility(r._id)} title={r.isHidden ? 'Show' : 'Hide'}
                          className={`${r.isHidden ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300' : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300'}`}>
                          {r.isHidden ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(r._id)} title="Delete" className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={20} total={total} onPageChange={setPage} />
      </div>
    </Wrapper>
  );
}