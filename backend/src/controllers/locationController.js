const { lookupPincode } = require('../utils/pincode');

// GET /api/v1/location/check/:pincode — public. Real PIN code lookup (India
// Post): the district, state, post offices and nearby towns for a PIN, used
// by the customer address form to auto-fill and verify the address.
exports.checkPincode = async (req, res) => {
  const { pincode } = req.params;
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 6-digit PIN code' });
  }
  const info = await lookupPincode(pincode);
  if (!info) {
    return res.status(503).json({ success: false, message: 'PIN code service is not reachable right now' });
  }
  if (!info.valid) {
    return res.json({ success: true, valid: false, message: `PIN code ${pincode} does not exist` });
  }
  res.json({ success: true, ...info });
};
