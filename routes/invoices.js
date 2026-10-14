const express = require('express');
const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice
} = require('../controllers/invoiceController');
const { protect, requireSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques (authentifiées)
router.post('/', protect, createInvoice);
router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.put('/:id', protect, updateInvoice);

// Routes super admin uniquement
router.delete('/:id', protect, requireSuperAdmin, deleteInvoice);

module.exports = router;
