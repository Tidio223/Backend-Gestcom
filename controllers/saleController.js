const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { validationResult } = require('express-validator');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * @desc    Créer une nouvelle vente
 * @route   POST /api/sales
 * @access  Private
 */
const createSale = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { customer, items } = req.body;

    // Vérifier que les articles existent et ont assez de stock
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Produit ${item.productName} non trouvé`
        });
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour ${product.name}. Quantité demandée: ${item.quantity}, Stock disponible: ${product.stock}`
        });
      }
    }

    // Calculer le total
    const total = items.reduce((sum, item) => sum + item.total, 0);

    // Créer la vente
    const sale = await Sale.create({
      customer,
      items,
      total,
      createdBy: req.user.id
    });

    // Mettre à jour le stock des produits
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });

      // Enregistrer le mouvement de stock
      await StockMovement.create({
        productId: item.productId,
        productName: item.productName,
        quantity: -item.quantity,
        type: 'sortie',
        reason: 'Vente',
        referenceId: sale._id,
        referenceType: 'Sale',
        performedBy: req.user.id
      });
    }

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'create_sale',
      sale._id,
      `${req.user.name} a créé une vente pour ${customer} (${total} FCFA)`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Vente créée avec succès',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir toutes les ventes
 * @route   GET /api/sales
 * @access  Private
 */
const getSales = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = {};
    
    // Filtre par statut
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filtre par date
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('createdBy', 'name email')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Ventes récupérées avec succès',
      data: {
        sales,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir une vente par ID
 * @route   GET /api/sales/:id
 * @access  Private
 */
const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('items.productId', 'name price')
      .populate('invoiceId');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mettre à jour le statut d'une vente
 * @route   PATCH /api/sales/:id/status
 * @access  Private/Admin
 */
const updateSaleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Vente non trouvée'
      });
    }

    // Si annulation, restaurer le stock
    if (status === 'cancelled' && sale.status !== 'cancelled') {
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });

        await StockMovement.create({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          type: 'entree',
          reason: 'Annulation de vente',
          referenceId: sale._id,
          referenceType: 'Sale',
          performedBy: req.user.id
        });
      }
    }

    sale.status = status;
    await sale.save();

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'update_sale_status',
      sale._id,
      `${req.user.name} a mis à jour le statut de la vente ${sale._id} à ${status}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir les statistiques de ventes
 * @route   GET /api/sales/stats
 * @access  Private
 */
const getSalesStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await Sale.find({
      status: 'completed',
      createdAt: { $gte: today }
    });

    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthSales = await Sale.find({
      status: 'completed',
      createdAt: { $gte: monthStart }
    });

    const monthTotal = monthSales.reduce((sum, sale) => sum + sale.total, 0);

    const totalSales = await Sale.countDocuments({ status: 'completed' });
    const pendingSales = await Sale.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        todayTotal,
        todayCount: todaySales.length,
        monthTotal,
        monthCount: monthSales.length,
        totalSales,
        pendingSales,
        averageOrderValue: todaySales.length > 0 ? todayTotal / todaySales.length : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSales,
  getSale,
  updateSaleStatus,
  getSalesStats
};
