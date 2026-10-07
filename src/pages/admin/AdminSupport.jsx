import { useState, useEffect, useCallback } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { FiArrowLeft, FiSearch, FiSend, FiZap, FiAlertCircle, FiUser, FiPhone, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, uploadAPI } from '../../services/api';
import { AttachImagesInput, MessageImages } from '../../components/common/ImageAttachments';
import { AdminPageWrapper } from './AdminDashboard';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuthStore } from '../../store/authStore';
import { TICKET_CATEGORIES, TICKET_STATUS } from '../seller/SellerSupport';

const STATUS_TABS = [
  { key: 'active', label: 'Active' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
  { key: '', label: 'All' },
];
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const isOverdue = (t) => ['open', 'in_progress'].includes(t.status) && !t.firstResponseAt && t.replyDueAt && new Date(t.replyDueAt) < new Date();
const waNumber = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = `91${d}`; return d; };
const selectCls = 'px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';

export default function AdminSupport({ Wrapper = AdminPageWrapper }) {
  // Super Admin oversees all tickets and is never assigned work, so the
  // "assigned to me" views only make sense for admin staff.
  const isStaff = useAuthStore(s => s.user?.role) === 'admin';
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [status, setStatus] = useState('active');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getSupportTickets({
      status: status || undefined, priority: priorityOnly ? 'priority' : undefined,
      mine: mine ? '1' : undefined, search: debouncedSearch || undefined,
    }).then(d => { setTickets(d.tickets || []); setStats(d.stats || {}); })
      .catch(err => toast.error(err.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [status, priorityOnly, mine, debouncedSearch]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { adminAPI.getSupportStaff().then(d => setStaff(d.staff || [])).catch(() => {}); }, []);

  const openTicket = async (id) => {
    try { const d = await adminAPI.getSupportTicket(id); setTicket(d.ticket); }
    catch (err) { toast.error(err.message); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && !replyImages.length) return;
    setSending(true);
    try { const d = await adminAPI.replySupportTicket(ticket._id, reply, replyImages); setTicket(d.ticket); setReply(''); setReplyImages([]); }
    catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const update = async (data) => {
    try { const d = await adminAPI.updateSupportTicket(ticket._id, data); setTicket(d.ticket); toast.success('Ticket updated'); }
    catch (err) { toast.error(err.message); }
  };

  /* ───────────── Ticket detail ───────────── */
  if (ticket) {
    const s = ticket.seller || {};
    const st = TICKET_STATUS[ticket.status];
    const contactPhone = s.whatsapp || s.phone || s.user?.phone;
    return (
      <Wrapper title="Seller Support" subtitle={`${ticket.ticketNumber} · ${s.shopName || 'Seller'}`}>
        <div className="p-4 sm:p-5">
          <button onClick={() => { setTicket(null); load(); }} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 mb-4">
            <FiArrowLeft className="w-4 h-4" /> All tickets
          </button>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{TICKET_CATEGORIES[ticket.category]} · opened {fmt(ticket.createdAt)}</p>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{ticket.subject}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {ticket.priority === 'priority' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center gap-1"><FiZap className="w-3 h-3" /> Priority</span>}
                  {isOverdue(ticket) && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">Overdue</span>}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                {ticket.messages.map(m => (
                  <div key={m._id} className={`flex ${m.from === 'staff' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.from === 'staff' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <p className={`text-[11px] font-semibold mb-1 ${m.from === 'staff' ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {m.from === 'staff' ? m.authorName || 'Staff' : `${m.authorName || 'Seller'} · ${s.shopName || ''}`}
                      </p>
                      {m.text && <p className={`text-sm whitespace-pre-wrap break-words ${m.from === 'staff' ? '' : 'text-gray-800 dark:text-gray-100'}`}>{m.text}</p>}
                    <MessageImages images={m.images} />
                      <p className={`text-[10px] mt-1 ${m.from === 'staff' ? 'text-indigo-200' : 'text-gray-400'}`}>{fmt(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to the seller..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                <div className="mt-2"><AttachImagesInput value={replyImages} onChange={setReplyImages} uploadFn={(file) => uploadAPI.single(file).then(r => r.url)} /></div>
                <div className="flex justify-end mt-3">
                  <button disabled={sending || (!reply.trim() && !replyImages.length)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                    <FiSend className="w-4 h-4" /> {sending ? 'Sending...' : 'Send reply'}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select value={ticket.status} onChange={e => update({ status: e.target.value })} className={`${selectCls} w-full`}>
                    {Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned to</label>
                  <select value={ticket.assignedTo?._id || ''} onChange={e => update({ assignedTo: e.target.value || null })} className={`${selectCls} w-full`}>
                    <option value="">— Unassigned —</option>
                    {staff.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    {ticket.assignedTo && !staff.some(u => u._id === ticket.assignedTo._id) && <option value={ticket.assignedTo._id}>{ticket.assignedTo.name} (not admin staff)</option>}
                  </select>
                </div>
                {ticket.replyDueAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Reply target: {fmt(ticket.replyDueAt)}{ticket.firstResponseAt ? ` · first reply ${fmt(ticket.firstResponseAt)}` : ''}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-sm space-y-1.5">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{s.shopName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Plan: {s.planSnapshot?.name || '—'}{s.planExpiresAt && ` · till ${new Date(s.planExpiresAt).toLocaleDateString('en-IN')}`}</p>
                {s.user?.name && <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><FiUser className="w-3.5 h-3.5" /> {s.user.name}</p>}
                {s.user?.email && <a href={`mailto:${s.user.email}`} className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:underline"><FiMail className="w-3.5 h-3.5" /> {s.user.email}</a>}
                {contactPhone && (
                  <div className="flex gap-2 pt-1">
                    <a href={`tel:${contactPhone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"><FiPhone className="w-3.5 h-3.5" /> Call</a>
                    <a href={`https://wa.me/${waNumber(contactPhone)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500 text-white"><FaWhatsapp className="w-3.5 h-3.5" /> WhatsApp</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  /* ───────────── Ticket list ───────────── */
  return (
    <Wrapper title="Seller Support" subtitle="Help tickets raised by sellers — priority (dedicated support) tickets are listed first">
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active tickets', value: stats.open, cls: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
            { label: 'Priority active', value: stats.priorityOpen, cls: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' },
            { label: 'Overdue (no reply)', value: stats.overdue, cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' },
            isStaff && { label: 'Assigned to me', value: stats.mine, cls: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' },
          ].filter(Boolean).map(c => (
            <div key={c.label} className={`rounded-2xl p-4 ${c.cls}`}>
              <p className="text-2xl font-bold">{c.value ?? 0}</p>
              <p className="text-xs font-medium mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shop, ticket no. or subject..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer"><input type="checkbox" checked={priorityOnly} onChange={e => setPriorityOnly(e.target.checked)} /> Priority only</label>
          {isStaff && <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer"><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} /> Assigned to me</label>}
        </div>
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${status === t.key ? 'bg-gray-900 dark:bg-gray-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No tickets here.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {tickets.map(t => (
                <button key={t._id} onClick={() => openTicket(t._id)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {t.seller?.logo ? <img src={t.seller.logo} alt="" className="w-full h-full object-cover" /> : t.seller?.shopName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                      {t.unreadByStaff && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" title="New message" />}
                      {t.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {t.seller?.shopName} · {t.seller?.planSnapshot?.name || 'No plan'} · {t.ticketNumber} · {fmt(t.lastActivityAt)}
                      {t.assignedTo?.name && ` · ${t.assignedTo.name}`}
                    </p>
                  </div>
                  {isOverdue(t) && <FiAlertCircle className="w-4 h-4 text-red-500 shrink-0" title="Overdue — no reply yet" />}
                  {t.priority === 'priority' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shrink-0 flex items-center gap-1"><FiZap className="w-3 h-3" /> Priority</span>}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
