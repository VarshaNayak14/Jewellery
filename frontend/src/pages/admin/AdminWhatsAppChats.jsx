import { useState, useEffect, useCallback, useRef } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { FiSearch, FiSend, FiArrowLeft, FiCheck, FiClock, FiAlertCircle, FiPlus, FiX, FiCheckCircle, FiRotateCcw, FiExternalLink, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { AdminPageWrapper } from './AdminDashboard';
import { useDebounce } from '../../hooks/useDebounce';

const POLL_MS = 15000;

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => {
  const date = new Date(d); const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const listTime = (d) => (new Date(d).toDateString() === new Date().toDateString() ? fmtTime(d) : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
const prettyPhone = (p) => (p?.startsWith('91') && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);
const displayName = (c) => c.name || c.user?.name || prettyPhone(c.phone);
const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-300';

function Tick({ status, error }) {
  if (status === 'pending') return <FiClock className="w-3 h-3" title="Saved — WhatsApp API not connected yet" />;
  if (status === 'failed') return <FiAlertCircle className="w-3 h-3 text-red-300" title={error || 'Failed'} />;
  if (status === 'read') return <span className="flex text-sky-300" title="Read"><FiCheck className="w-3 h-3" /><FiCheck className="w-3 h-3 -ml-1.5" /></span>;
  if (status === 'delivered') return <span className="flex" title="Delivered"><FiCheck className="w-3 h-3" /><FiCheck className="w-3 h-3 -ml-1.5" /></span>;
  return <FiCheck className="w-3 h-3" title="Sent" />;
}

// WhatsApp enquiries inbox for Admin / Super Admin.
//
// ── Connecting the WhatsApp automation API (setup lives in the backend) ──
// 1. Incoming messages: give the provider this webhook URL
//      <BACKEND_URL>/api/v1/whatsapp/webhook?secret=<WHATSAPP_WEBHOOK_SECRET>
//    (e.g. http://localhost:5000/api/v1/whatsapp/webhook?secret=...).
//    The secret is already set in backend/.env. Payload parsing:
//    backend/src/controllers/whatsappController.js → parseWebhook()
//    (Meta Cloud API format + a simple { phone, name, message } format).
// 2. Sending replies: fill WHATSAPP_API_URL and WHATSAPP_API_TOKEN in
//    backend/.env (and WHATSAPP_VERIFY_TOKEN for Meta's webhook verification).
//    Request format: backend/src/services/whatsappService.js → buildPayload().
// 3. Restart the backend. Until then replies are saved with a 🕒 "pending" tick.
export default function AdminWhatsAppChats({ Wrapper = AdminPageWrapper }) {
  const [chats, setChats] = useState([]);
  const [meta, setMeta] = useState({ connected: false, webhookReady: false, unreadChats: 0 });
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newChat, setNewChat] = useState({ phone: '', name: '' });
  const bottomRef = useRef(null);
  const chatIdRef = useRef(null);
  chatIdRef.current = chat?._id;

  const loadList = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    return adminAPI.getWhatsAppChats({ status: status || undefined, search: debouncedSearch || undefined })
      .then(d => { setChats(d.chats || []); setMeta({ connected: d.connected, webhookReady: d.webhookReady, unreadChats: d.unreadChats || 0 }); })
      .catch(err => { if (!quiet) toast.error(err.message || 'Failed to load chats'); })
      .finally(() => setLoading(false));
  }, [status, debouncedSearch]);
  useEffect(() => { loadList(); }, [loadList]);

  const openChat = useCallback(async (id, quiet = false) => {
    try { const d = await adminAPI.getWhatsAppChat(id); setChat(d.chat); }
    catch (err) { if (!quiet) toast.error(err.message); }
  }, []);

  // Light polling so new messages show up without a refresh
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return;
      loadList(true);
      if (chatIdRef.current) openChat(chatIdRef.current, true);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [loadList, openChat]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [chat?._id, chat?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const d = await adminAPI.replyWhatsAppChat(chat._id, text.trim());
      setChat(d.chat); setText('');
      if (d.delivery === 'pending') toast('Saved. It will be sent once the WhatsApp API is connected.', { icon: '🕒' });
      else if (d.delivery === 'failed') toast.error('WhatsApp could not deliver this message');
      loadList(true);
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const setChatStatus = async (next) => {
    try { const d = await adminAPI.updateWhatsAppChat(chat._id, { status: next }); setChat(d.chat); loadList(true); toast.success(next === 'closed' ? 'Chat closed' : 'Chat reopened'); }
    catch (err) { toast.error(err.message); }
  };

  const createChat = async (e) => {
    e.preventDefault();
    try {
      const d = await adminAPI.createWhatsAppChat(newChat);
      setShowNew(false); setNewChat({ phone: '', name: '' });
      await loadList(true); openChat(d.chat._id);
    } catch (err) { toast.error(err.message); }
  };

  // Group messages by day for date separators
  const grouped = [];
  (chat?.messages || []).forEach(m => {
    const day = fmtDay(m.createdAt);
    if (!grouped.length || grouped[grouped.length - 1].day !== day) grouped.push({ day, items: [] });
    grouped[grouped.length - 1].items.push(m);
  });

  const actions = (
    <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">
      <FiPlus className="w-4 h-4" /> New chat
    </button>
  );

  return (
    <Wrapper title="WhatsApp Enquiries" subtitle="Chats from the WhatsApp button on your website" actions={actions}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex h-[calc(100vh-260px)] min-h-[480px]">
        {/* Chat list */}
        <div className={`${chat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 shrink-0 flex-col border-r border-gray-100 dark:border-gray-800`}>
          <div className="p-3 space-y-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, number, message" className={`${inputCls} pl-9`} />
            </div>
            <div className="flex gap-1.5">
              {[['open', 'Open'], ['closed', 'Closed'], ['', 'All']].map(([k, l]) => (
                <button key={k} onClick={() => setStatus(k)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${status === k ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{l}</button>
              ))}
              {meta.unreadChats > 0 && <span className="ml-auto self-center text-xs text-green-700 dark:text-green-400 font-semibold">{meta.unreadChats} unread</span>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center">
                <FaWhatsapp className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No WhatsApp chats yet.</p>
              </div>
            ) : chats.map(c => (
              <button key={c._id} onClick={() => openChat(c._id)}
                className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${chat?._id === c._id ? 'bg-green-50 dark:bg-green-500/10' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 flex items-center justify-center font-bold shrink-0">
                  {(c.name || c.user?.name) ? displayName(c).charAt(0).toUpperCase() : <FiUser className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{displayName(c)}</p>
                    <span className={`text-[11px] shrink-0 ${c.unread ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-400'}`}>{listTime(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.lastDirection === 'out' ? 'You: ' : ''}{c.lastMessage || 'No messages yet'}</p>
                    {c.unread > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className={`${chat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {!chat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <FaWhatsapp className="w-14 h-14 text-green-500/40 mb-3" />
              <p className="font-medium text-gray-700 dark:text-gray-300">Select a chat</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Customer messages from WhatsApp show up here.</p>
            </div>
          ) : (
            <>
              <div className="px-3 sm:px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <button onClick={() => setChat(null)} className="md:hidden p-1 text-gray-500"><FiArrowLeft className="w-5 h-5" /></button>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 flex items-center justify-center font-bold shrink-0">
                  {displayName(chat).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{displayName(chat)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {prettyPhone(chat.phone)}{chat.user ? ` · Customer account: ${chat.user.email || chat.user.name}` : ''}
                  </p>
                </div>
                <a href={`https://wa.me/${chat.phone}`} target="_blank" rel="noreferrer" title="Open in WhatsApp"
                  className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"><FiExternalLink className="w-4 h-4" /></a>
                {chat.status === 'open' ? (
                  <button onClick={() => setChatStatus('closed')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    <FiCheckCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Close</span>
                  </button>
                ) : (
                  <button onClick={() => setChatStatus('open')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-700 dark:border-blue-500/40 dark:text-blue-300">
                    <FiRotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reopen</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-2 bg-[#efeae2] dark:bg-gray-950">
                {grouped.length === 0 && <p className="text-center text-xs text-gray-500 mt-6">No messages yet. Send the first one below.</p>}
                {grouped.map(g => (
                  <div key={g.day} className="space-y-2">
                    <p className="text-center"><span className="inline-block text-[11px] px-2.5 py-0.5 rounded-md bg-white/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{g.day}</span></p>
                    {g.items.map(m => {
                      const out = m.direction === 'out';
                      return (
                        <div key={m._id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 shadow-sm ${out ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>
                            {m.mediaUrl && (m.mediaType === 'image'
                              ? <a href={m.mediaUrl} target="_blank" rel="noreferrer"><img src={m.mediaUrl} alt="" className="rounded-lg max-h-60 mb-1" /></a>
                              : <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="text-xs underline block mb-1">Open {m.mediaType || 'attachment'}</a>)}
                            {!m.mediaUrl && m.mediaType && <p className="text-xs italic opacity-80 mb-1">[{m.mediaType}]</p>}
                            {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                            <p className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${out ? 'text-white/75' : 'text-gray-400'}`}>
                              {out && m.sentByName && <span className="mr-1">{m.sentByName} ·</span>}
                              {fmtTime(m.createdAt)} {out && <Tick status={m.status} error={m.error} />}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
                <textarea rows={1} value={text} onChange={e => setText(e.target.value)} maxLength={4096}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
                  placeholder={meta.connected ? 'Type a message' : 'Type a reply (saved until WhatsApp API is connected)'}
                  className={`${inputCls} resize-none max-h-32`} />
                <button disabled={sending || !text.trim()} className="p-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 shrink-0">
                  <FiSend className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <form onSubmit={createChat} onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">New WhatsApp chat</h3>
              <button type="button" onClick={() => setShowNew(false)} className="text-gray-400"><FiX className="w-5 h-5" /></button>
            </div>
            <input value={newChat.phone} onChange={e => setNewChat({ ...newChat, phone: e.target.value })} placeholder="Mobile number *" className={inputCls} />
            <input value={newChat.name} onChange={e => setNewChat({ ...newChat, name: e.target.value })} placeholder="Name (optional)" className={inputCls} />
            <button className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">Start chat</button>
          </form>
        </div>
      )}
    </Wrapper>
  );
}
