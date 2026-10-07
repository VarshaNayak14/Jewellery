const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────────────────────────────────
// The one place the app sends email. Things that keep transactional mail
// out of spam, all handled here:
//   - a real sender name:  "growthkarts" <you@gmail.com>  (MAIL_FROM_NAME)
//   - a plain-text part next to the HTML (HTML-only mail scores as spam)
//   - a proper HTML document (doctype, lang, readable text, no tracking)
//   - links only to the real site (CLIENT_URL), never to localhost
//   - one pooled SMTP connection instead of a new login per mail
// Deliverability also depends on the sending account / domain (SPF, DKIM,
// DMARC), which is set up outside the code.
// ─────────────────────────────────────────────────────────────────────────

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 2,
    });
  }
  return transporter;
};

const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const brand = () => process.env.MAIL_FROM_NAME || 'growthkarts';
const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER;

// The public site address for links in mail; localhost links are left out
// (they look like phishing to spam filters and are useless to recipients).
const siteUrl = () => {
  const url = String(process.env.CLIENT_URL || '').replace(/\/+$/, '');
  return url && !/localhost|127\.0\.0\.1/.test(url) ? url : '';
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Simple, spam-safe layout: heading, paragraphs, optional big code, optional button.
function render({ heading, paragraphs = [], code, button, footer }) {
  const name = brand();
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,none;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px;">
        <tr><td style="font-size:18px;font-weight:bold;color:#1d4ed8;padding-bottom:16px;">${escapeHtml(name)}</td></tr>
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px;">${escapeHtml(heading)}</td></tr>
        ${paragraphs.map(p => `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:12px;">${escapeHtml(p)}</td></tr>`).join('')}
        ${code ? `<tr><td style="padding:8px 0 16px;"><div style="display:inline-block;font-size:28px;font-weight:bold;letter-spacing:6px;background:#eff6ff;color:#1e3a8a;padding:12px 20px;border-radius:8px;">${escapeHtml(code)}</div></td></tr>` : ''}
        ${button?.url ? `<tr><td style="padding:8px 0 16px;"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;">${escapeHtml(button.label)}</a></td></tr>` : ''}
        <tr><td style="font-size:12px;color:#6b7280;line-height:1.5;border-top:1px solid #e5e7eb;padding-top:14px;">${escapeHtml(footer || `You received this email because of activity on your ${name} account. If this wasn't you, you can ignore it.`)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    name,
    '',
    heading,
    '',
    ...paragraphs,
    ...(code ? ['', code] : []),
    ...(button?.url ? ['', `${button.label}: ${button.url}`] : []),
    '',
    '—',
    footer || `You received this email because of activity on your ${name} account. If this wasn't you, you can ignore it.`,
  ].join('\n');
  return { html, text };
}

// sendMail({ to, subject, heading, paragraphs, code, button: { label, path | url }, footer })
async function sendMail({ to, subject, button, ...content }) {
  if (!isConfigured()) throw new Error('Email is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)');
  const site = siteUrl();
  const resolvedButton = button && (button.url || (site && button.path ? `${site}${button.path}` : ''))
    ? { label: button.label, url: button.url || `${site}${button.path}` }
    : null;
  const { html, text } = render({ ...content, button: resolvedButton });
  await getTransporter().sendMail({
    from: { name: brand(), address: fromAddress() },
    replyTo: process.env.MAIL_REPLY_TO || fromAddress(),
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail, isConfigured };
