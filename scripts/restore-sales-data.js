const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const backupDir = '/Users/mac/Desktop/Projet-Gestcom/backup-2026-10-09';

const restoreCollection = async (modelName, fileName) => {
  try {
    const filePath = path.join(backupDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`○ ${fileName}: fichier introuvable`);
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.length === 0) {
      console.log(`○ ${fileName}: vide`);
      return;
    }
    
    const Model = require(`../models/${modelName}`);
    await Model.insertMany(data);
    console.log(`✓ Restauré ${fileName}: ${data.length} documents`);
  } catch (error) {
    console.error(`✗ Erreur restauration ${fileName}:`, error.message);
  }
};

const main = async () => {
  console.log('\n=== RESTAURATION DES DONNÉES DE VENTES ===');
  console.log(`Dossier: ${backupDir}\n`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Base de données connectée\n');
    
    await restoreCollection('Sale', 'sales.json');
    await restoreCollection('Invoice', 'invoices.json');
    await restoreCollection('Report', 'reports.json');
    await restoreCollection('Inventory', 'inventories.json');
    await restoreCollection('ActivityLog', 'activity-logs.json');
    await restoreCollection('RefreshToken', 'refresh-tokens.json');
    
    console.log('\n✓ Restauration terminée.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

main();
