import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiRefreshCw, FiPlus, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { returnAPI, orderAPI, uploadAPI } from '../../services/api';

const REASONS = [
  { value: 'wrong_product', label: 'Wrong Product Received' },
  { value: 'damaged', label: 'Damaged Product' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'missing_item', label: 'Missing Item' },
  { value: 'other', label: 'Other' },
];

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  under_review: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  pickup_scheduled: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  refund_initiated: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
  refund_completed: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

export default function MyReturns() {
  const [searchParams] = useSearchParams();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!searchParams.get('orderId'));
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [form, setForm] = useState({ orderId: searchParams.get('orderId') || '', productId: '', reason: '', description: '', refundMethod: 'wallet', images: [], videos: [] });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    Promise.all([
      returnAPI.getMyReturns(),
      orderAPI.getMyOrders({ limit: 100 }),
    ]).then(([retData, ordData]) => {
      setReturns(retData.returns || []);
      setDeliveredOrders((ordData.orders || []).filter(o => o.status === 'delivered' && (o.items || []).some(item => item.product?.returnAvailable !== false)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getOrderItems = () => {
    if (!form.orderId) return [];
    const order = deliveredOrders.find(o => o._id === form.orderId);
    return (order?.items || []).filter(item => item.product?.returnAvailable !== false);
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingMedia(true);
    try {
      const uploaded = await uploadAPI.returnMedia(files);
      setForm(prev => ({
        ...prev,
        images: [...(prev.images || []), ...(uploaded.images || [])],
        videos: [...(prev.videos || []), ...(uploaded.videos || [])],
      }));
      toast.success('Issue media uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.orderId || !form.productId || !form.reason || !form.description) return toast.error('Please fill all required fields');
    setSubmitting(true);
    try {
      await returnAPI.create({
        ...form,
        images: form.images || [],
        videos: form.videos || [],
      });
      toast.success('Return request submitted successfully!');
      setShowForm(false);
      setForm({ orderId: '', productId: '', reason: '', description: '', refundMethod: 'wallet', images: [], videos: [] });
      const data = await returnAPI.getMyReturns();
      setReturns(data.returns || []);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Returns & Refunds</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors">
          <FiPlus className="w-4 h-4" /> Submit Return
        </button>
      </div>

      {/* Return Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Submit Return Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Select Delivered Order *</label>
              <select value={form.orderId} onChange={e => setForm({...form, orderId: e.target.value, productId: ''})}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500">
                <option value="">Select order...</option>
                {deliveredOrders.map(o => (
                  <option key={o._id} value={o._id}>#{o.orderNumber} - ₹{o.totalPrice}</option>
                ))}
              </select>
            </div>
            {form.orderId && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Select Product *</label>
                <select value={form.productId} onChange={e => setForm({...form, productId: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500">
                  <option value="">Select product...</option>
                  {getOrderItems().map((item, i) => (
                    <option key={i} value={item.product?._id || item.product}>{item.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Return Reason *</label>
              <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500">
                <option value="">Select reason...</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Description *</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4}
                placeholder="Describe the issue in detail..."
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Issue Media (Optional)</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-3 text-sm text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600">
                <FiUpload className="h-4 w-4" />
                <span>{uploadingMedia ? 'Uploading...' : 'Upload image or video'}</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} disabled={uploadingMedia} />
              </label>
              {(form.images?.length || form.videos?.length) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.images?.map((src, idx) => (
                    <img key={`img-${idx}`} src={src} alt="return media" className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                  ))}
                  {form.videos?.map((src, idx) => (
                    <video key={`video-${idx}`} src={src} controls className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Refund Method</label>
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                Wallet credit only — returned amount will go to the customer wallet and can be used for future purchases.
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Return Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiRefreshCw className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No return requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map(ret => (
            <div key={ret._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order #{ret.order?.orderNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(ret.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ret.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                  {ret.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {ret.product?.images?.[0] && <img src={ret.product.images[0]} alt="" className="w-12 h-12 object-cover rounded-lg" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ret.product?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reason: {ret.reason?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">{ret.description}</p>
              {(ret.images?.length || ret.videos?.length) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ret.images?.map((src, idx) => (
                    <img key={`ret-img-${idx}`} src={src} alt="return issue" className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                  ))}
                  {ret.videos?.map((src, idx) => (
                    <video key={`ret-video-${idx}`} src={src} controls className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Refund Amount: <strong className="text-gray-900 dark:text-gray-100">₹{ret.refundAmount}</strong></span>
                <span>Method: <strong className="text-gray-900 dark:text-gray-100">{ret.refundMethod?.replace(/_/g, ' ')}</strong></span>
              </div>
              {ret.adminNotes && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Admin Note:</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">{ret.adminNotes}</p>
                </div>
              )}
              {/* Return Flow Timeline */}
              {ret.trackingHistory?.length > 0 && (
                <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Return Timeline:</p>
                  <div className="space-y-1">
                    {ret.trackingHistory.slice(-3).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                        <span className="font-medium capitalize">{t.status?.replace(/_/g, ' ')}</span>
                        <span>·</span>
                        <span>{new Date(t.updatedAt).toLocaleDateString('en-IN')}</span>
                        {t.note && <span>· {t.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
