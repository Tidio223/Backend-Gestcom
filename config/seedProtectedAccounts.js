const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Création des comptes privilégiés protégés
 * Ces comptes ne peuvent pas être modifiés ou supprimés
 */
const seedProtectedAccounts = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const superadminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!adminEmail || !adminPassword || !superadminEmail || !superadminPassword) {
    console.warn('Variables d\'environnement manquantes pour les comptes protégés');
    console.log('ADMIN_EMAIL, ADMIN_PASSWORD, SUPER_ADMIN_EMAIL, SUPERADMIN_PASSWORD requis');
    return;
  }

  // Créer le compte admin
  try {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Administrateur Protégé',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active'
      });
      console.log('Compte admin protégé créé:', adminEmail);
    } else {
      if (existingAdmin.role !== 'admin') {
        console.warn('ATTENTION: Le compte', adminEmail, 'existe mais n\'a pas le rôle admin. Rôle actuel:', existingAdmin.role);
      } else {
        console.log('Compte admin protégé existe déjà:', adminEmail);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte admin protégé:', error.message);
  }

  // Créer le compte superadmin
  try {
    const existingSuperadmin = await User.findOne({ email: superadminEmail });
    if (!existingSuperadmin) {
      await User.create({
        name: 'Super Administrateur Protégé',
        email: superadminEmail,
        password: superadminPassword,
        role: 'superadmin',
        status: 'active'
      });
      console.log('Compte superadmin protégé créé:', superadminEmail);
    } else {
      if (existingSuperadmin.role !== 'superadmin') {
        console.warn('ATTENTION: Le compte', superadminEmail, 'existe mais n\'a pas le rôle superadmin. Rôle actuel:', existingSuperadmin.role);
      } else {
        console.log('Compte superadmin protégé existe déjà:', superadminEmail);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création du compte superadmin protégé:', error.message);
  }

  console.log('Comptes protégés initialisés avec succès');
};

module.exports = seedProtectedAccounts;
