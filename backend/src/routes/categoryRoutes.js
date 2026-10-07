const express = require('express');
const router = express.Router();
const {
  getCategories, getAllCategories, createCategory, updateCategory, deleteCategory,
  addType, removeType, renameType, getSubcategories
} = require('../controllers/categoryController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.get('/', getCategories);
router.get('/all', protect, admin, requirePermission('categories'), getAllCategories);
router.get('/:slug/subcategories', getSubcategories);
router.post('/', protect, admin, requirePermission('categories'), createCategory);
router.put('/:id', protect, admin, requirePermission('categories'), updateCategory);
router.delete('/:id', protect, admin, requirePermission('categories'), deleteCategory);
router.post('/:id/types', protect, admin, requirePermission('categories'), addType);
router.delete('/:id/types/:type', protect, admin, requirePermission('categories'), removeType);
router.put('/:id/types/rename', protect, admin, requirePermission('categories'), renameType);

module.exports = router;
