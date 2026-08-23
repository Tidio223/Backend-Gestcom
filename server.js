const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/error');
const { getListenHost, getPort } = require('./config/serverConfig');
const createAdmin = require('./config/seedAdmin');

// Charger les variables d'environnement
dotenv.config();

// Connexion à la base de données si disponible
connectDB().catch(() => {
  console.warn('Base de données indisponible, le serveur continuera en mode dégradé.');
});

// Initialiser l'application Express
const app = express();

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://frontend-gestcom.vercel.app'] 
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

app.use(cors({
  origin: allowedOrigins,
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
app.use('/api/activity', require('./routes/activity'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/products', require('./routes/products'));
app.use('/api/financial', require('./routes/financial'));

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

// Démarrer le serveur uniquement si ce fichier est exécuté directement
const PORT = getPort();
const HOST = getListenHost();

if (require.main === module) {
  const server = app.listen(PORT, HOST, async () => {
    console.log(`\nServeur démarré sur ${HOST}:${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV}`);
    console.log(`API: http://${HOST}:${PORT}/api`);
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

    // Créer l'administrateur par défaut
    await createAdmin();
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
}

module.exports = app;
