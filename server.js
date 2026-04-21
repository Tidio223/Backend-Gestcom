const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/error');

// Charger les variables d'environnement
dotenv.config();

// Connexion à la base de données
connectDB();

// Initialiser l'application Express
const app = express();

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://votredomaine.com'] 
    : ['http://localhost:3000', 'http://localhost:8080'], // Frontend React
  credentials: true
}));

// Limiter le nombre de requêtes (rate limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limiter chaque IP à 100 requêtes par windowMs
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});
app.use('/api/', limiter);

// Parser le corps des requêtes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Route de test
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API GestCom - Backend opérationnel',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Route 404 pour les routes non trouvées
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`
  });
});

// Middleware de gestion des erreurs (doit être après les routes)
app.use(errorHandler);

// Démarrer le serveur
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\nServeur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log('\nRoutes disponibles:');
  console.log('  POST /api/auth/register - Inscription');
  console.log('  POST /api/auth/login - Connexion');
  console.log('  POST /api/auth/logout - Déconnexion');
  console.log('  POST /api/auth/forgot-password - Mot de passe oublié');
  console.log('  POST /api/auth/reset-password - Réinitialiser mot de passe');
  console.log('  GET  /api/auth/me - Profil utilisateur');
  console.log('  GET  /api/users - Liste utilisateurs (admin)');
  console.log('  GET  /api/users/stats - Stats utilisateurs (admin)');
  console.log('  GET  /api/users/:id - Détails utilisateur (admin)');
  console.log('  PUT  /api/users/:id/role - Modifier rôle (admin)');
  console.log('  DELETE /api/users/:id - Supprimer utilisateur (admin)');
});

// Gérer les rejets de promesses non gérés
process.on('unhandledRejection', (err, promise) => {
  console.log(`Erreur: ${err.message}`);
  // Fermer le serveur proprement
  server.close(() => {
    process.exit(1);
  });
});

// Gérer les exceptions non capturées
process.on('uncaughtException', (err) => {
  console.log(`Erreur: ${err.message}`);
  process.exit(1);
});

module.exports = app;
