import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiHeadphones, FiPlus, FiArrowLeft, FiSend, FiZap, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import { sellerAPI } from '../../services/api';
import { AttachImagesInput, MessageImages } from '../../components/common/ImageAttachments';

export const TICKET_CATEGORIES = {
  account: 'Account & login', plan_payment: 'Plan & payment', orders: 'Orders & delivery',
  products: 'Products', store: 'Store / website', technical: 'Technical problem', other: 'Other',
};
export const TICKET_STATUS = {
  open: { label: 'Open', cls: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  in_progress: { label: 'In progress', cls: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  resolved: { label: 'Resolved', cls: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' },
  closed: { label: 'Closed', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
};
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100';
const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800';

export default function SellerSupport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'other', message: '', images: [] });
  const uploadPhoto = (file) => sellerAPI.uploadImage(file).then(d => d.url);
  const [creating, setCreating] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => sellerAPI.getSupport()
    .then(setData).catch(err => toast.error(err.message || 'Failed to load support'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  const openTicket = async (id) => {
    try { const res = await sellerAPI.getSupportTicket(id); setTicket(res.ticket); }
    catch (err) { toast.error(err.message); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await sellerAPI.createSupportTicket(form);
      toast.success(`Ticket ${res.ticket.ticketNumber} created`);
      setForm({ subject: '', category: 'other', message: '', images: [] });
      setShowNew(false);
      setTicket(res.ticket);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && !replyImages.length) return;
    setSending(true);
    try {
      const res = await sellerAPI.replySupportTicket(ticket._id, reply, replyImages);
      setTicket(res.ticket);
      setReply('');
      setReplyImages([]);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const closeTicket = async () => {
    if (!window.confirm('Close this ticket? You can open a new one anytime.')) return;
    try { const res = await sellerAPI.closeSupportTicket(ticket._id); setTicket(res.ticket); load(); }
    catch (err) { toast.error(err.message); }
  };

  if (loading) return <SellerLayout><div className="p-4 text-center text-gray-400 dark:text-gray-500">Loading support...</div></SellerLayout>;
  if (!data) return <SellerLayout><div className="p-4 text-center text-gray-400 dark:text-gray-500">Could not load support.</div></SellerLayout>;
  const { support, tickets } = data;

  /* ───────────── Ticket thread ───────────── */
  if (ticket) {
    const st = TICKET_STATUS[ticket.status];
    return (
      <SellerLayout>
        <div className="p-0 sm:p-2 lg:p-4 max-w-3xl">
          <button onClick={() => setTicket(null)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 mb-4">
            <FiArrowLeft className="w-4 h-4" /> All tickets
          </button>
          <div className={`${cardCls} p-5 mb-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">{ticket.ticketNumber} · {TICKET_CATEGORIES[ticket.category]}</p>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{ticket.subject}</h1>
                {ticket.assignedTo?.name && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Handled by {ticket.assignedTo.name}</p>}
              </div>
              <div className="flex items-center gap-2">
                {ticket.priority === 'priority' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center gap-1"><FiZap className="w-3 h-3" /> Priority</span>}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {ticket.messages.map(m => (
              <div key={m._id} className={`flex ${m.from === 'seller' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.from === 'seller' ? 'bg-indigo-600 text-white' : `${cardCls}`}`}>
                  <p className={`text-[11px] font-semibold mb-1 ${m.from === 'seller' ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {m.from === 'seller' ? 'You' : `${m.authorName || 'Support'} · growthkarts`}
                  </p>
                  {m.text && <p className={`text-sm whitespace-pre-wrap break-words ${m.from === 'seller' ? '' : 'text-gray-800 dark:text-gray-100'}`}>{m.text}</p>}
                  <MessageImages images={m.images} />
                  <p className={`text-[10px] mt-1 ${m.from === 'seller' ? 'text-indigo-200' : 'text-gray-400'}`}>{fmt(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>

          {ticket.status === 'closed' ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">This ticket is closed. <button onClick={() => { setTicket(null); setShowNew(true); }} className="text-indigo-600 hover:underline">Open a new ticket</button></p>
          ) : (
            <form onSubmit={sendReply} className={`${cardCls} p-4`}>
              <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply..." className={inputCls} />
              <div className="mt-2"><AttachImagesInput value={replyImages} onChange={setReplyImages} uploadFn={uploadPhoto} /></div>
              <div className="flex items-center justify-between gap-2 mt-3">
                <button type="button" onClick={closeTicket} className="text-xs text-gray-500 hover:text-red-500">Close ticket</button>
                <button disabled={sending || (!reply.trim() && !replyImages.length)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                  <FiSend className="w-4 h-4" /> {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      </SellerLayout>
    );
  }

  /* ───────────── Overview ───────────── */
  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help & Support</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Raise a ticket for anything — plans, payments, orders, your store or technical problems.</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
            <FiPlus className="w-4 h-4" /> New ticket
          </button>
        </div>

        <div className="grid gap-4 mb-6">
          {/* Support level */}
          <div className={`${cardCls} p-5`}>
            {support.priority ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><FiZap className="w-5 h-5" /></div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">Dedicated customer support</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Your tickets are marked <b>priority</b> and handled before standard tickets. We aim to reply within <b>{support.replyHours} hours</b>.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center"><FiHeadphones className="w-5 h-5" /></div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">Standard support</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">We aim to reply within <b>{support.replyHours} hours</b>.</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Want faster, priority support? <Link to="/seller/plan" className="text-indigo-600 dark:text-indigo-400 hover:underline">Upgrade your plan</Link></p>
              </>
            )}
          </div>
        </div>

        {/* Tickets */}
        <div className={cardCls}>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 px-5 pt-5 pb-3">Your tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 px-5 pb-5">No tickets yet. Click “New ticket” if you need help.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {tickets.map(t => (
                <button key={t._id} onClick={() => openTicket(t._id)} className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                      {t.unreadBySeller && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" title="New reply" />}
                      {t.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.ticketNumber} · {TICKET_CATEGORIES[t.category]} · updated {fmt(t.lastActivityAt)}</p>
                  </div>
                  {t.priority === 'priority' && <FiZap className="w-4 h-4 text-indigo-500 shrink-0" title="Priority" />}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !creating && setShowNew(false)}>
          <form onSubmit={createTicket} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">New support ticket</h3>
              <button type="button" onClick={() => setShowNew(false)} className="p-1 text-gray-400 hover:text-gray-600"><FiX className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topic</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                {Object.entries(TICKET_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject *</label>
              <input required maxLength={150} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Short summary of the problem" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Describe the problem *</label>
              <textarea required rows={5} maxLength={4000} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Share order numbers, product names or steps so we can help faster." className={inputCls} />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photos / screenshots (optional)</label>
                <AttachImagesInput value={form.images} onChange={(images) => setForm(p => ({ ...p, images }))} uploadFn={uploadPhoto} />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {support.priority ? `Priority ticket — we aim to reply within ${support.replyHours} hours.` : `We aim to reply within ${support.replyHours} hours.`}
            </p>
            <button disabled={creating} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-60">
              {creating ? 'Creating...' : 'Create ticket'}
            </button>
          </form>
        </div>
      )}
    </SellerLayout>
  );
}
