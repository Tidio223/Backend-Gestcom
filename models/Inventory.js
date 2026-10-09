const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantitySold: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  stockRemaining: {
    type: Number,
    default: 0
  }
});

const inventorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  period: {
    type: String,
    required: true
  },
  items: [inventoryItemSchema],
  totalSales: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  totalProductsSold: {
    type: Number,
    default: 0
  },
  lowStockProducts: {
    type: Number,
    default: 0
  },
  stockRotation: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index composé unique pour éviter les doublons
inventorySchema.index({ date: 1, type: 1, period: 1 }, { unique: true });
inventorySchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('Inventory', inventorySchema);
