import { useEffect, useState } from 'react';
import { courierAPI } from '../../services/api';
import { FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import CourierLayout from './CourierLayout';
import toast from 'react-hot-toast';

export default function CourierReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = () => courierAPI.getMyReturns().then(d => setReturns(d.returns || []))
    .catch(err => toast.error(err.message || 'Failed to load returns')).finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  const update = async (id, status) => {
    setUpdating(id);
    try {
      const data = await courierAPI.updateReturnStatus(id, { status });
      setReturns(prev => prev.map(item => item._id === id ? data.return : item));
      toast.success(status === 'approved' ? 'Return approved and customer wallet credited' : 'Pickup marked');
    } catch (err) { toast.error(err.message || 'Failed to update return'); }
    finally { setUpdating(null); }
  };

  return <CourierLayout>
    <div className="flex items-center justify-between mb-6">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Return Pickups</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Collect the return, then approve it to credit the customer wallet.</p></div>
    </div>
    {loading ? <div className="text-center py-16 text-gray-500">Loading returns...</div> : returns.length === 0 ?
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-16 text-center text-gray-500 border border-gray-100 dark:border-gray-800">No assigned returns.</div> :
      <div className="space-y-4">{returns.map(item => <article key={item._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex justify-between gap-3"><div><p className="font-bold text-gray-900 dark:text-gray-100">#{item.order?.orderNumber || '-'}</p>
          <p className="text-sm text-gray-500">{item.product?.name || '-'}</p></div>
          <span className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700 capitalize">{item.status?.replace(/_/g, ' ')}</span></div>
        <div className="mt-4 grid gap-3 border-t border-gray-100 dark:border-gray-800 pt-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"><FiUser className="text-blue-600" />{item.user?.name || item.order?.shippingAddress?.name || 'Customer name unavailable'}</p>
            <p className="flex items-center gap-2"><FiPhone className="text-blue-600" />{item.user?.phone || item.order?.shippingAddress?.phone || 'Phone number unavailable'}</p>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiMapPin className="mt-0.5 shrink-0 text-blue-600" />
            <span>
              {item.order?.shippingAddress?.name && <>{item.order.shippingAddress.name}<br /></>}
              {item.order?.shippingAddress?.street || 'Address unavailable'}<br />
              {[item.order?.shippingAddress?.city, item.order?.shippingAddress?.state].filter(Boolean).join(', ')}
              {item.order?.shippingAddress?.pincode && ` - ${item.order.shippingAddress.pincode}`}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Refund: ₹{item.refundAmount}</p>
        <div className="mt-4 flex justify-end gap-2">{item.status === 'pickup_scheduled' && <button disabled={updating === item._id} onClick={() => update(item._id, 'picked_up')} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Picked up</button>}
          {item.status === 'picked_up' && <button disabled={updating === item._id} onClick={() => update(item._id, 'approved')} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm">Approve & credit wallet</button>}</div>
      </article>)}</div>}
  </CourierLayout>;
}
