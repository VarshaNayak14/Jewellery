const Blog = require('../models/Blog');

const slugify = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'post';

const uniqueSlug = async (base, ignoreId) => {
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Blog.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) slug = `${base}-${n++}`;
  return slug;
};

const EDITABLE = ['title', 'excerpt', 'content', 'coverImage', 'category', 'tags', 'status', 'isFeatured', 'metaTitle', 'metaDescription', 'authorName', 'publishedAt'];

const pickBody = (body) => {
  const data = {};
  EDITABLE.forEach((k) => { if (body[k] !== undefined) data[k] = body[k]; });
  if (typeof data.tags === 'string') data.tags = data.tags.split(',');
  if (Array.isArray(data.tags)) data.tags = data.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 15);
  if (data.publishedAt === '') data.publishedAt = undefined;
  return data;
};

const PUBLIC_LIST_FIELDS = 'title slug excerpt coverImage category tags isFeatured publishedAt readMinutes authorName views';

// ── Public ──────────────────────────────────────────────────────────────────

// GET /blogs?page&limit&category&tag&search
exports.getPublishedBlogs = async (req, res) => {
  const { page = 1, limit = 9, category, tag, search, sort } = req.query;
  const query = { status: 'published', publishedAt: { $lte: new Date() } };
  if (category) query.category = category;
  if (tag) query.tags = String(tag).toLowerCase();
  if (search) query.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(30, Math.max(1, parseInt(limit, 10) || 9));
  const [blogs, total, categories] = await Promise.all([
    Blog.find(query).select(PUBLIC_LIST_FIELDS).sort(sort === 'popular' ? { views: -1, publishedAt: -1 } : { isFeatured: -1, publishedAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
    Blog.countDocuments(query),
    Blog.aggregate([
      { $match: { status: 'published', publishedAt: { $lte: new Date() } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);
  res.json({
    success: true,
    blogs,
    total,
    pages: Math.ceil(total / limitNum),
    categories: categories.filter((c) => c._id).map((c) => ({ name: c._id, count: c.count })),
  });
};

// GET /blogs/:slug — counts a view, returns 3 related posts
exports.getBlogBySlug = async (req, res) => {
  const blog = await Blog.findOneAndUpdate(
    { slug: req.params.slug, status: 'published', publishedAt: { $lte: new Date() } },
    { $inc: { views: 1 } },
    { new: true },
  ).lean();
  if (!blog) return res.status(404).json({ success: false, message: 'Article not found' });

  const related = await Blog.find({
    _id: { $ne: blog._id },
    status: 'published',
    publishedAt: { $lte: new Date() },
    $or: [{ category: blog.category }, { tags: { $in: blog.tags || [] } }],
  }).select(PUBLIC_LIST_FIELDS).sort({ publishedAt: -1 }).limit(3).lean();

  res.json({ success: true, blog, related });
};

// ── Admin / Super Admin ─────────────────────────────────────────────────────

// GET /blogs/admin/all?status&search&page
exports.getAllBlogsAdmin = async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) query.title = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, parseInt(limit, 10) || 20);
  const [blogs, total, counts] = await Promise.all([
    Blog.find(query).sort({ updatedAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum)
      .populate('author', 'name role').lean(),
    Blog.countDocuments(query),
    Blog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({
    success: true, blogs, total, pages: Math.ceil(total / limitNum),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
  });
};

exports.getBlogAdmin = async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
  res.json({ success: true, blog });
};

exports.createBlog = async (req, res) => {
  const data = pickBody(req.body);
  if (!data.title || !data.content) return res.status(400).json({ success: false, message: 'Title and content are required' });
  data.slug = await uniqueSlug(slugify(req.body.slug || data.title));
  data.author = req.user._id;
  if (!data.authorName) data.authorName = req.user.name;
  const blog = await Blog.create(data);
  res.status(201).json({ success: true, blog });
};

exports.updateBlog = async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
  Object.assign(blog, pickBody(req.body));
  if (req.body.slug !== undefined && slugify(req.body.slug) !== blog.slug) {
    blog.slug = await uniqueSlug(slugify(req.body.slug || blog.title), blog._id);
  }
  await blog.save();
  res.json({ success: true, blog });
};

exports.deleteBlog = async (req, res) => {
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
  res.json({ success: true, message: 'Blog deleted' });
};
