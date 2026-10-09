const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware pour vérifier le token JWT
 */
const protect = async (req, res, next) => {
  let token;

  // Vérifier d'abord le cookie accessToken
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Sinon, vérifier le header Authorization
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé - Token manquant'
    });
  }

  try {
    // Décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajouter l'utilisateur à la requête (sans le mot de passe)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur JWT:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

/**
 * Middleware pour vérifier si l'utilisateur est admin
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé - Rôle ${req.user.role} non autorisé`
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est le super admin (basé sur l'email)
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé'
    });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  
  if (!superAdminEmail) {
    return res.status(500).json({
      success: false,
      message: 'Configuration serveur incorrecte : SUPER_ADMIN_EMAIL non défini'
    });
  }

  if (req.user.email !== superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Action réservée au super administrateur'
    });
  }

  next();
};

module.exports = { protect, authorize, requireSuperAdmin };
