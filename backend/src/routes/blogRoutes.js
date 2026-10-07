const express = require('express');
const router = express.Router();
const {
  getPublishedBlogs, getBlogBySlug,
  getAllBlogsAdmin, getBlogAdmin, createBlog, updateBlog, deleteBlog,
} = require('../controllers/blogController');
const { protect, admin, requirePermission } = require('../middleware/auth');

const staff = [protect, admin, requirePermission('blogs')];

// Admin routes first so "/admin/..." is never read as a slug.
router.get('/admin/all', ...staff, getAllBlogsAdmin);
router.get('/admin/:id', ...staff, getBlogAdmin);
router.post('/', ...staff, createBlog);
router.put('/:id', ...staff, updateBlog);
router.delete('/:id', ...staff, deleteBlog);

// Public
router.get('/', getPublishedBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;
