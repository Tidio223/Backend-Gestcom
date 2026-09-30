const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateEmail,
  updatePassword
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { activityLogger } = require('../middlewares/activityLogger');

const router = express.Router();

/**
 * Validation pour l'inscription
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est obligatoire')
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Veuillez fournir un email valide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

/**
 * Validation pour la connexion
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Veuillez fournir un email valide'),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est obligatoire')
];

/**
 * Validation pour la réinitialisation du mot de passe
 */
const resetPasswordValidation = [
  body('resetToken')
    .notEmpty()
    .withMessage('Le token de réinitialisation est obligatoire'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
];

/**
 * Validation pour l'oubli de mot de passe
 */
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Veuillez fournir un email valide')
];

/**
 * Validation pour la mise à jour de l'email
 */
const updateEmailValidation = [
  body('newEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Veuillez fournir un email valide'),
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est obligatoire')
];

/**
 * Validation pour la mise à jour du mot de passe
 */
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Le mot de passe actuel est obligatoire'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
];

// Routes publiques
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, activityLogger('login'), login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Routes protégées
router.post('/logout', protect, activityLogger('logout'), logout);
router.get('/me', protect, getMe);
router.post('/update-email', protect, updateEmailValidation, activityLogger('update_email'), updateEmail);
router.post('/update-password', protect, updatePasswordValidation, activityLogger('update_password'), updatePassword);

module.exports = router;
