const ContactMessage = require('../models/ContactMessage');

const createContactMessage = async (req, res) => {
  const { name, email, phone = '', subject = '', message } = req.body;
  if (typeof name !== 'string' || !name.trim()
    || typeof email !== 'string' || !email.trim()
    || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }

  const normalizedEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (name.trim().length > 120 || normalizedEmail.length > 254
    || (typeof phone === 'string' && phone.trim().length > 30)
    || (typeof subject === 'string' && subject.trim().length > 160)
    || message.trim().length > 5000) {
    return res.status(400).json({ success: false, message: 'One or more fields exceed the allowed length.' });
  }

  const contactMessage = await ContactMessage.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: typeof phone === 'string' ? phone.trim() : '',
    subject: typeof subject === 'string' ? subject.trim() : '',
    message: message.trim(),
  });

  res.status(201).json({ success: true, message: 'Your message has been sent.', data: { id: contactMessage._id } });
};

const getContactMessagesForSuperAdmin = async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, messages });
};

module.exports = { createContactMessage, getContactMessagesForSuperAdmin };
