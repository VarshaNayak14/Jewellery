import { useState } from 'react';
import { FiSend, FiArrowUpCircle, FiInfo } from 'react-icons/fi';
import { AttachImagesInput, MessageImages } from './ImageAttachments';

export const CT_CATEGORIES = {
  order_issue: 'Order issue', delivery: 'Delivery', product_quality: 'Product quality',
  wrong_item: 'Wrong item', refund: 'Refund / return', payment: 'Payment', other: 'Other',
};
export const CT_STATUS = {
  open: { label: 'Open', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' },
  closed: { label: 'Closed', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};
export const levelBadge = (ticket) => (ticket.level === 'platform'
  ? { label: 'With growthkarts team', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300' }
  : { label: `With ${ticket.seller?.shopName || 'seller'}`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' });

const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const WHO = { customer: 'Customer', seller: 'Seller', staff: 'growthkarts', system: '' };

// Message list + reply box shared by the customer, seller and admin views.
// `viewer` ('customer' | 'seller' | 'staff') decides which bubbles are "mine".
export default function CustomerTicketThread({ ticket, viewer, uploadFn, onSend, sending, canReply = true, replyPlaceholder, extraReply }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);

  const submit = async (e, extra = {}) => {
    e?.preventDefault();
    if (!text.trim() && !images.length) return;
    const ok = await onSend(text.trim(), images, extra);
    if (ok !== false) { setText(''); setImages([]); }
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        {ticket.messages.map((m) => {
          if (m.from === 'system') {
            return (
              <p key={m._id} className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 text-center">
                <FiInfo className="w-3.5 h-3.5 shrink-0" /> {m.text} · {fmt(m.createdAt)}
              </p>
            );
          }
          const mine = m.from === viewer;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>
                <p className={`text-[11px] font-semibold mb-0.5 ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                  {m.authorName || WHO[m.from]}{!mine && WHO[m.from] && m.authorName && !m.authorName.includes('growthkarts') ? ` · ${WHO[m.from]}` : ''}
                </p>
                {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                <MessageImages images={m.images} />
                <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>{fmt(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {canReply && ticket.status !== 'closed' && (
        <form onSubmit={submit} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4">
          <textarea rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={4000}
            placeholder={replyPlaceholder || 'Write a reply…'}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
          <div className="mt-2"><AttachImagesInput value={images} onChange={setImages} uploadFn={uploadFn} /></div>
          <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
            {extraReply && (
              <button type="button" disabled={sending || (!text.trim() && !images.length)} onClick={(e) => submit(e, extraReply.payload)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-300 text-green-700 dark:border-green-500/40 dark:text-green-400 text-sm font-semibold disabled:opacity-50">
                <FiArrowUpCircle className="w-4 h-4" /> {extraReply.label}
              </button>
            )}
            <button disabled={sending || (!text.trim() && !images.length)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
              <FiSend className="w-4 h-4" /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
