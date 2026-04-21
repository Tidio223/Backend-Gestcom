const mongoose = require('mongoose');

/**
 * Connexion à la base de données MongoDB
 */
const connectDB = async () => {
  try {
    // URI de connexion avec options supplémentaires
    const uri = process.env.MONGODB_URI;
    console.log('Tentative de connexion MongoDB avec URI:', uri.replace(/:([^:@]+)@/, ':***@'));
    
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB connecté: ${conn.connection.host}`);
    console.log('Base de données:', conn.connection.name);
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    console.error('Détails de l\'erreur:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
