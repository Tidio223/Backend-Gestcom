const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware pour enregistrer automatiquement les activités
 */
const activityLogger = (action) => {
  return async (req, res, next) => {
    // Ne pas logger les requêtes GET ou les routes non sensibles
    if (req.method === 'GET') {
      return next();
    }

    try {
      // Attendre que la réponse soit envoyée pour enregistrer le succès
      const originalSend = res.send;
      let responseData = null;

      res.send = function(data) {
        responseData = data;
        return originalSend.call(this, data);
      };

      res.on('finish', async () => {
        // Enregistrer uniquement si la réponse est réussie (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const description = getActivityDescription(action, req, responseData);
          const targetUserId = getTargetUserId(action, req);

          await ActivityLog.create({
            user: req.user.id,
            action,
            targetUser: targetUserId,
            description,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          });
        }
      });

      next();
    } catch (error) {
      // Ne pas bloquer la requête si le logging échoue
      next();
    }
  };
};

/**
 * Obtenir la description de l'activité
 */
const getActivityDescription = (action, req, responseData) => {
  const { user, params, body } = req;
  
  switch (action) {
    case 'login':
      return `${user.name} s'est connecté`;
    case 'logout':
      return `${user.name} s'est déconnecté`;
    case 'create_user':
      return `${user.name} a créé l'utilisateur ${body.name} (${body.email})`;
    case 'delete_user':
      return `${user.name} a supprimé l'utilisateur avec l'ID ${params.id}`;
    case 'update_role':
      return `${user.name} a modifié le rôle de l'utilisateur ${params.id} vers ${body.role}`;
    case 'block_user':
      return `${user.name} a bloqué l'utilisateur ${params.id}`;
    case 'unblock_user':
      return `${user.name} a débloqué l'utilisateur ${params.id}`;
    case 'update_profile':
      return `${user.name} a mis à jour son profil`;
    default:
      return `${user.name} a effectué l'action ${action}`;
  }
};

/**
 * Obtenir l'ID de l'utilisateur cible
 */
const getTargetUserId = (action, req) => {
  switch (action) {
    case 'create_user':
      return null; // Sera peuplé après la création
    case 'delete_user':
    case 'update_role':
    case 'block_user':
    case 'unblock_user':
      return req.params.id;
    case 'update_profile':
      return req.user.id;
    default:
      return null;
  }
};

/**
 * Logger manuel pour les activités spéciales
 */
const logActivity = async (userId, action, targetUserId = null, description = '', ipAddress = '', userAgent = '') => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      targetUser: targetUserId,
      description,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
  }
};

module.exports = { activityLogger, logActivity };
