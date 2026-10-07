const mongoose = require('mongoose');

// Journal / blog posts shown at /blogs. Written by Admin / Super Admin.
// `content` is plain text with light formatting (## heading, - list, **bold**,
// ![alt](url) image) rendered safely on the frontend — no raw HTML stored.
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  excerpt: { type: String, trim: true, maxlength: 400, default: '' },
  content: { type: String, required: true },
  coverImage: { type: String, trim: true, default: '' },
  category: { type: String, trim: true, default: 'Style Guide' },
  tags: [{ type: String, trim: true, lowercase: true }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  isFeatured: { type: Boolean, default: false },
  publishedAt: { type: Date },
  readMinutes: { type: Number, default: 1 },
  views: { type: Number, default: 0 },
  metaTitle: { type: String, trim: true, default: '' },
  metaDescription: { type: String, trim: true, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, trim: true, default: '' },
}, { timestamps: true });

blogSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });
blogSchema.index({ status: 1, publishedAt: -1 });

blogSchema.pre('validate', function setDerived(next) {
  if (this.isModified('content')) {
    const words = String(this.content || '').trim().split(/\s+/).filter(Boolean).length;
    this.readMinutes = Math.max(1, Math.round(words / 200));
  }
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
