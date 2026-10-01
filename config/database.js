const mongoose = require('mongoose');

/**
 * Connexion à la base de données MongoDB
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gestcom';
    console.log('Tentative de connexion MongoDB avec URI:', uri.replace(/:([^:@]+)@/, ':***@'));

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB connecté: ${conn.connection.host}`);
    console.log('Base de données:', conn.connection.name);
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    console.warn('Le serveur continuera en mode dégradé. Les comptes protégés ne seront pas créés.');
  }
};

module.exports = connectDB;
