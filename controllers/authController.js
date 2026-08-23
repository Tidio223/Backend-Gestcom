const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { logActivity } = require('../middlewares/activityLogger');

const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

const mockUsers = [
  {
    _id: 'mock-admin-1',
    name: 'Administrateur',
    email: 'admin@gestcom.com',
    role: 'admin',
    status: 'active',
    password: 'admin123',
  },
  {
    _id: 'mock-gerant-1',
    name: 'Gérant',
    email: 'gerant@gestcom.com',
    role: 'gerant',
    status: 'active',
    password: 'gerant123',
  },
];

const mockUserByEmail = (email) => mockUsers.find((user) => user.email === email);

/**
 * @desc    Inscription d'un nouvel utilisateur
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    // Validation des entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      name,
      email,
      password
    });

    // Générer le token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Renvoyer les données (sans le mot de passe)
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Connexion d'un utilisateur
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    // Validation des entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Vérifier si l'email et le mot de passe sont fournis
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email et un mot de passe'
      });
    }

    if (useMockAuth) {
      const mockUser = mockUserByEmail(email);
      if (!mockUser || mockUser.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      const token = jwt.sign(
        { id: mockUser._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          token
        }
      });
    }

    // Trouver l'utilisateur (avec le mot de passe)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si l'utilisateur est bloqué
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été bloqué. Veuillez contacter l\'administrateur.'
      });
    }

    // Générer le token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Enregistrer l'activité de connexion
    await logActivity(
      user._id,
      'login',
      null,
      `${user.name} s'est connecté`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Déconnexion (client-side - suppression du token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  // Enregistrer l'activité de déconnexion
  if (req.user) {
    await logActivity(
      req.user.id,
      'logout',
      null,
      `${req.user.name} s'est déconnecté`,
      req.ip,
      req.get('User-Agent')
    );
  }

  res.status(200).json({
    success: true,
    message: 'Déconnexion réussie'
  });
};

/**
 * @desc    Demande de réinitialisation de mot de passe
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir votre email'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec cet email'
      });
    }

    // Générer le token de réinitialisation
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // En production, envoyer un email avec le token
    // Pour l'instant, on retourne le token (à adapter selon vos besoins)
    res.status(200).json({
      success: true,
      message: 'Token de réinitialisation généré',
      data: {
        resetToken // En production, ne pas renvoyer ce token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Réinitialisation du mot de passe
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
    }

    // Hash le token reçu
    const crypto = require('crypto');
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Trouver l'utilisateur avec le token valide
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe
};
