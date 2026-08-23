const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * @desc    Créer un produit
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, category, price, stock, minStock, description, barcode, supplier } = req.body;

    // Validation
    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Nom, catégorie et prix sont obligatoires'
      });
    }

    // Vérifier si le code-barres existe déjà
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ce code-barres est déjà utilisé'
        });
      }
    }

    // Créer le produit
    const product = await Product.create({
      name,
      category,
      price,
      stock: stock || 0,
      minStock: minStock || 10,
      description,
      barcode,
      supplier,
      status: 'active'
    });

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'create_product',
      product._id,
      `${req.user.name} a créé le produit ${name}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir tous les produits
 * @route   GET /api/products
 * @access  Private
 */
const getProducts = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filtres optionnels
    const query = {};
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { barcode: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Produits récupérés avec succès',
      data: {
        products,
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
 * @desc    Obtenir un produit par son ID
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mettre à jour un produit
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res, next) => {
  try {
    const { name, category, price, stock, minStock, description, barcode, supplier, status } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier si le code-barres existe déjà (si modifié)
    if (barcode && barcode !== product.barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ce code-barres est déjà utilisé'
        });
      }
    }

    // Mettre à jour les champs
    if (name) product.name = name;
    if (category) product.category = category;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (minStock !== undefined) product.minStock = minStock;
    if (description !== undefined) product.description = description;
    if (barcode !== undefined) product.barcode = barcode;
    if (supplier !== undefined) product.supplier = supplier;
    if (status) product.status = status;

    await product.save();

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'update_product',
      product._id,
      `${req.user.name} a modifié le produit ${product.name}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Supprimer un produit
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'delete_product',
      product._id,
      `${req.user.name} a supprimé le produit ${product.name}`,
      req.ip,
      req.get('User-Agent')
    );

    await Product.deleteOne({ _id: product._id });

    res.status(200).json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir les statistiques des produits
 * @route   GET /api/products/stats
 * @access  Private/Admin
 */
const getProductStats = async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const lowStockProducts = await Product.countDocuments({ 
      $expr: { $lte: ['$stock', '$minStock'] } 
    });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    // Valeur totale du stock
    const products = await Product.find({ status: 'active' });
    const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats
};
