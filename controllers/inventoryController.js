const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { logActivity } = require('../middlewares/activityLogger');
const { computeStockBalance } = require('../utils/stockBalance');

/**
 * Helper pour obtenir la date en fuseau Africa/Bamako (UTC+0)
 */
const getBamakoDate = () => {
  const now = new Date();
  // Africa/Bamako est UTC+0, pas de décalage
  return new Date(now.toISOString().split('T')[0]);
};

/**
 * Helper pour obtenir les dates de période
 */
const getPeriodDates = (type, referenceDate) => {
  const now = new Date(referenceDate || getBamakoDate());
  let startDate, endDate, period;

  switch (type) {
    case 'daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      period = startDate.toISOString().split('T')[0];
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      period = `${startDate.toISOString().split('T')[0]} au ${endDate.toISOString().split('T')[0]}`;
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      period = `${startDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;
      break;
    default:
      startDate = new Date(now);
      endDate = new Date(now);
      period = now.toISOString().split('T')[0];
  }

  return { startDate, endDate, period };
};

/**
 * Upsert un inventaire (créer ou mettre à jour)
 */
const upsertInventory = async (type, userId, referenceDate) => {
  const { startDate, endDate, period } = getPeriodDates(type, referenceDate);
  const date = new Date(startDate);

  // Récupérer TOUS les produits
  const products = await Product.find({});
  const productMap = new Map();

  // Initialiser la map avec tous les produits
  products.forEach(product => {
    productMap.set(product._id.toString(), {
      productId: product._id,
      productName: product.name,
      quantitySold: 0,
      unitPrice: product.prixDetail || product.price || 0,
      total: 0,
      stockRemaining: product.stock || 0,
      wholesalePrice: product.prixGros || product.price || 0,
      retailPrice: product.prixDetail || product.price || 0,
      typeVente: 'detail'
    });
  });

  // Récupérer les ventes de la période (toutes les ventes valides, pas annulées)
  const sales = await Sale.find({
    status: { $ne: 'cancelled' },
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('items.productId');

  let totalSales = 0;
  let totalProductsSold = 0;

  // Pour gérer les produits vendus à plusieurs prix, on utilise une map par (productId, typeVente, unitPrice)
  const salesMap = new Map();

  // Mettre à jour avec les ventes (toutes les lignes valorisées au prix de gros)
  sales.forEach(sale => {
    const saleType = sale.typeVente || 'detail';
    
    sale.items.forEach(item => {
      const productId = item.productId._id.toString();
      const wholesale = item.productId.prixGros || item.productId.price || 0;
      const key = `${productId}_${saleType}`;
      
      const existing = salesMap.get(key);
      
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.total += item.quantity * wholesale;
      } else {
        salesMap.set(key, {
          productId: item.productId._id,
          productName: item.productName,
          quantitySold: item.quantity,
          unitPrice: wholesale,
          total: item.quantity * wholesale,
          stockRemaining: item.productId.stock || 0,
          wholesalePrice: wholesale,
          retailPrice: item.productId.prixDetail || item.productId.price || 0,
          typeVente: saleType
        });
      }
      
      totalSales += item.total;
      totalProductsSold += item.quantity;
    });
  });

  const items = Array.from(salesMap.values());

  // Calculer la valeur du stock restant
  let stockValueWholesale = 0;
  let stockValueRetail = 0;
  
  products.forEach(product => {
    stockValueWholesale += (product.stock || 0) * (product.prixGros || product.price || 0);
    stockValueRetail += (product.stock || 0) * (product.prixDetail || product.price || 0);
  });

  // Compter les produits en stock faible
  const lowStockProducts = await Product.countDocuments({
    stock: { $lte: 10 }
  });

  // Calculer la rotation du stock (produits vendus / stock total)
  const totalStock = await Product.aggregate([
    { $group: { _id: null, total: { $sum: '$stock' } } }
  ]);
  const stockRotation = totalStock.length > 0 && totalStock[0].total > 0 
    ? (totalProductsSold / totalStock[0].total) * 100 
    : 0;

  // Bilan du stock au prix de gros (ouverture chaînée, entrées, sorties, écart)
  const bilan = await computeStockBalance(type, startDate, endDate);

  // Contrôle de cohérence : le montant de l'inventaire doit être exactement
  // la somme des lignes du tableau de détail (au prix de gros)
  const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
  if (Math.abs(itemsTotal - bilan.montantInventaire) > 1) {
    console.error(`INVENTAIRE INCOHÉRENT: montantInventaire=${bilan.montantInventaire}, somme items=${itemsTotal}`);
  }

  // Upsert l'inventaire
  const inventory = await Inventory.findOneAndUpdate(
    { date, type, period },
    {
      date,
      type,
      period,
      items,
      totalSales,
      totalProductsSold,
      stockValueWholesale,
      stockValueRetail,
      lowStockProducts,
      stockRotation,
      ...bilan,
      createdBy: userId
    },
    { upsert: true, new: true }
  );

  return inventory;
};

/**
 * Recalcule tous les inventaires d'un type, du plus ancien au plus récent.
 * Chaque document est régénéré (lignes au prix de gros + bilan), l'ouverture
 * de chacun reprenant la clôture recalculée du précédent.
 */
const rebuildInventoryChain = async (type, userId) => {
  const inventories = await Inventory.find({ type }).sort({ date: 1 });
  for (const inventory of inventories) {
    await upsertInventory(type, inventory.createdBy || userId, inventory.date);
  }
};

/**
 * Obtenir tous les inventaires
 */
const getInventories = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    const query = {};

    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const inventories = await Inventory.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: inventories.length,
      data: inventories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir un inventaire par ID
 */
const getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('items.productId');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventaire non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un inventaire
 */
const deleteInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventaire non trouvé'
      });
    }

    await Inventory.findByIdAndDelete(req.params.id);

    // Recalculer en cascade les inventaires suivants du même type
    try {
      await rebuildInventoryChain(inventory.type, req.user.id);
    } catch (error) {
      console.error('Erreur lors du recalcul de la chaîne des inventaires:', error);
    }

    await logActivity(
      req.user.id,
      'delete_inventory',
      inventory._id,
      `${req.user.name} a supprimé l'inventaire ${inventory.period}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Inventaire supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer tous les inventaires
 */
const deleteAllInventories = async (req, res, next) => {
  try {
    const result = await Inventory.deleteMany({});

    await logActivity(
      req.user.id,
      'delete_all_inventories',
      null,
      `${req.user.name} a supprimé tous les inventaires (${result.deletedCount})`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} inventaires supprimés avec succès`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Régénérer les inventaires depuis les ventes existantes
 */
const regenerateInventories = async (req, res, next) => {
  try {
    const { types = ['daily', 'weekly', 'monthly'] } = req.body;

    const results = [];

    for (const type of types) {
      const inventory = await upsertInventory(type, req.user.id);
      results.push(inventory);
      // Recalculer en cascade tous les inventaires du type (ancien -> récent)
      await rebuildInventoryChain(type, req.user.id);
    }

    await logActivity(
      req.user.id,
      'regenerate_inventories',
      null,
      `${req.user.name} a régénéré les inventaires (${types.join(', ')})`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Inventaires régénérés avec succès',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertInventory,
  getInventories,
  getInventory,
  deleteInventory,
  deleteAllInventories,
  regenerateInventories
};
