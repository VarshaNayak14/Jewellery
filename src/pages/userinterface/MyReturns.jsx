import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiPlus, FiX, FiPackage, FiChevronDown, FiChevronUp, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { returnAPI, orderAPI, uploadAPI } from '../../services/api';

const REASONS = [
  { value: 'wrong_product', label: 'Wrong Product Received' },
  { value: 'damaged',       label: 'Damaged Product' },
  { value: 'size_issue',    label: 'Size Issue' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'missing_item',  label: 'Missing Item' },
  { value: 'other',         label: 'Other' },
];

const STATUS_STYLE = {
  pending:           { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  under_review:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  approved:          { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  rejected:          { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400' },
  pickup_scheduled:  { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-400' },
  refund_initiated:  { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-400' },
  refund_completed:  { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-400' },
};

const INPUT_CLS = 'w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function ReturnCard({ ret }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start gap-3">
          {ret.product?.images?.[0] && (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
              <img src={ret.product.images[0]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-bold text-gray-900 truncate">{ret.product?.name}</p>
              <StatusBadge status={ret.status} />
            </div>
            <p className="text-xs text-gray-500 font-mono">Order #{ret.order?.orderNumber}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(ret.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs text-gray-400">Refund Amount</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">₹{ret.refundAmount}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs text-gray-400">Refund Method</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 capitalize">{ret.refundMethod?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 bg-gray-50 rounded-2xl p-3 mt-3 leading-relaxed">{ret.description}</p>

        {(ret.images?.length || ret.videos?.length) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ret.images?.map((src, idx) => <img key={`ret-img-${idx}`} src={src} alt="issue" className="h-16 w-16 object-cover rounded-xl border border-gray-100" />)}
            {ret.videos?.map((src, idx) => <video key={`ret-video-${idx}`} src={src} controls className="h-16 w-16 object-cover rounded-xl border border-gray-100" />)}
          </div>
        )}

        {(ret.adminNotes || ret.trackingHistory?.length > 0) && (
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold mt-3 hover:text-violet-700 transition-colors">
            {expanded ? <><FiChevronUp className="w-3.5 h-3.5" /> Hide Details</> : <><FiChevronDown className="w-3.5 h-3.5" /> View Details</>}
          </button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {ret.adminNotes && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-2xl p-3">
                  <p className="text-xs font-bold text-blue-800 mb-1">Admin Note</p>
                  <p className="text-xs text-blue-700">{ret.adminNotes}</p>
                </div>
              )}
              {ret.trackingHistory?.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-gray-700 mb-2">Return Timeline</p>
                  <div className="space-y-2">
                    {ret.trackingHistory.slice(-4).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="font-semibold capitalize">{t.status?.replace(/_/g, ' ')}</span>
                        <span className="text-gray-300">·</span>
                        <span>{new Date(t.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        {t.note && <><span className="text-gray-300">·</span><span className="text-gray-400">{t.note}</span></>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function MyReturns() {
  const [searchParams] = useSearchParams();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!searchParams.get('orderId'));
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [form, setForm] = useState({
    orderId: searchParams.get('orderId') || '',
    productId: '', reason: '', description: '', refundMethod: 'wallet',
    images: [], videos: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    if (typeof returnAPI?.getMyReturns !== 'function') { setLoading(false); return; }
    Promise.all([
      returnAPI.getMyReturns(),
      orderAPI.getMyOrders({ limit: 100 }),
    ]).then(([retData, ordData]) => {
      setReturns(retData.returns || []);
      setDeliveredOrders((ordData.orders || []).filter(o => o.status === 'delivered'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getOrderItems = () => {
    if (!form.orderId) return [];
    return deliveredOrders.find(o => o._id === form.orderId)?.items || [];
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
    if (!form.orderId || !form.productId || !form.reason || !form.description)
      return toast.error('Please fill all required fields');
    if (typeof returnAPI?.create !== 'function')
      return toast.error('Something went wrong. Please try again later.');
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
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Returns & Refunds</h2>
          <p className="text-sm text-gray-500 mt-0.5">{returns.length} return request{returns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
            showForm
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-200'
          }`}>
          {showForm ? <><FiX className="w-4 h-4" /> Cancel</> : <><FiPlus className="w-4 h-4" /> Submit Return</>}
        </button>
      </div>

      {/* Return Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl border border-rose-100 p-5 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">
                <FiRefreshCw className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="font-bold text-gray-900">New Return Request</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Select Delivered Order *</label>
                <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value, productId: '' })}
                  required className={INPUT_CLS}>
                  <option value="">Choose an order...</option>
                  {deliveredOrders.map(o => (
                    <option key={o._id} value={o._id}>
                      #{o.orderNumber} — ₹{o.totalPrice} ({new Date(o.createdAt).toLocaleDateString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {form.orderId && (
                <div>
                  <label className={LABEL_CLS}>Select Product *</label>
                  <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}
                    required className={INPUT_CLS}>
                    <option value="">Choose a product...</option>
                    {getOrderItems().map((item, i) => (
                      <option key={i} value={item.productId || item._id}>
                        {item.name} (Qty: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={LABEL_CLS}>Return Reason *</label>
                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  required className={INPUT_CLS}>
                  <option value="">Select a reason...</option>
                  {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL_CLS}>Description *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} required placeholder="Describe the issue in detail..."
                  className={INPUT_CLS + ' resize-none'} />
              </div>

              <div>
                <label className={LABEL_CLS}>Issue Media (Optional)</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                  <FiUpload className="w-4 h-4" />
                  <span>{uploadingMedia ? 'Uploading...' : 'Upload image or video'}</span>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} disabled={uploadingMedia} />
                </label>
                {(form.images?.length || form.videos?.length) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.images?.map((src, idx) => <img key={`img-${idx}`} src={src} alt="issue" className="h-16 w-16 object-cover rounded-xl border border-rose-100" />)}
                    {form.videos?.map((src, idx) => <video key={`video-${idx}`} src={src} controls className="h-16 w-16 object-cover rounded-xl border border-rose-100" />)}
                  </div>
                )}
              </div>

              <div>
                <label className={LABEL_CLS}>Refund Method</label>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                  Wallet credit only — returned amount will go into the customer wallet for future purchases.
                </div>
                <input type="hidden" name="refundMethod" value="wallet" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-md shadow-rose-200">
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                ) : (
                  <><FiRefreshCw className="w-4 h-4" /> Submit Return Request</>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Returns List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : returns.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiRefreshCw className="w-9 h-9 text-gray-200" />
          </div>
          <p className="font-bold text-gray-600 mb-1">No returns yet</p>
          <p className="text-sm text-gray-400">Submitted return requests will appear here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {returns.map(ret => <ReturnCard key={ret._id} ret={ret} />)}
        </div>
      )}
    </div>
  );
}
