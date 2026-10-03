const express = require('express');
const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques (authentifiées)
router.post('/', protect, createInvoice);
router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.put('/:id', protect, updateInvoice);

// Routes admin uniquement
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteInvoice);

module.exports = router;
