const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense', 'salary'],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.type === 'salary'; },
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'check', 'other'],
    default: 'cash',
  },
  reference: {
    type: String,
    trim: true,
  },
  attachments: [{
    type: String, // URLs to uploaded files
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed',
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Index pour optimiser les requêtes
financialTransactionSchema.index({ type: 1, date: -1 });
financialTransactionSchema.index({ date: -1 });
financialTransactionSchema.index({ recordedBy: 1, date: -1 });
financialTransactionSchema.index({ category: 1 });

// Méthode virtuelle pour le formatage du montant
financialTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
  }).format(this.amount);
});

// Méthode virtuelle pour le type en français
financialTransactionSchema.virtual('typeLabel').get(function() {
  const labels = {
    income: 'Entrée',
    expense: 'Dépense',
    salary: 'Salaire',
  };
  return labels[this.type] || this.type;
});

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);
