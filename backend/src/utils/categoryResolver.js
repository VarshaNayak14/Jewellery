const Category = require('../models/Category');
const Notification = require('../models/Notification');

// Forms let people pick "Other" and type their own category / sub-category.
// ensureCategory turns whatever was sent (an existing slug, an existing name,
// or a brand-new typed name) into a real Category document:
//   - an existing one is matched by slug or name (case-insensitive)
//   - a new one is created, hidden from the navbar and homepage until an
//     Admin reviews it in Category Management, and the admins are notified
//   - a typed sub-category is added to the category's types
// Returns the Category (or null when nothing was sent).

const slugify = (s) => String(s || '').toLowerCase().trim()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);
const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tidy = (s, max = 60) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

async function ensureCategory(input, { subCategory, addedBy } = {}) {
  const text = tidy(input);
  if (!text) return null;

  const findExisting = () => Category.findOne({
    $or: [{ slug: text.toLowerCase() }, { slug: slugify(text) }, { name: new RegExp(`^${escapeRx(text)}$`, 'i') }],
  });
  let category = await findExisting();

  if (!category) {
    try {
      category = await Category.create({
        name: text,
        slug: slugify(text) || `category-${Date.now()}`,
        types: [],
        isActive: true,
        showInNavbar: false,
        showOnHomepage: false,
      });
      await Notification.create({
        title: 'New category added',
        message: `"${text}" was added${addedBy ? ` by ${addedBy}` : ''}. Review it in Category Management and turn on "Show in Navbar" if it should appear on the website.`,
        type: 'push',
        targetRole: 'admin',
      }).catch(() => {});
    } catch (err) {
      // Someone else created it at the same moment.
      if (err?.code === 11000) category = await findExisting();
      else throw err;
    }
  }

  const sub = tidy(subCategory);
  if (category && sub && !category.types.some(t => t.toLowerCase() === sub.toLowerCase())) {
    category.types.push(sub);
    await category.save();
  }
  return category;
}

// The sub-category spelled the way the category already has it ("kurtis" → "Kurtis").
const canonicalSub = (category, sub) => {
  const s = tidy(sub);
  if (!category || !s) return s;
  return category.types.find(t => t.toLowerCase() === s.toLowerCase()) || s;
};

module.exports = { ensureCategory, canonicalSub, slugify };
