const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const { body } = require('express-validator');
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getFinancialStats
} = require('../controllers/financialController');

const router = express.Router();

// Validation pour la création de transaction
const transactionValidation = [
  body('type')
    .isIn(['income', 'expense', 'salary'])
    .withMessage('Le type doit être income, expense ou salary'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Le montant doit être un nombre positif'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('La description est requise et ne doit pas dépasser 500 caractères'),
  body('category')
    .trim()
    .isLength({ min: 1 })
    .withMessage('La catégorie est requise'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'bank_transfer', 'mobile_money', 'check', 'other'])
    .withMessage('Le mode de paiement n\'est pas valide'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('La date doit être valide'),
  body('recipient')
    .if(body('type').equals('salary'))
    .notEmpty()
    .withMessage('L\'employé destinataire est requis pour les paiements de salaire'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent être un tableau'),
];

// Validation pour la mise à jour de transaction
const updateValidation = [
  body('type')
    .optional()
    .isIn(['income', 'expense', 'salary'])
    .withMessage('Le type doit être income, expense ou salary'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant doit être un nombre positif'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('La description doit être entre 1 et 500 caractères'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('La catégorie est requise'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'bank_transfer', 'mobile_money', 'check', 'other'])
    .withMessage('Le mode de paiement n\'est pas valide'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('La date doit être valide'),
  body('recipient')
    .if(body('type').equals('salary'))
    .notEmpty()
    .withMessage('L\'employé destinataire est requis pour les paiements de salaire'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent être un tableau'),
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('Le statut n\'est pas valide'),
];

// Routes
router.get('/stats', protect, authorize('admin'), getFinancialStats);
router.get('/transactions', protect, authorize('admin'), getTransactions);
router.get('/transactions/:id', protect, authorize('admin'), getTransactionById);
router.post('/transactions', protect, authorize('admin'), transactionValidation, createTransaction);
router.put('/transactions/:id', protect, authorize('admin'), updateValidation, updateTransaction);
router.delete('/transactions/:id', protect, authorize('admin'), deleteTransaction);

module.exports = router;
