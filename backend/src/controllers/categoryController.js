const Category = require('../models/Category');

// Seed a starter set of common local-business categories on first run only
// (admin can add/edit/remove freely afterwards — this is not a fixed list).
const STARTER_CATEGORIES = [
  { name: 'Restaurants', slug: 'restaurants', types: ['North Indian', 'South Indian', 'Chinese', 'Fast Food', 'Cafe'] },
  { name: 'Doctors & Clinics', slug: 'doctors-clinics', types: ['General Physician', 'Dentist', 'Skin Specialist', 'Pediatrician'] },
  { name: 'Home Services', slug: 'home-services', types: ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'AC Repair'] },
  { name: 'Beauty & Salons', slug: 'beauty-salons', types: ['Unisex Salon', 'Spa', 'Bridal Makeup'] },
  { name: 'Education', slug: 'education', types: ['Tuition Classes', 'Coaching Institute', 'Music Classes'] },
  { name: 'Automobiles', slug: 'automobiles', types: ['Car Repair', 'Bike Service', 'Car Rental'] },
  { name: 'Event & Party', slug: 'event-party', types: ['Caterers', 'Photographers', 'Banquet Halls', 'Decorators'] },
  { name: 'Real Estate', slug: 'real-estate', types: ['Property Dealers', 'Packers & Movers', 'Interior Designers'] },
];

const seedStarterCategoriesIfEmpty = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(STARTER_CATEGORIES.map(c => ({ ...c, isActive: true })));
  }
};

// Get all active categories (public — shown on homepage / search filters)
exports.getCategories = async (req, res) => {
  await seedStarterCategoriesIfEmpty();
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, categories });
};

// Get all categories including inactive (admin) — supports optional page/limit
// query params for pagination; when omitted, page defaults to 1 and limit is
// high enough to return every category in one page (there are typically only
// a handful of top-level categories today).
exports.getAllCategories = async (req, res) => {
  await seedStarterCategoriesIfEmpty();
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [categories, total] = await Promise.all([
    Category.find().sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
    Category.countDocuments(),
  ]);
  res.json({ success: true, categories, total, pages: Math.max(1, Math.ceil(total / parseInt(limit))) });
};

// Create a new business category (admin — no longer fixed to a hardcoded list)
exports.createCategory = async (req, res) => {
  const { name, types } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const exists = await Category.findOne({ slug });
  if (exists) return res.status(400).json({ success: false, message: 'A category with this name already exists' });

  const category = await Category.create({
    name: name.trim(),
    slug,
    types: Array.isArray(types) ? types.map(t => t.trim()).filter(Boolean) : [],
    isActive: true,
  });
  res.status(201).json({ success: true, category });
};

// Update a category (name, active status). Slug is regenerated if name changes.
exports.updateCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  if (req.body.name !== undefined && req.body.name.trim()) {
    category.name = req.body.name.trim();
    category.slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
  if (req.body.showInNavbar !== undefined) category.showInNavbar = req.body.showInNavbar;
  if (req.body.showOnHomepage !== undefined) category.showOnHomepage = req.body.showOnHomepage;
  if (req.body.image !== undefined) category.image = req.body.image;
  // { SubcategoryName: imageUrl } — photos for the navbar mega menu
  if (req.body.typeImages && typeof req.body.typeImages === 'object') {
    category.typeImages = req.body.typeImages;
  }

  await category.save();
  res.json({ success: true, category });
};

// Delete a category (admin)
exports.deleteCategory = async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deleted' });
};

// Add a subcategory (type) to a category
exports.addType = async (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ success: false, message: 'Subcategory name is required' });
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  const normalizedType = type.trim();
  if (category.types.map(t => t.toLowerCase()).includes(normalizedType.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Subcategory already exists in this category' });
  }
  category.types.push(normalizedType);
  await category.save();
  res.json({ success: true, category });
};

// Remove a subcategory (type)
exports.removeType = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  const typeToRemove = decodeURIComponent(req.params.type);
  category.types = category.types.filter(t => t !== typeToRemove);
  await category.save();
  res.json({ success: true, category });
};

// Rename a subcategory (type)
exports.renameType = async (req, res) => {
  const { oldType, newType } = req.body;
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  const idx = category.types.indexOf(oldType);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Subcategory not found' });
  category.types[idx] = newType.trim();
  await category.save();
  res.json({ success: true, category });
};

// Get subcategories for a given category slug (public)
exports.getSubcategories = async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug, isActive: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, subcategories: category.types });
};