const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const args = process.argv.slice(2);
const dryRun = !args.includes('--confirm');

if (dryRun) {
  console.log('\n⚠️  MODE SIMULATION (--dry-run)');
  console.log('   Aucune suppression ne sera effectuée.\n');
  console.log('   Pour exécuter réellement la suppression, utilisez:');
  console.log('   node scripts/reset-sales-data.js --confirm\n');
} else {
  console.log('\n⚠️  MODE RÉEL (--confirm)');
  console.log('   LES DONNÉES SERONT SUPPRIMÉES DÉFINITIVEMENT !\n');
}

const collectionsToReset = [
  { name: 'sales', model: 'Sale', description: 'Ventes' },
  { name: 'invoices', model: 'Invoice', description: 'Factures' },
  { name: 'reports', model: 'Report', description: 'Rapports' },
  { name: 'inventories', model: 'Inventory', description: 'Inventaires' },
  { name: 'refreshtokens', model: 'RefreshToken', description: 'Refresh tokens' },
];

const partialReset = [
  { name: 'activitylogs', model: 'ActivityLog', description: 'Activity logs (seulement ceux liés aux ventes)', filter: { action: { $in: ['create_sale', 'delete_sale', 'update_sale_status'] } } }
];

const collectionsToKeep = [
  { name: 'products', model: 'Product', description: 'Produits (à garder)' },
  { name: 'stockmovements', model: 'StockMovement', description: 'Mouvements de stock (à garder)' },
  { name: 'users', model: 'User', description: 'Utilisateurs (à garder)' },
  { name: 'financialtransactions', model: 'FinancialTransaction', description: 'Transactions financières (à garder)' },
];

const main = async () => {
  console.log('=== RÉINITIALISATION DES DONNÉES DE VENTES ===\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Base de données connectée\n');
    
    let totalToDelete = 0;
    
    // Collections à supprimer entièrement
    console.log('Collections à supprimer entièrement:');
    for (const col of collectionsToReset) {
      const Model = require(`../models/${col.model}`);
      const count = await Model.countDocuments();
      totalToDelete += count;
      console.log(`  ${col.description}: ${count} documents`);
      
      if (!dryRun && count > 0) {
        await Model.deleteMany({});
        console.log(`    → Supprimé`);
      }
    }
    
    // Collections à supprimer partiellement
    console.log('\nCollections à supprimer partiellement:');
    for (const col of partialReset) {
      const Model = require(`../models/${col.model}`);
      const count = await Model.countDocuments(col.filter);
      totalToDelete += count;
      console.log(`  ${col.description}: ${count} documents`);
      
      if (!dryRun && count > 0) {
        await Model.deleteMany(col.filter);
        console.log(`    → Supprimé`);
      }
    }
    
    // Collections à garder
    console.log('\nCollections à garder (inchangées):');
    for (const col of collectionsToKeep) {
      const Model = require(`../models/${col.model}`);
      const count = await Model.countDocuments();
      console.log(`  ${col.description}: ${count} documents`);
    }
    
    console.log(`\nTotal documents à supprimer: ${totalToDelete}`);
    
    if (dryRun) {
      console.log('\n✓ Simulation terminée. Aucune suppression effectuée.');
      console.log('  Pour exécuter la suppression réelle, utilisez: --confirm');
    } else {
      console.log('\n✓ Suppression terminée.');
      console.log('  Sauvegarde disponible dans: /Users/mac/Desktop/Projet-Gestcom/backup-2026-10-09/');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

main();
