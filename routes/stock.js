const express = require('express');
const { body } = require('express-validator');
const {
  createStockMovement,
  getStockMovements,
  getProductMovements,
  getStockStats
} = require('../controllers/stockController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * Validation pour les mouvements de stock
 */
const movementValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Le produit est obligatoire')
    .isMongoId()
    .withMessage('ID de produit invalide'),
  body('type')
    .isIn(['entry', 'exit', 'adjustment'])
    .withMessage('Le type doit être entry, exit ou adjustment'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('La quantité doit être un entier positif'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La raison ne peut pas dépasser 200 caractères'),
  body('reference')
    .optional()
    .trim()
];

// Routes pour les mouvements de stock (gerant et admin uniquement)
router.post('/movements', protect, authorize('admin', 'gerant'), movementValidation, createStockMovement);
router.get('/movements', protect, authorize('admin', 'gerant'), getStockMovements);
router.get('/movements/product/:productId', protect, authorize('admin', 'gerant'), getProductMovements);
router.get('/stats', protect, authorize('admin', 'gerant'), getStockStats);

module.exports = router;
