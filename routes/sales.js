const express = require('express');
const { body } = require('express-validator');
const {
  createSale,
  getSales,
  getSale,
  updateSaleStatus,
  getSalesStats,
  deleteSale
} = require('../controllers/saleController');
const { protect, authorize, requireSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

/**
 * Validation pour la création d'une vente
 */
const createSaleValidation = [
  body('customer')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom du client ne peut pas être vide si fourni'),
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
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le prix unitaire doit être positif'),
  body('items.*.total')
    .optional()
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

// Routes super admin uniquement pour la suppression
router.delete('/:id', protect, requireSuperAdmin, deleteSale);

module.exports = router;
