const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * @desc    Créer un mouvement de stock (entrée/sortie)
 * @route   POST /api/stock/movements
 * @access  Private (gerant, admin)
 */
const createStockMovement = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason, reference } = req.body;

    // Validation
    if (!productId || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Le produit, le type et la quantité sont obligatoires'
      });
    }

    if (!['entry', 'exit', 'adjustment'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Le type doit être entry, exit ou adjustment'
      });
    }

    // Récupérer le produit
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Calculer le nouveau stock
    const previousStock = product.stock;
    let newStock;

    if (type === 'entry') {
      newStock = previousStock + quantity;
    } else if (type === 'exit') {
      if (previousStock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuffisant pour cette sortie'
        });
      }
      newStock = previousStock - quantity;
    } else {
      // adjustment - la quantité peut être positive ou négative
      newStock = quantity;
    }

    // Créer le mouvement de stock
    const movement = await StockMovement.create({
      product: productId,
      type,
      quantity: type === 'adjustment' ? Math.abs(newStock - previousStock) : quantity,
      previousStock,
      newStock,
      reason,
      reference,
      user: req.user.id
    });

    // Mettre à jour le stock du produit
    product.stock = newStock;
    await product.save();

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      type === 'entry' ? 'stock_entry' : type === 'exit' ? 'stock_exit' : 'stock_adjustment',
      productId,
      `${req.user.name} a effectué une ${type === 'entry' ? 'entrée' : type === 'exit' ? 'sortie' : 'ajustement'} de stock pour ${product.name} (${quantity} unités)`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Mouvement de stock enregistré avec succès',
      data: {
        movement: await movement.populate('product user'),
        product
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Récupérer tous les mouvements de stock
 * @route   GET /api/stock/movements
 * @access  Private (gerant, admin)
 */
const getStockMovements = async (req, res, next) => {
  try {
    const { productId, type, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Construire le filtre
    const filter = {};
    if (productId) filter.product = productId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Récupérer les mouvements
    const movements = await StockMovement.find(filter)
      .populate('product', 'name category barcode')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await StockMovement.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        movements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
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
 * @desc    Récupérer les mouvements d'un produit spécifique
 * @route   GET /api/stock/movements/product/:productId
 * @access  Private (gerant, admin)
 */
const getProductMovements = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 50 } = req.query;

    const movements = await StockMovement.find({ product: productId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Récupérer les statistiques de stock
 * @route   GET /api/stock/stats
 * @access  Private (gerant, admin)
 */
const getStockStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await StockMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$minStock'] }
    });

    const totalProducts = await Product.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        todayMovements: stats,
        lowStockProducts,
        totalProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStockMovement,
  getStockMovements,
  getProductMovements,
  getStockStats
};
