const mongoose = require('mongoose');

const reportItemSchema = new mongoose.Schema({
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
  revenue: {
    type: Number,
    default: 0
  }
});

const reportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['sales', 'inventory', 'customers', 'financial'],
    required: true
  },
  period: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  summary: {
    totalSales: {
      type: Number,
      default: 0
    },
    totalProducts: {
      type: Number,
      default: 0
    },
    totalCustomers: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    topProducts: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      productName: String,
      quantitySold: Number,
      revenue: Number
    }]
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
reportSchema.index({ date: 1, type: 1, period: 1 }, { unique: true });
reportSchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('Report', reportSchema);
