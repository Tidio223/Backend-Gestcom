const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe
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

// Routes publiques
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, activityLogger('login'), login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Routes protégées
router.post('/logout', protect, activityLogger('logout'), logout);
router.get('/me', protect, getMe);

module.exports = router;
