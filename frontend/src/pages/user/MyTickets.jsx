import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiArrowLeft, FiArrowUpCircle, FiCheckCircle, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { customerTicketAPI, orderAPI, uploadAPI } from '../../services/api';
import { AttachImagesInput } from '../../components/common/ImageAttachments';
import CustomerTicketThread, { CT_CATEGORIES, CT_STATUS, levelBadge } from '../../components/common/CustomerTicketThread';

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500';
const labelCls = 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block';
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const uploadPhoto = (file) => uploadAPI.single(file).then(r => r.url);
const emptyForm = (orderId = '') => ({ orderId, productId: '', category: 'order_issue', subject: '', message: '', images: [] });

// Customer support tickets. A ticket goes to the seller of the order/product
// first; if the seller doesn't sort it out it moves to the growthkarts team.
export default function MyTickets() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(!!searchParams.get('order'));
  const [form, setForm] = useState(emptyForm(searchParams.get('order') || ''));
  const [creating, setCreating] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const load = useCallback(() => customerTicketAPI.getMy()
    .then(d => setTickets(d.tickets || []))
    .catch(err => toast.error(err.message || 'Failed to load tickets'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { orderAPI.getMyOrders({ limit: 100 }).then(d => setOrders(d.orders || [])).catch(() => {}); }, []);

  const selectedOrder = orders.find(o => o._id === form.orderId);
  const productIdOf = (item) => item.product?._id || item.product;

  const openTicket = async (id) => {
    try { const d = await customerTicketAPI.get(id); setTicket(d.ticket); setEscalating(false); setEscalateReason(''); }
    catch (err) { toast.error(err.message); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return toast.error('Please add a subject and describe the issue');
    setCreating(true);
    try {
      const d = await customerTicketAPI.create({
        subject: form.subject, category: form.category, message: form.message, images: form.images,
        orderId: form.orderId || undefined, productId: form.productId || undefined,
      });
      toast.success(`Ticket ${d.ticket.ticketNumber} created`);
      setForm(emptyForm());
      setShowForm(false);
      setTicket(d.ticket);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const sendReply = async (text, images) => {
    setSending(true);
    try { const d = await customerTicketAPI.reply(ticket._id, text, images); setTicket(d.ticket); load(); return true; }
    catch (err) { toast.error(err.message); return false; }
    finally { setSending(false); }
  };

  const escalate = async () => {
    try {
      const d = await customerTicketAPI.escalate(ticket._id, escalateReason.trim());
      setTicket(d.ticket); setEscalating(false); setEscalateReason('');
      toast.success('Sent to the growthkarts support team');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const closeTicket = async () => {
    if (!window.confirm('Close this ticket? You can open a new one any time.')) return;
    try { const d = await customerTicketAPI.close(ticket._id); setTicket(d.ticket); toast.success('Ticket closed'); load(); }
    catch (err) { toast.error(err.message); }
  };

  /* ───────────── Ticket detail ───────────── */
  if (ticket) {
    const st = CT_STATUS[ticket.status];
    const lvl = levelBadge(ticket);
    const canEscalate = ticket.level === 'seller' && ticket.status !== 'closed';
    return (
      <div>
        <button onClick={() => { setTicket(null); load(); }} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4">
          <FiArrowLeft className="w-4 h-4" /> All tickets
        </button>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{ticket.ticketNumber}{ticket.orderNumber ? ` · Order #${ticket.orderNumber}` : ''}</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{ticket.subject}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {CT_CATEGORIES[ticket.category]}{ticket.productName ? ` · ${ticket.productName}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${lvl.cls}`}>{lvl.label}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
            </div>
          </div>

          {ticket.level === 'seller' && ticket.status === 'open' && !ticket.sellerRepliedAt && ticket.sellerReplyDueAt && (
            <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2 mb-4">
              The seller has until {fmt(ticket.sellerReplyDueAt)} to reply. If they don't, your ticket goes to the growthkarts team automatically.
            </p>
          )}

          <CustomerTicketThread ticket={ticket} viewer="customer" uploadFn={uploadPhoto} onSend={sendReply} sending={sending}
            replyPlaceholder="Add more details or reply…" />

          {ticket.status !== 'closed' && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {escalating ? (
                <div className="space-y-2">
                  <label className={labelCls}>Why isn't the issue solved? (optional)</label>
                  <textarea rows={2} value={escalateReason} onChange={e => setEscalateReason(e.target.value)} maxLength={500} className={inputCls}
                    placeholder="e.g. Seller is not responding / refund not received" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEscalating(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Cancel</button>
                    <button onClick={escalate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white">
                      <FiArrowUpCircle className="w-4 h-4" /> Send to growthkarts team
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-end">
                  {canEscalate && (
                    <button onClick={() => setEscalating(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-purple-300 text-purple-700 dark:border-purple-500/40 dark:text-purple-300">
                      <FiArrowUpCircle className="w-4 h-4" /> Not solved? Send to growthkarts
                    </button>
                  )}
                  <button onClick={closeTicket} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    <FiCheckCircle className="w-4 h-4" /> Issue solved, close ticket
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───────────── List + new ticket ───────────── */
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Support Tickets</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Raise an issue with your order. The seller replies first; if it isn't solved, our team steps in.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="shrink-0 flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors">
          <FiPlus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Raise a ticket</h3>
          <form onSubmit={createTicket} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Order</label>
                <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value, productId: '' })} className={inputCls}>
                  <option value="">General issue (no order)</option>
                  {orders.map(o => <option key={o._id} value={o._id}>#{o.orderNumber} · {new Date(o.createdAt).toLocaleDateString('en-IN')}</option>)}
                </select>
              </div>
              {selectedOrder && (
                <div>
                  <label className={labelCls}>Product</label>
                  <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className={inputCls}>
                    <option value="">Whole order</option>
                    {(selectedOrder.items || []).map((it, i) => <option key={i} value={productIdOf(it) || ''}>{it.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Issue type</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                  {Object.entries(CT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className={selectedOrder ? '' : 'sm:col-span-2'}>
                <label className={labelCls}>Subject *</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} maxLength={150} className={inputCls} placeholder="Short summary of the issue" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Describe the issue *</label>
              <textarea rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} maxLength={4000} className={inputCls}
                placeholder="What went wrong? Add as much detail as you can." />
            </div>
            <div>
              <label className={labelCls}>Photos (optional)</label>
              <AttachImagesInput value={form.images} onChange={(images) => setForm(f => ({ ...f, images }))} uploadFn={uploadPhoto} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Cancel</button>
              <button disabled={creating} className="px-5 py-2 rounded-lg text-sm font-semibold bg-gray-900 dark:bg-gray-700 text-white disabled:opacity-50">
                {creating ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FiMessageSquare className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">No tickets yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Facing a problem with an order? Raise a ticket.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => {
            const st = CT_STATUS[t.status]; const lvl = levelBadge(t);
            return (
              <button key={t._id} onClick={() => openTicket(t._id)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                      {t.unreadByCustomer && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}{t.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.ticketNumber}{t.orderNumber ? ` · #${t.orderNumber}` : ''} · {CT_CATEGORIES[t.category]} · {fmt(t.lastActivityAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${lvl.cls}`}>{lvl.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
