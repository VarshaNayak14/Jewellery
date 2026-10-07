import { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiMessageSquare, FiClock, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import { sellerAPI } from '../../services/api';
import CustomerTicketThread, { CT_CATEGORIES, CT_STATUS, levelBadge } from '../../components/common/CustomerTicketThread';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800';
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const uploadPhoto = (file) => sellerAPI.uploadImage(file).then(d => d.url);
const TABS = [{ key: 'open', label: 'Open' }, { key: 'resolved', label: 'Resolved' }, { key: 'closed', label: 'Closed' }, { key: '', label: 'All' }];

// Tickets customers raised about this seller's orders / products. The seller
// has to reply within the deadline, otherwise the ticket moves to growthkarts.
export default function SellerCustomerTickets() {
  const [tickets, setTickets] = useState([]);
  const [replyHours, setReplyHours] = useState(48);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [sending, setSending] = useState(false);
  const paged = usePagedList(tickets, 10);

  const load = useCallback(() => {
    setLoading(true);
    sellerAPI.getCustomerTickets({ status: status || undefined })
      .then(d => { setTickets(d.tickets || []); if (d.replyHours) setReplyHours(d.replyHours); })
      .catch(err => toast.error(err.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const openTicket = async (id) => {
    try { const d = await sellerAPI.getCustomerTicket(id); setTicket(d.ticket); }
    catch (err) { toast.error(err.message); }
  };

  const sendReply = async (text, images, extra = {}) => {
    setSending(true);
    try {
      const d = await sellerAPI.replyCustomerTicket(ticket._id, text, images, !!extra.resolve);
      setTicket(d.ticket);
      if (extra.resolve) toast.success('Replied and marked resolved');
      return true;
    } catch (err) { toast.error(err.message); return false; }
    finally { setSending(false); }
  };

  /* ───────────── Ticket thread ───────────── */
  if (ticket) {
    const st = CT_STATUS[ticket.status];
    const lvl = levelBadge(ticket);
    const pending = ticket.level === 'seller' && ticket.status === 'open' && !ticket.sellerRepliedAt && ticket.sellerReplyDueAt;
    return (
      <SellerLayout>
        <div className="p-0 sm:p-2 lg:p-4 max-w-3xl">
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
                  Customer: {ticket.user?.name || 'Customer'}{ticket.productName ? ` · ${ticket.productName}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${lvl.cls}`}>{ticket.level === 'platform' ? 'Escalated to growthkarts' : 'With you'}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
              </div>
            </div>
            {pending && (
              <p className="mt-3 flex items-start gap-2 text-xs rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2">
                <FiClock className="w-4 h-4 shrink-0" /> Reply before {fmt(ticket.sellerReplyDueAt)}, otherwise this ticket moves to the growthkarts team.
              </p>
            )}
            {ticket.level === 'platform' && (
              <p className="mt-3 flex items-start gap-2 text-xs rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 px-3 py-2">
                <FiAlertCircle className="w-4 h-4 shrink-0" /> The growthkarts team is handling this now{ticket.escalationReason ? ` (${ticket.escalationReason})` : ''}. You can still reply to help.
              </p>
            )}
          </div>
          <div className={`${cardCls} p-4 sm:p-5`}>
            <CustomerTicketThread ticket={ticket} viewer="seller" uploadFn={uploadPhoto} onSend={sendReply} sending={sending}
              replyPlaceholder="Reply to the customer…"
              extraReply={ticket.level === 'seller' && ticket.status === 'open' ? { label: 'Reply & mark resolved', payload: { resolve: true } } : null} />
          </div>
        </div>
      </SellerLayout>
    );
  }

  /* ───────────── List ───────────── */
  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Issues customers raised about your orders. Reply within {replyHours} hours, or the ticket goes to the growthkarts team.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${status === t.key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={cardCls}>
          {loading ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center">
              <FiMessageSquare className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No customer tickets here.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {paged.pageItems.map(t => {
                  const st = CT_STATUS[t.status];
                  const waiting = t.level === 'seller' && t.status === 'open' && !t.sellerRepliedAt && t.sellerReplyDueAt;
                  return (
                    <button key={t._id} onClick={() => openTicket(t._id)} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                            {t.unreadBySeller && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}{t.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t.ticketNumber} · {t.user?.name || 'Customer'}{t.orderNumber ? ` · #${t.orderNumber}` : ''} · {CT_CATEGORIES[t.category]} · {fmt(t.lastActivityAt)}
                          </p>
                          {waiting && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1"><FiClock className="w-3 h-3" /> Reply by {fmt(t.sellerReplyDueAt)}</p>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {t.level === 'platform' && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">Escalated</span>}
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Pagination page={paged.page} limit={paged.limit} total={paged.total} onPageChange={paged.setPage} />
            </>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
