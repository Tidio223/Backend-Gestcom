const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/auth');

// Routes publiques (authentifiées)
router.route('/').get(protect, getProducts);
router.route('/stats').get(protect, authorize('admin', 'superadmin', 'gerant'), getProductStats);
router.route('/:id').get(protect, getProduct);

// Routes admin/superadmin/gerant uniquement
router.route('/').post(protect, authorize('admin', 'superadmin', 'gerant'), createProduct);
router.route('/:id').put(protect, authorize('admin', 'superadmin', 'gerant'), updateProduct);
router.route('/:id').delete(protect, authorize('admin', 'superadmin', 'gerant'), deleteProduct);

module.exports = router;
