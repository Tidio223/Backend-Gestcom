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
const { protect, authorize, requireSuperAdmin } = require('../middlewares/auth');

// Routes publiques (authentifiées)
router.route('/').get(protect, getProducts);
router.route('/stats').get(protect, authorize('admin', 'superadmin', 'gerant'), getProductStats);
router.route('/:id').get(protect, getProduct);

// Routes admin/superadmin/gerant uniquement
router.route('/').post(protect, authorize('admin', 'superadmin', 'gerant'), createProduct);
router.route('/:id').put(protect, authorize('admin', 'superadmin', 'gerant'), updateProduct);

// Route super admin uniquement pour la suppression
router.route('/:id').delete(protect, requireSuperAdmin, deleteProduct);

module.exports = router;
