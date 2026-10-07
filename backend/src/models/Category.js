const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  types: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  // Admin/Super Admin controlled — whether this category is allowed to appear
  // in the storefront's top navigation menu. A category can still exist (and
  // be used for seller registration / product listing) without showing here.
  showInNavbar: { type: Boolean, default: true },
  // Thumbnail shown on the homepage's "Shop by Category" showcase.
  image: { type: String, default: '' },
  // Photo per subcategory, e.g. { Rings: 'https://…/ring.jpg' }. Used by the
  // storefront's mega menu. Keys must match the names in `types`.
  typeImages: { type: Map, of: String, default: {} },
  // Whether this category appears in "Shop by Category" at all — separate
  // from showInNavbar since the two sections serve different purposes.
  // A category with showOnHomepage=true but no image set is still skipped
  // there (nothing to render), until an image is uploaded.
  showOnHomepage: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);