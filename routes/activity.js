const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const {
  getActivityLogs,
  createActivityLog,
  getActivityStats
} = require('../controllers/activityController');

const router = express.Router();

// Routes pour le journal d'activité
router.get('/', protect, authorize('admin'), getActivityLogs);
router.get('/stats', protect, authorize('admin'), getActivityStats);
router.post('/', protect, createActivityLog);

module.exports = router;
