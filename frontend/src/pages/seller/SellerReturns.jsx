import { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  under_review: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  refund_completed: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

export default function SellerReturns() {
  const [returns, setReturns] = useState([]);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(returns);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [couriers, setCouriers] = useState([]);

  useEffect(() => {
    Promise.all([sellerAPI.getReturns(), sellerAPI.getCouriers()])
      .then(([returnsData, courierData]) => {
        setReturns(returnsData.returns || []);
        setCouriers((courierData.couriers || []).filter(c => c.status === 'approved' && c.isAvailable));
      })
      .catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const data = await sellerAPI.updateReturn(id, { status });
      setReturns(prev => prev.map(item => item._id === id ? { ...item, ...data.return, status } : item));
      toast.success('Return status updated');
    } catch (err) { toast.error(err.message || 'Failed to update return'); }
    finally { setUpdatingId(null); }
  };

  const assignCourier = async (id, courierId) => {
    if (!courierId) return;
    setUpdatingId(id);
    try {
      const data = await sellerAPI.assignCourierToReturn(id, { courierId });
      setReturns(prev => prev.map(item => item._id === id ? data.return : item));
      toast.success('Courier assigned');
    } catch (err) { toast.error(err.message || 'Failed to assign courier'); }
    finally { setUpdatingId(null); }
  };

  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Return Requests</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiRefreshCw className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No return requests yet</p>
        </div>
      ) : (
        <>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {['Order #', 'Customer', 'Product', 'Reason', 'Refund', 'Status', 'Courier', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tablePage.pageItems.map(r => (
                <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">#{r.order?.orderNumber}</td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.product?.name?.slice(0, 30) || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{r.reason?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">₹{r.refundAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                      {r.status?.replace(/_/g, ' ')}
                    </span>
                    {['pending', 'under_review', 'approved'].includes(r.status) && (
                      <select value="" disabled={updatingId === r._id} onChange={e => updateStatus(r._id, e.target.value)}
                        className="block mt-2 text-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded px-1.5 py-1">
                        <option value="">Update</option>
                        {r.status === 'pending' && <option value="under_review">Review</option>}
                        {r.status !== 'approved' && <option value="approved">Approve</option>}
                        <option value="rejected">Reject</option>
                        {r.status === 'approved' && <option value="pickup_scheduled">Schedule Pickup</option>}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.assignedCourier?.user?.name || ['approved', 'pickup_scheduled'].includes(r.status) ? (
                      r.assignedCourier?.user?.name || (
                        <select disabled={updatingId === r._id} value="" onChange={e => assignCourier(r._id, e.target.value)}
                          className="text-xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded px-1.5 py-1">
                          <option value="">{couriers.length ? 'Assign' : 'No active courier'}</option>
                          {couriers.map(c => <option key={c._id} value={c._id}>{c.user?.name || c.user?.email}</option>)}
                        </select>
                      )
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
        </>
      )}
      </div>
    </SellerLayout>
  );
}
