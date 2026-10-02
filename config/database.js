const mongoose = require('mongoose');

/**
 * Connexion à la base de données MongoDB
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI non défini');
    }
    
    console.log('Tentative de connexion MongoDB avec URI:', uri.replace(/:([^:@]+)@/, ':***@'));

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      dbName: 'gestcom',
    });

    console.log(`MongoDB connecté: ${conn.connection.host}`);
    console.log('Base de données utilisée:', conn.connection.name);
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
