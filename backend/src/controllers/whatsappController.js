const WhatsAppChat = require('../models/WhatsAppChat');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { isConfigured, sendText } = require('../services/whatsappService');

const notifyTeam = (title, message) => Notification.create({ title, message, type: 'push', targetRole: 'admin' }).catch(() => {});

// Digits only, Indian 10-digit numbers get the 91 country code.
const normalizePhone = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 10) d = `91${d}`;
  return d;
};

// Store one inbound message; creates the chat on first contact.
async function saveInbound({ phone, name, text, mediaUrl, mediaType, providerId }) {
  phone = normalizePhone(phone);
  if (!phone) return null;
  let chat = await WhatsAppChat.findOne({ phone });
  if (chat && providerId && chat.messages.some(m => m.providerId === providerId)) return chat; // duplicate delivery
  const isNew = !chat;
  if (!chat) {
    const local = phone.startsWith('91') ? phone.slice(2) : phone;
    const user = await User.findOne({ phone: { $in: [phone, local, `+${phone}`] } }).select('_id name');
    chat = new WhatsAppChat({ phone, name: name || user?.name || '', user: user?._id || null });
  } else if (name && !chat.name) chat.name = name;

  const preview = text || (mediaType ? `[${mediaType}]` : '');
  chat.messages.push({ direction: 'in', text: text || '', mediaUrl: mediaUrl || '', mediaType: mediaType || '', providerId: providerId || '', status: 'received' });
  chat.unread += 1;
  chat.status = 'open';
  chat.lastMessage = preview.slice(0, 200);
  chat.lastDirection = 'in';
  chat.lastMessageAt = new Date();
  await chat.save();
  if (isNew) notifyTeam('New WhatsApp enquiry', `${chat.name || `+${phone}`}: ${preview.slice(0, 140)}`);
  return chat;
}

// Pull messages out of either the Meta WhatsApp Cloud API webhook body or a
// simple generic body: { phone, name, message, mediaUrl, mediaType, id }.
function parseWebhook(body) {
  const out = [];
  if (Array.isArray(body?.entry)) {
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        const names = Object.fromEntries((v.contacts || []).map(c => [c.wa_id, c.profile?.name || '']));
        for (const m of v.messages || []) {
          const media = m.image || m.video || m.document || m.audio || m.sticker;
          out.push({
            phone: m.from, name: names[m.from] || '', providerId: m.id,
            text: m.text?.body || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || media?.caption || '',
            mediaType: media ? m.type : '', mediaUrl: media?.link || '',
          });
        }
      }
    }
    return out;
  }
  const b = body || {};
  const phone = b.phone || b.from || b.mobile || b.sender;
  if (phone) out.push({
    phone, name: b.name || b.senderName || '', providerId: b.id || b.messageId || '',
    text: b.message || b.text || b.body || '', mediaUrl: b.mediaUrl || '', mediaType: b.mediaType || '',
  });
  return out;
}

// Delivery receipts (Meta "statuses") update outbound message ticks.
async function applyStatuses(body) {
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      for (const s of change.value?.statuses || []) {
        if (!['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue;
        await WhatsAppChat.updateOne(
          { 'messages.providerId': s.id },
          { $set: { 'messages.$.status': s.status, ...(s.errors?.[0]?.title ? { 'messages.$.error': s.errors[0].title } : {}) } },
        );
      }
    }
  }
}

// ── Public webhook (for the WhatsApp automation provider) ────────────────

// GET /api/v1/whatsapp/webhook — Meta's one-time verification handshake
exports.verifyWebhook = (req, res) => {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === token) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
};

// POST /api/v1/whatsapp/webhook — incoming messages / delivery statuses.
// Protected by WHATSAPP_WEBHOOK_SECRET (header "x-webhook-secret" or ?secret=
// in the callback URL — Meta keeps query params, so register
// ".../whatsapp/webhook?secret=<value>" there).
exports.receiveWebhook = async (req, res) => {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const given = req.get('x-webhook-secret') || req.query.secret;
  if (!secret || given !== secret) return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
  const isMeta = Array.isArray(req.body?.entry);
  try {
    const msgs = parseWebhook(req.body);
    for (const m of msgs) await saveInbound(m);
    if (isMeta) await applyStatuses(req.body);
    res.json({ success: true, received: msgs.length });
  } catch (err) {
    console.error('WhatsApp webhook error:', err.message);
    res.json({ success: false }); // 200 so the provider doesn't retry forever
  }
};

// ── Admin / Super Admin inbox ─────────────────────────────────────────────

// GET /api/v1/admin/whatsapp/chats?status=open|closed&search=
exports.getChats = async (req, res) => {
  const filter = {};
  if (['open', 'closed'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    const s = String(req.query.search).trim();
    const rx = { $regex: s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { phone: rx }, { lastMessage: rx }];
  }
  const [chats, unreadChats] = await Promise.all([
    WhatsAppChat.find(filter).select('-messages').populate('user', 'name email').sort('-lastMessageAt').limit(500),
    WhatsAppChat.countDocuments({ unread: { $gt: 0 } }),
  ]);
  res.json({
    success: true, chats, unreadChats,
    connected: isConfigured(),
    webhookReady: !!process.env.WHATSAPP_WEBHOOK_SECRET,
  });
};

// GET /api/v1/admin/whatsapp/chats/:id — also marks it read
exports.getChat = async (req, res) => {
  const chat = await WhatsAppChat.findById(req.params.id).populate('user', 'name email phone');
  if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
  if (chat.unread) { chat.unread = 0; await chat.save(); }
  res.json({ success: true, chat });
};

// POST /api/v1/admin/whatsapp/chats/:id/reply  { message }
exports.replyChat = async (req, res) => {
  const text = String(req.body.message || '').trim().slice(0, 4096);
  if (!text) return res.status(400).json({ success: false, message: 'Write a message' });
  const chat = await WhatsAppChat.findById(req.params.id).populate('user', 'name email phone');
  if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
  const result = await sendText(chat.phone, text);
  chat.messages.push({
    direction: 'out', text, status: result.status, providerId: result.providerId || '', error: result.error || '',
    sentBy: req.user._id, sentByName: req.user.name,
  });
  chat.lastMessage = text.slice(0, 200);
  chat.lastDirection = 'out';
  chat.lastMessageAt = new Date();
  await chat.save();
  res.json({ success: true, chat, delivery: result.status });
};

// PUT /api/v1/admin/whatsapp/chats/:id  { status?, name?, notes? }
exports.updateChat = async (req, res) => {
  const chat = await WhatsAppChat.findById(req.params.id).populate('user', 'name email phone');
  if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
  if (['open', 'closed'].includes(req.body.status)) chat.status = req.body.status;
  if (typeof req.body.name === 'string') chat.name = req.body.name.trim().slice(0, 100);
  if (typeof req.body.notes === 'string') chat.notes = req.body.notes.slice(0, 2000);
  await chat.save();
  res.json({ success: true, chat });
};

// POST /api/v1/admin/whatsapp/chats  { phone, name, message }
// Staff can start a chat manually (e.g. log a number that messaged directly).
exports.createChat = async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (phone.length < 11) return res.status(400).json({ success: false, message: 'Enter a valid mobile number' });
  let chat = await WhatsAppChat.findOne({ phone });
  if (!chat) chat = await WhatsAppChat.create({ phone, name: String(req.body.name || '').trim().slice(0, 100), lastMessage: '', lastDirection: 'out' });
  res.status(201).json({ success: true, chat });
};

exports._saveInbound = saveInbound; // for tests / scripts
