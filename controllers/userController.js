const User = require('../models/User');
const { validationResult } = require('express-validator');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * @desc    Créer un utilisateur (admin seulement)
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires'
      });
    }

    if (!['caissier', 'gerant', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide. Seuls caissier, gérant et admin sont autorisés'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      name,
      email,
      password,
      role,
      status: 'active'
    });

    // Enregistrer l'activité de création
    await logActivity(
      req.user.id,
      'create_user',
      user._id,
      `${req.user.name} a créé l'utilisateur ${name} (${email})`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir tous les utilisateurs (admin seulement)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filtres optionnels
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Utilisateurs récupérés avec succès',
      data: {
        users,
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
 * @desc    Obtenir un utilisateur par son ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mettre à jour le rôle d'un utilisateur
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res, next) => {
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

    const { role } = req.body;

    if (!['caissier', 'gerant', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la modification du rôle du dernier administrateur
    if (user.role === 'admin' && req.user.id !== user.id.toString()) {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de modifier le rôle du dernier administrateur'
        });
      }
    }

    user.role = role;
    await user.save();

    // Enregistrer l'activité de modification de rôle
    await logActivity(
      req.user.id,
      'update_role',
      user._id,
      `${req.user.name} a modifié le rôle de ${user.name} (${user.email}) en ${role}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Rôle mis à jour avec succès',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Supprimer un utilisateur
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la suppression du dernier administrateur
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le dernier administrateur'
        });
      }
    }

    // Empêcher l'auto-suppression
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Enregistrer l'activité de suppression
    await logActivity(
      req.user.id,
      'delete_user',
      user._id,
      `${req.user.name} a supprimé l'utilisateur ${user.name} (${user.email})`,
      req.ip,
      req.get('User-Agent')
    );

    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mettre à jour le profil d'un utilisateur
 * @route   PUT /api/users/:id
 * @access  Private
 */
const updateUser = async (req, res, next) => {
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

    const { name, email } = req.body;

    // Seul l'utilisateur lui-même ou un admin peut modifier le profil
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'email est déjà utilisé (si modification)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    // Mettre à jour les champs
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Bloquer un utilisateur
 * @route   PATCH /api/users/:id/block
 * @access  Private/Admin
 */
const blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Impossible de bloquer un administrateur' });
    }
    // Enregistrer l'activité de blocage
    await logActivity(
      req.user.id,
      'block_user',
      user._id,
      `${req.user.name} a bloqué l'utilisateur ${user.name} (${user.email})`,
      req.ip,
      req.get('User-Agent')
    );

    user.status = 'blocked';
    await user.save();
    res.status(200).json({ success: true, message: 'Utilisateur bloqué' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Débloquer un utilisateur
 * @route   PATCH /api/users/:id/unblock
 * @access  Private/Admin
 */
const unblockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    // Enregistrer l'activité de déblocage
    await logActivity(
      req.user.id,
      'unblock_user',
      user._id,
      `${req.user.name} a débloqué l'utilisateur ${user.name} (${user.email})`,
      req.ip,
      req.get('User-Agent')
    );

    user.status = 'active';
    await user.save();
    res.status(200).json({ success: true, message: 'Utilisateur débloqué' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir les statistiques des utilisateurs
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
const getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const gerantUsers = await User.countDocuments({ role: 'gerant' });
    const caissierUsers = await User.countDocuments({ role: 'caissier' });

    // Utilisateurs créés ce mois
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: currentMonth }
    });

    // Utilisateurs créés les 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        adminUsers,
        gerantUsers,
        caissierUsers,
        newUsersThisMonth,
        newUsersLast30Days
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUserRole,
  deleteUser,
  updateUser,
  blockUser,
  unblockUser,
  getUserStats
};
