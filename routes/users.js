const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  updateUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * Validation pour la mise à jour du rôle
 */
const updateRoleValidation = [
  body('role')
    .isIn(['caissier', 'gerant', 'admin'])
    .withMessage('Le rôle doit être "caissier", "gerant" ou "admin"')
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

// Routes admin uniquement
router.get('/', protect, authorize('admin'), getUsers);
router.get('/stats', protect, authorize('admin'), getUserStats);
router.get('/:id', protect, authorize('admin'), getUser);
router.put('/:id/role', protect, authorize('admin'), updateRoleValidation, updateUserRole);
router.delete('/:id', protect, authorize('admin'), deleteUser);

// Routes utilisateur (admin ou utilisateur lui-même)
router.put('/:id', protect, updateProfileValidation, updateUser);

module.exports = router;
