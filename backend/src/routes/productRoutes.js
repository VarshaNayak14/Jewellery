const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getFeaturedProducts, getFlashSaleProducts, getCategoryTree, getAllProductsAdmin,
  addVariant, updateVariant, deleteVariant, reorderVariantImages
} = require('../controllers/productController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/flash-sale', getFlashSaleProducts);
// Static path — MUST come before '/:id' or "categories" would be read as an id
router.get('/categories', getCategoryTree);
// Admin/staff product management — unfiltered by location/approval (see
// getAllProductsAdmin). Static path, also before '/:id'.
router.get('/admin/all', protect, admin, requirePermission('products'), getAllProductsAdmin);
router.get('/:id', getProduct);
router.post('/', protect, admin, requirePermission('products'), createProduct);
router.put('/:id', protect, admin, requirePermission('products'), updateProduct);
router.delete('/:id', protect, admin, requirePermission('products'), deleteProduct);

// Variant routes
router.post('/:id/variants', protect, admin, requirePermission('products'), addVariant);
router.put('/:id/variants/:variantId', protect, admin, requirePermission('products'), updateVariant);
router.delete('/:id/variants/:variantId', protect, admin, requirePermission('products'), deleteVariant);
router.put('/:id/variants/:variantId/reorder-images', protect, admin, requirePermission('products'), reorderVariantImages);

module.exports = router;