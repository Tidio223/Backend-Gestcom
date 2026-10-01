const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Création des comptes privilégiés protégés
 * Ces comptes ne peuvent pas être modifiés ou supprimés
 */
const seedProtectedAccounts = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    const superadminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!adminEmail || !adminPassword || !superadminEmail || !superadminPassword) {
      console.warn('Variables d\'environnement manquantes pour les comptes protégés');
      console.log('ADMIN_EMAIL, ADMIN_PASSWORD, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD requis');
      return;
    }

    // Créer ou mettre à jour le compte admin
    const adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const newAdmin = new User({
        name: 'Administrateur Protégé',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active'
      });
      await newAdmin.save();
      console.log('Compte admin protégé créé:', adminEmail);
    } else {
      if (adminUser.role !== 'admin') {
        console.warn('ATTENTION: Le compte', adminEmail, 'existe mais n\'a pas le rôle admin. Rôle actuel:', adminUser.role);
      } else {
        console.log('Compte admin protégé existe déjà:', adminEmail);
      }
    }

    // Créer ou mettre à jour le compte superadmin
    const superadminUser = await User.findOne({ email: superadminEmail });
    if (!superadminUser) {
      const newSuperadmin = new User({
        name: 'Super Administrateur Protégé',
        email: superadminEmail,
        password: superadminPassword,
        role: 'superadmin',
        status: 'active'
      });
      await newSuperadmin.save();
      console.log('Compte superadmin protégé créé:', superadminEmail);
    } else {
      if (superadminUser.role !== 'superadmin') {
        console.warn('ATTENTION: Le compte', superadminEmail, 'existe mais n\'a pas le rôle superadmin. Rôle actuel:', superadminUser.role);
      } else {
        console.log('Compte superadmin protégé existe déjà:', superadminEmail);
      }
    }

    console.log('Comptes protégés initialisés avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des comptes protégés:', error);
  }
};

module.exports = seedProtectedAccounts;
