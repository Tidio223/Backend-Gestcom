const express = require('express');
const {
  getReports,
  getReport,
  deleteReport,
  deleteAllReports,
  regenerateReports
} = require('../controllers/reportController');
const { protect, authorize, requireSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques (authentifiées)
router.get('/', protect, getReports);
router.get('/:id', protect, getReport);
router.post('/regenerate', protect, authorize('admin', 'superadmin'), regenerateReports);

// Routes super admin uniquement pour la suppression
router.delete('/:id', protect, requireSuperAdmin, deleteReport);
router.delete('/', protect, requireSuperAdmin, deleteAllReports);

module.exports = router;
