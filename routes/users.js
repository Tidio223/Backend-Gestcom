const express = require('express');
const { body } = require('express-validator');
const {
  createUser,
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  updateUser,
  blockUser,
  unblockUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const { preventProtectedRoleAssignment, protectAccounts, protectAccountDeletion } = require('../middlewares/protectedAccounts');

const router = express.Router();

/**
 * Validation pour la création d'utilisateur
 */
const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Le nom est obligatoire'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').isIn(['caissier', 'gerant']).withMessage('Rôle invalide')
];

/**
 * Validation pour la mise à jour du rôle
 */
const updateRoleValidation = [
  body('role')
    .isIn(['caissier', 'gerant'])
    .withMessage('Le rôle doit être "caissier" ou "gerant"')
];

/**
 * Validation pour la mise à jour du profil
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom ne peut pas être vide')
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Veuillez fournir un email valide')
];

// Routes admin et superadmin uniquement
router.post('/', protect, authorize('admin', 'superadmin'), preventProtectedRoleAssignment, createUserValidation, createUser);
router.get('/', protect, authorize('admin', 'superadmin'), getUsers);
router.get('/stats', protect, authorize('admin', 'superadmin'), getUserStats);
router.get('/:id', protect, authorize('admin', 'superadmin'), getUser);
router.put('/:id/role', protect, authorize('admin', 'superadmin'), preventProtectedRoleAssignment, protectAccounts, updateRoleValidation, updateUserRole);
router.patch('/:id/block', protect, authorize('admin', 'superadmin'), protectAccounts, blockUser);
router.patch('/:id/unblock', protect, authorize('admin', 'superadmin'), protectAccounts, unblockUser);
router.delete('/:id', protect, authorize('admin', 'superadmin'), protectAccountDeletion, deleteUser);

// Routes utilisateur (admin ou utilisateur lui-même)
router.put('/:id', protect, protectAccounts, updateProfileValidation, updateUser);

module.exports = router;
