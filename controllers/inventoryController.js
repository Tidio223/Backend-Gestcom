const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { logActivity } = require('../middlewares/activityLogger');

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
const getPeriodDates = (type) => {
  const now = getBamakoDate();
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
const upsertInventory = async (type, userId) => {
  const { startDate, endDate, period } = getPeriodDates(type);
  const date = new Date(startDate);

  // Récupérer les ventes de la période (toutes les ventes valides, pas annulées)
  const sales = await Sale.find({
    status: { $ne: 'cancelled' },
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('items.productId');

  // Calculer les données de l'inventaire
  const productMap = new Map();
  let totalSales = 0;
  let totalValue = 0;
  let totalProductsSold = 0;

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const existing = productMap.get(item.productId._id.toString());
      const quantity = item.quantity;
      const total = item.total;

      if (existing) {
        existing.quantitySold += quantity;
        existing.total += total;
      } else {
        productMap.set(item.productId._id.toString(), {
          productId: item.productId._id,
          productName: item.productName,
          quantitySold: quantity,
          unitPrice: item.unitPrice,
          total: total,
          stockRemaining: item.productId.stock || 0
        });
      }

      totalSales += total;
      totalProductsSold += quantity;
    });
  });

  const items = Array.from(productMap.values());
  totalValue = items.reduce((sum, item) => sum + (item.stockRemaining * item.unitPrice), 0);

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

  // Upsert l'inventaire
  const inventory = await Inventory.findOneAndUpdate(
    { date, type, period },
    {
      date,
      type,
      period,
      items,
      totalSales,
      totalValue,
      totalProductsSold,
      lowStockProducts,
      stockRotation,
      createdBy: userId
    },
    { upsert: true, new: true }
  );

  return inventory;
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
