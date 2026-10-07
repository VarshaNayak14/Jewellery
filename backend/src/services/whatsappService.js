// Outbound WhatsApp sending. No automation provider is connected yet, so
// replies are saved as "pending" in the inbox. To connect one later, set in
// backend/.env:
//   WHATSAPP_API_URL    — the provider's "send message" endpoint
//   WHATSAPP_API_TOKEN  — sent as "Authorization: Bearer <token>"
// and adjust buildPayload() below to the provider's request format.
// (Meta WhatsApp Cloud API: https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/messages)

const isConfigured = () => !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);

// Default body follows the Meta WhatsApp Cloud API text message format.
const buildPayload = (phone, text) => ({
  messaging_product: 'whatsapp',
  to: phone,
  type: 'text',
  text: { body: text },
});

// Returns { status: 'sent' | 'pending' | 'failed', providerId?, error? }
async function sendText(phone, text) {
  if (!isConfigured()) return { status: 'pending', error: 'WhatsApp API not connected yet' };
  try {
    const res = await fetch(process.env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
      body: JSON.stringify(buildPayload(phone, text)),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'failed', error: data?.error?.message || data?.message || `HTTP ${res.status}` };
    return { status: 'sent', providerId: data?.messages?.[0]?.id || data?.id || '' };
  } catch (err) {
    return { status: 'failed', error: err.message };
  }
}

module.exports = { isConfigured, sendText };
