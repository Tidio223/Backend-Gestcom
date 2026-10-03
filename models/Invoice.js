const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  number: {
    type: String,
    required: [true, 'Le numéro de facture est obligatoire'],
    unique: true,
    trim: true
  },
  client: {
    type: String,
    required: [true, 'Le nom du client est obligatoire'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La quantité doit être au moins 1']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Le prix unitaire ne peut pas être négatif']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Le total ne peut pas être négatif']
    }
  }],
  total: {
    type: Number,
    required: true,
    min: [0, 'Le total ne peut pas être négatif']
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  typeVente: {
    type: String,
    enum: ['gros', 'detail'],
    default: 'detail'
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour la recherche
invoiceSchema.index({ number: 1 });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
