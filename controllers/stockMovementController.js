const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const { protect } = require('../middlewares/auth');

/**
 * Créer un mouvement de stock
 */
const createStockMovement = async (req, res, next) => {
  try {
    const { productId, type, quantity, reason } = req.body;
    const userId = req.user.id;

    // Vérifier que le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    // Calculer le nouveau stock selon le type de mouvement
    if (type === 'entry') {
      newStock = previousStock + quantity;
    } else if (type === 'exit') {
      newStock = previousStock - quantity;
      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuffisant pour cette sortie'
        });
      }
    } else if (type === 'adjustment') {
      newStock = quantity; // Pour ajustement, quantity est le nouveau stock cible
    }

    // Créer le mouvement de stock
    const movement = await StockMovement.create({
      product: productId,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      user: userId
    });

    // Mettre à jour le stock du produit
    product.stock = newStock;
    await product.save();

    res.status(201).json({
      success: true,
      data: movement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir tous les mouvements de stock
 */
const getStockMovements = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const query = {};

    if (productId) {
      query.product = productId;
    }

    const movements = await StockMovement.find(query)
      .populate('product', 'name')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les mouvements d'un produit
 */
const getProductMovements = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const movements = await StockMovement.find({ product: productId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStockMovement,
  getStockMovements,
  getProductMovements
};
