import { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiSearch, FiCheckCircle, FiXCircle, FiRotateCcw, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, uploadAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagedList } from '../../hooks/usePagedList';
import Pagination from '../../components/common/Pagination';
import CustomerTicketThread, { CT_CATEGORIES, CT_STATUS, levelBadge } from '../../components/common/CustomerTicketThread';

const LEVEL_TABS = [
  { key: 'platform', label: 'With growthkarts' },
  { key: 'seller', label: 'With sellers' },
  { key: 'all', label: 'All' },
];
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const selectCls = 'px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';
const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800';
const uploadPhoto = (file) => uploadAPI.single(file).then(r => r.url);

// Customer tickets for Admin / Super Admin. "With growthkarts" holds tickets
// escalated by the customer, overdue for the seller, or about platform
// products. "With sellers" lets staff watch (and step into) seller tickets.
export default function AdminCustomerTickets({ Wrapper = AdminPageWrapper }) {
  const [tickets, setTickets] = useState([]);
  const [openCounts, setOpenCounts] = useState({});
  const [level, setLevel] = useState('platform');
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [sending, setSending] = useState(false);
  const paged = usePagedList(tickets, 15);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getCustomerTickets({ level, status: status || undefined, search: debouncedSearch || undefined })
      .then(d => { setTickets(d.tickets || []); setOpenCounts(d.openCounts || {}); })
      .catch(err => toast.error(err.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [level, status, debouncedSearch]);
  useEffect(() => { load(); }, [load]);

  const openTicket = async (id) => {
    try { const d = await adminAPI.getCustomerTicket(id); setTicket(d.ticket); }
    catch (err) { toast.error(err.message); }
  };

  const sendReply = async (text, images) => {
    setSending(true);
    try { const d = await adminAPI.replyCustomerTicket(ticket._id, text, images); setTicket(d.ticket); return true; }
    catch (err) { toast.error(err.message); return false; }
    finally { setSending(false); }
  };

  const setTicketStatus = async (next) => {
    try { const d = await adminAPI.updateCustomerTicket(ticket._id, { status: next }); setTicket(d.ticket); toast.success(`Ticket ${next}`); }
    catch (err) { toast.error(err.message); }
  };

  /* ───────────── Ticket detail ───────────── */
  if (ticket) {
    const st = CT_STATUS[ticket.status];
    const lvl = levelBadge(ticket);
    return (
      <Wrapper title="Customer Tickets" subtitle={`${ticket.ticketNumber} · ${ticket.user?.name || 'Customer'}`}>
        <div className="max-w-3xl">
          <button onClick={() => { setTicket(null); load(); }} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 mb-4">
            <FiArrowLeft className="w-4 h-4" /> All tickets
          </button>
          <div className={`${cardCls} p-5 mb-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {ticket.ticketNumber} · {CT_CATEGORIES[ticket.category]}{ticket.orderNumber ? ` · Order #${ticket.orderNumber}` : ''}
                </p>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{ticket.subject}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Customer: {ticket.user?.name || '—'}{ticket.user?.email ? ` (${ticket.user.email})` : ''}
                  {' · '}Seller: {ticket.seller?.shopName || 'growthkarts (platform product)'}
                  {ticket.productName ? ` · ${ticket.productName}` : ''}
                </p>
                {ticket.escalatedAt && (
                  <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                    Escalated {fmt(ticket.escalatedAt)}{ticket.escalationReason ? ` — ${ticket.escalationReason}` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${lvl.cls}`}>{lvl.label}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {ticket.status !== 'resolved' && (
                <button onClick={() => setTicketStatus('resolved')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-300 text-green-700 dark:border-green-500/40 dark:text-green-400">
                  <FiCheckCircle className="w-4 h-4" /> Mark resolved
                </button>
              )}
              {ticket.status !== 'closed' && (
                <button onClick={() => setTicketStatus('closed')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <FiXCircle className="w-4 h-4" /> Close
                </button>
              )}
              {ticket.status !== 'open' && (
                <button onClick={() => setTicketStatus('open')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-300 text-blue-700 dark:border-blue-500/40 dark:text-blue-300">
                  <FiRotateCcw className="w-4 h-4" /> Reopen
                </button>
              )}
            </div>
            {ticket.level === 'seller' && ticket.status !== 'closed' && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">This ticket is still with the seller. Replying here takes it over for the growthkarts team.</p>
            )}
          </div>
          <div className={`${cardCls} p-4 sm:p-5`}>
            <CustomerTicketThread ticket={ticket} viewer="staff" uploadFn={uploadPhoto} onSend={sendReply} sending={sending}
              replyPlaceholder="Reply to the customer…" />
          </div>
        </div>
      </Wrapper>
    );
  }

  /* ───────────── List ───────────── */
  return (
    <Wrapper title="Customer Tickets" subtitle="Customer issues escalated from sellers or about platform products">
      <div className="flex flex-wrap gap-2 mb-4">
        {LEVEL_TABS.map(t => {
          const n = t.key === 'all' ? (openCounts.platform || 0) + (openCounts.seller || 0) : openCounts[t.key] || 0;
          return (
            <button key={t.key} onClick={() => setLevel(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium ${level === t.key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {t.label}
              {n > 0 && <span className={`text-[11px] px-1.5 rounded-full ${level === t.key ? 'bg-white/25' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket #, subject, order #"
            className={`${selectCls} w-full pl-9`} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="">All statuses</option>
        </select>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center">
            <FiMessageSquare className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No customer tickets here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Handled by</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paged.pageItems.map(t => {
                    const st = CT_STATUS[t.status]; const lvl = levelBadge(t);
                    return (
                      <tr key={t._id} onClick={() => openTicket(t._id)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 min-w-[220px]">
                          <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {t.level === 'platform' && t.unreadByStaff && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                            <span className="truncate max-w-[260px]">{t.subject}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t.ticketNumber}{t.orderNumber ? ` · #${t.orderNumber}` : ''} · {CT_CATEGORIES[t.category]}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.user?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.seller?.shopName || 'Platform'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${lvl.cls}`}>{t.level === 'platform' ? 'growthkarts' : 'Seller'}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(t.lastActivityAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={paged.page} limit={paged.limit} total={paged.total} onPageChange={paged.setPage} />
          </>
        )}
      </div>
    </Wrapper>
  );
}
