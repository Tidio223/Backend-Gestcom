const express = require('express');
const { body } = require('express-validator');
const {
  createSale,
  getSales,
  getSale,
  updateSaleStatus,
  getSalesStats
} = require('../controllers/saleController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * Validation pour la création d'une vente
 */
const createSaleValidation = [
  body('customer')
    .trim()
    .notEmpty()
    .withMessage('Le nom du client est obligatoire'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Une vente doit contenir au moins un article'),
  body('items.*.productId')
    .notEmpty()
    .withMessage('L\'ID du produit est obligatoire'),
  body('items.*.productName')
    .trim()
    .notEmpty()
    .withMessage('Le nom du produit est obligatoire'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La quantité doit être au moins 1'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Le prix unitaire doit être positif'),
  body('items.*.total')
    .isFloat({ min: 0 })
    .withMessage('Le total doit être positif')
];

// Routes publiques (authentifiées)
router.post('/', protect, createSaleValidation, createSale);
router.get('/', protect, getSales);
router.get('/stats', protect, getSalesStats);
router.get('/:id', protect, getSale);

// Routes admin uniquement
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), updateSaleStatus);

module.exports = router;
