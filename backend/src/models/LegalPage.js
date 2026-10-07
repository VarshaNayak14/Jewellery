const mongoose = require('mongoose');

// Footer pages (Privacy Policy, Terms & Conditions, FAQ), editable by Admin
// and Super Admin from Settings → Pages. `content` uses a light
// Markdown format (## headings, - bullets, **bold**) and may contain the
// placeholders {siteName}, {contactEmail}, {contactPhone}, {address}, which
// are filled from Site Settings when the page is shown.
const legalPageSchema = new mongoose.Schema({
  slug: { type: String, enum: ['privacy-policy', 'terms-and-conditions', 'faq'], required: true, unique: true },
  title: { type: String, required: true, trim: true },
  summary: { type: String, trim: true, default: '' },
  content: { type: String, default: '' },
  // FAQ page only: questions grouped by category (answers use the same
  // light Markdown: **bold**, blank line = new paragraph, - bullets).
  items: {
    type: [{
      category: { type: String, trim: true, default: 'General' },
      question: { type: String, trim: true, required: true },
      answer: { type: String, trim: true, default: '' },
    }],
    default: [],
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LegalPage', legalPageSchema);
