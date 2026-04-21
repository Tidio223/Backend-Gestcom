/**
 * Middleware de gestion globale des erreurs
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Erreur Mongoose - CastError
  if (err.name === 'CastError') {
    const message = 'Ressource non trouvée';
    error = { message, statusCode: 404 };
  }

  // Erreur Mongoose - Duplicate Key
  if (err.code === 11000) {
    const message = 'Cette ressource existe déjà';
    error = { message, statusCode: 400 };
  }

  // Erreur Mongoose - Validation
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalide';
    error = { message, statusCode: 401 };
  }

  // Erreur JWT expiré
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expiré';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erreur serveur'
  });
};

module.exports = errorHandler;
