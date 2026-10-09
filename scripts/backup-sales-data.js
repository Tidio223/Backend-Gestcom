const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const backupDir = '/Users/mac/Desktop/Projet-Gestcom/backup-2026-10-09';

const backupCollection = async (modelName, fileName) => {
  try {
    const Model = require(`../models/${modelName}`);
    const data = await Model.find({});
    
    if (data.length > 0) {
      const filePath = path.join(backupDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✓ Sauvegardé ${fileName}: ${data.length} documents`);
    } else {
      console.log(`○ ${fileName}: vide (0 documents)`);
    }
  } catch (error) {
    console.error(`✗ Erreur sauvegarde ${fileName}:`, error.message);
  }
};

const main = async () => {
  console.log(`\n=== SAUVEGARDE DES DONNÉES DE VENTES ===`);
  console.log(`Dossier: ${backupDir}\n`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Base de données connectée\n');
    
    await backupCollection('Sale', 'sales.json');
    await backupCollection('Invoice', 'invoices.json');
    await backupCollection('Report', 'reports.json');
    await backupCollection('Inventory', 'inventories.json');
    await backupCollection('ActivityLog', 'activity-logs.json');
    await backupCollection('RefreshToken', 'refresh-tokens.json');
    
    console.log(`\n✓ Sauvegarde terminée dans: ${backupDir}/`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

main();
