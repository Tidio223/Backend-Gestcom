/**
 * Middleware pour protéger les comptes privilégiés
 * Empêche toute modification ou suppression des comptes admin et superadmin
 */
const User = require('../models/User');

const PROTECTED_EMAILS = [
  process.env.ADMIN_EMAIL,
  process.env.SUPERADMIN_EMAIL
].filter(Boolean);

const PROTECTED_ROLES = ['admin', 'superadmin'];

/**
 * Middleware pour empêcher l'attribution de rôles protégés à d'autres utilisateurs
 */
const preventProtectedRoleAssignment = (req, res, next) => {
  const { role } = req.body;
  
  // Vérifier si on essaie d'attribuer un rôle protégé
  if (role && PROTECTED_ROLES.includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Attribution de rôle interdite : seuls les comptes protégés peuvent avoir ce rôle'
    });
  }
  
  next();
};

/**
 * Middleware pour empêcher la modification ou suppression de comptes protégés
 */
const protectAccounts = (req, res, next) => {
  const userId = req.params.id;
  const { role, email, status } = req.body;
  
  // Si on essaie de modifier le rôle ou le statut
  if (role || status) {
    // Vérifier si l'utilisateur cible est protégé
    User.findById(userId).then(user => {
      if (user && PROTECTED_EMAILS.includes(user.email)) {
        return res.status(403).json({
          success: false,
          message: 'Modification interdite : ce compte est protégé'
        });
      }
      next();
    }).catch(err => next(err));
  } else if (email) {
    // Si on modifie l'email, vérifier si l'utilisateur est protégé
    // Mais permettre à l'utilisateur de modifier son propre email
    User.findById(userId).then(user => {
      if (user && PROTECTED_EMAILS.includes(user.email) && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Modification interdite : ce compte est protégé'
        });
      }
      next();
    }).catch(err => next(err));
  } else {
    next();
  }
};

/**
 * Middleware pour empêcher la suppression de comptes protégés
 */
const protectAccountDeletion = (req, res, next) => {
  const userId = req.params.id;
  
  User.findById(userId).then(user => {
    if (user && PROTECTED_EMAILS.includes(user.email)) {
      return res.status(403).json({
        success: false,
        message: 'Suppression interdite : ce compte est protégé'
      });
    }
    next();
  }).catch(err => next(err));
};

module.exports = {
  preventProtectedRoleAssignment,
  protectAccounts,
  protectAccountDeletion
};
