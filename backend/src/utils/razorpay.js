const Razorpay = require('razorpay');
const SiteSettings = require('../models/SiteSettings');

// Reads Razorpay Key ID / Key Secret from the Super Admin's saved Settings
// (Settings → Payment tab, SiteSettings.razorpayKeyId / razorpayKeySecret) so
// credentials can be changed live without redeploying. Falls back to
// RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET env vars if Settings haven't been
// filled in yet (e.g. on a fresh install).
const getRazorpayCredentials = async () => {
  const settings = await SiteSettings.findOne();
  // Super Admin settings are the primary source. Trim accidental spaces from
  // copy/paste so valid Razorpay credentials are not rejected.
  const keyId = ((settings && settings.razorpayKeyId) || process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = ((settings && settings.razorpayKeySecret) || process.env.RAZORPAY_KEY_SECRET || '').trim();
  return { keyId, keySecret };
};

// Returns a ready-to-use Razorpay SDK instance, or null if no credentials
// have been configured anywhere yet (caller should show a friendly error
// instead of crashing).
const getRazorpayInstance = async () => {
  const { keyId, keySecret } = await getRazorpayCredentials();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

module.exports = { getRazorpayCredentials, getRazorpayInstance };