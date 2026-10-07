const mongoose = require('mongoose');

// An Enquiry is a "lead" — a user reaching out to a business listing,
// the core JustDial-style interaction (instead of an Order/Cart purchase).
const enquirySchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  // Optional — if the user is logged in, link the enquiry to their account
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  message: { type: String, trim: true, default: '' },
  // What the user was asking about (helps businesses triage leads)
  category: { type: String, trim: true },
  // How the enquiry was generated
  source: {
    type: String,
    enum: ['contact_form', 'click_to_call', 'whatsapp'],
    default: 'contact_form',
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'closed', 'spam'],
    default: 'new',
  },
  // City/area the enquiry was raised from, useful for business owner context
  location: { type: String, trim: true },
}, { timestamps: true });

enquirySchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('Enquiry', enquirySchema);