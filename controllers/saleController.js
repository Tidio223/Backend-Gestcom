const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Invoice = require('../models/Invoice');
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

    const { customer, items, typeVente = 'detail' } = req.body;

    // Valider le type de vente
    if (!['gros', 'detail'].includes(typeVente)) {
      return res.status(400).json({
        success: false,
        message: 'Type de vente invalide. Doit être "gros" ou "detail"'
      });
    }

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

      // Déterminer le prix à utiliser selon le type de vente
      const priceToUse = typeVente === 'gros' 
        ? (product.prixGros || product.price || 0)
        : (product.prixDetail || product.price || 0);

      if (priceToUse === 0) {
        return res.status(400).json({
          success: false,
          message: `Prix non défini pour ${product.name} pour le type de vente ${typeVente}`
        });
      }

      // Mettre à jour le prix unitaire et le total
      item.unitPrice = priceToUse;
      item.total = item.quantity * priceToUse;
    }

    // Calculer le total
    const total = items.reduce((sum, item) => sum + item.total, 0);

    // Créer la vente
    const sale = await Sale.create({
      customer,
      typeVente,
      items,
      total,
      createdBy: req.user.id
    });

    // Mettre à jour le stock des produits
    for (const item of items) {
      const product = await Product.findById(item.productId);
      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });

      // Enregistrer le mouvement de stock
      await StockMovement.create({
        product: item.productId,
        type: 'exit',
        quantity: item.quantity,
        previousStock: previousStock,
        newStock: newStock,
        reason: `Vente ${typeVente}`,
        user: req.user.id,
        reference: sale._id.toString()
      });
    }

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'create_sale',
      sale._id,
      `${req.user.name} a créé une vente ${typeVente} pour ${customer} (${total} FCFA)`,
      req.ip,
      req.get('User-Agent')
    );

    // Générer automatiquement la facture
    const currentYear = new Date().getFullYear();
    const invoiceCount = await Invoice.countDocuments({
      number: new RegExp(`^FAC-${currentYear}-`)
    });
    const invoiceNumber = `FAC-${currentYear}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const invoice = await Invoice.create({
      number: invoiceNumber,
      client: customer,
      date: sale.createdAt,
      items: sale.items,
      total: total,
      status: 'pending',
      typeVente: typeVente,
      saleId: sale._id,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Vente créée avec succès',
      data: { sale, invoice }
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

    // Filtre par type de vente
    if (req.query.typeVente) {
      query.typeVente = req.query.typeVente;
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
