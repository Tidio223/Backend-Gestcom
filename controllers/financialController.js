const FinancialTransaction = require('../models/FinancialTransaction');
const { validationResult } = require('express-validator');

/**
 * @desc    Créer une transaction financière
 * @route   POST /api/financial/transactions
 * @access  Private/Admin
 */
const createTransaction = async (req, res, next) => {
  try {
    // Validation des entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { type, amount, description, category, date, paymentMethod, reference, tags, recipient } = req.body;

    // Créer la transaction
    const transaction = await FinancialTransaction.create({
      type,
      amount,
      description,
      category,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'cash',
      reference,
      tags: tags || [],
      recordedBy: req.user.id,
      recipient: type === 'salary' ? recipient : undefined,
    });

    // Peupler les données pour la réponse
    await transaction.populate('recordedBy', 'name email');
    if (transaction.recipient) {
      await transaction.populate('recipient', 'name email');
    }

    res.status(201).json({
      success: true,
      message: 'Transaction créée avec succès',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir toutes les transactions financières
 * @route   GET /api/financial/transactions
 * @access  Private/Admin
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      category,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Construire la requête
    const query = {};
    
    // Filtrer par type
    if (type) {
      query.type = type;
    }
    
    // Filtrer par catégorie
    if (category) {
      query.category = new RegExp(category, 'i');
    }
    
    // Filtrer par date
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    // Recherche textuelle
    if (search) {
      query.$or = [
        { description: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { reference: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Configuration du tri
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const startIndex = (page - 1) * limit;

    // Exécuter la requête
    const transactions = await FinancialTransaction.find(query)
      .populate('recordedBy', 'name email')
      .populate('recipient', 'name email')
      .sort(sort)
      .skip(startIndex)
      .limit(parseInt(limit));

    // Compter le total pour la pagination
    const total = await FinancialTransaction.countDocuments(query);

    // Calculer les statistiques
    const stats = await FinancialTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      income: stats.find(s => s._id === 'income')?.total || 0,
      expense: stats.find(s => s._id === 'expense')?.total || 0,
      salary: stats.find(s => s._id === 'salary')?.total || 0,
      balance: 0
    };
    formattedStats.balance = formattedStats.income - formattedStats.expense - formattedStats.salary;

    res.status(200).json({
      success: true,
      data: {
        transactions,
        stats: formattedStats,
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
 * @desc    Obtenir une transaction par ID
 * @route   GET /api/financial/transactions/:id
 * @access  Private/Admin
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id)
      .populate('recordedBy', 'name email')
      .populate('recipient', 'name email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mettre à jour une transaction
 * @route   PUT /api/financial/transactions/:id
 * @access  Private/Admin
 */
const updateTransaction = async (req, res, next) => {
  try {
    // Validation des entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const transaction = await FinancialTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    // Mettre à jour les champs
    const { type, amount, description, category, date, paymentMethod, reference, tags, status, recipient } = req.body;
    
    if (type) transaction.type = type;
    if (amount !== undefined) transaction.amount = amount;
    if (description) transaction.description = description;
    if (category) transaction.category = category;
    if (date) transaction.date = date;
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (reference !== undefined) transaction.reference = reference;
    if (tags) transaction.tags = tags;
    if (status) transaction.status = status;
    if (recipient !== undefined && transaction.type === 'salary') transaction.recipient = recipient;

    await transaction.save();
    await transaction.populate('recordedBy', 'name email');
    if (transaction.recipient) {
      await transaction.populate('recipient', 'name email');
    }

    res.status(200).json({
      success: true,
      message: 'Transaction mise à jour avec succès',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Supprimer une transaction
 * @route   DELETE /api/financial/transactions/:id
 * @access  Private/Admin
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    await FinancialTransaction.deleteOne({ _id: transaction._id });

    res.status(200).json({
      success: true,
      message: 'Transaction supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir les statistiques financières
 * @route   GET /api/financial/stats
 * @access  Private/Admin
 */
const getFinancialStats = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    // Définir la date de début
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const stats = await FinancialTransaction.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const formattedStats = {
      income: stats.find(s => s._id === 'income') || { total: 0, count: 0, avgAmount: 0 },
      expense: stats.find(s => s._id === 'expense') || { total: 0, count: 0, avgAmount: 0 },
      salary: stats.find(s => s._id === 'salary') || { total: 0, count: 0, avgAmount: 0 },
    };

    formattedStats.balance = formattedStats.income.total - formattedStats.expense.total - formattedStats.salary.total;
    formattedStats.total = formattedStats.income.total + formattedStats.expense.total + formattedStats.salary.total;

    // Obtenir les tendances mensuelles
    const monthlyTrends = await FinancialTransaction.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.type': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: formattedStats,
        trends: monthlyTrends,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getFinancialStats
};
