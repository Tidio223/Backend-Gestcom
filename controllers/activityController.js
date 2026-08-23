const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Obtenir le journal d'activité
 * @route   GET /api/activity
 * @access  Private/Admin
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;

    // Construire la requête
    const query = {};
    
    // Filtrer par utilisateur si spécifié
    if (req.query.userId) {
      query.user = req.query.userId;
    }

    // Filtrer par action si spécifié
    if (req.query.action) {
      query.action = req.query.action;
    }

    // Filtrer par date si spécifié
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Exécuter la requête avec pagination
    const logs = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Compter le total pour la pagination
    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        logs,
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
 * @desc    Créer une entrée dans le journal d'activité
 * @route   POST /api/activity
 * @access  Private
 */
const createActivityLog = async (req, res, next) => {
  try {
    const { user, action, targetUser, description, ipAddress, userAgent } = req.body;

    const log = await ActivityLog.create({
      user,
      action,
      targetUser,
      description,
      ipAddress,
      userAgent
    });

    // Peupler les données pour la réponse
    await log.populate('user', 'name email role');
    if (targetUser) {
      await log.populate('targetUser', 'name email role');
    }

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir les statistiques d'activité
 * @route   GET /api/activity/stats
 * @access  Private/Admin
 */
const getActivityStats = async (req, res, next) => {
  try {
    const stats = await ActivityLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Activité des 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        actionStats: stats,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLogs,
  createActivityLog,
  getActivityStats
};
