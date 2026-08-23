const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Création de l'Administrateur par défaut
 * Cette fonction est appelée au démarrage du serveur
 */
const createAdmin = async () => {
  try {
    // Vérifier si l'Administrateur existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@gestcom.com' });
    
    if (!existingAdmin) {
      // Créer l'Administrateur avec rôle "admin"
      const admin = new User({
        name: 'Administrateur',
        email: 'admin@gestcom.com',
        password: 'admin123', // Sera hashé automatiquement
        role: 'admin',
        status: 'active'
      });

      await admin.save();
      console.log('Administrateur créé avec succès:');
      console.log('Email: admin@gestcom.com');
      console.log('Mot de passe: admin123');
      console.log('Rôle: Administrateur');
    } else {
      console.log('Administrateur existe déjà');
    }
  } catch (error) {
    console.error('Erreur lors de la création de l\'Administrateur:', error);
  }
};

module.exports = createAdmin;
