const express = require('express');
const {
  getInventories,
  getInventory,
  deleteInventory,
  deleteAllInventories,
  regenerateInventories
} = require('../controllers/inventoryController');
const { protect, authorize, requireSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques (authentifiées)
router.get('/', protect, getInventories);
router.get('/:id', protect, getInventory);
router.post('/regenerate', protect, authorize('admin', 'superadmin'), regenerateInventories);

// Routes super admin uniquement pour la suppression
router.delete('/:id', protect, requireSuperAdmin, deleteInventory);
router.delete('/', protect, requireSuperAdmin, deleteAllInventories);

module.exports = router;
