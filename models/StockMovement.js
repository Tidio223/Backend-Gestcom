const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Le produit est obligatoire']
  },
  type: {
    type: String,
    required: [true, 'Le type de mouvement est obligatoire'],
    enum: ['entry', 'exit', 'adjustment']
  },
  quantity: {
    type: Number,
    required: [true, 'La quantité est obligatoire'],
    min: [1, 'La quantité doit être positive']
  },
  previousStock: {
    type: Number,
    required: [true, 'Le stock précédent est obligatoire']
  },
  newStock: {
    type: Number,
    required: [true, 'Le nouveau stock est obligatoire']
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [200, 'La raison ne peut pas dépasser 200 caractères']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est obligatoire']
  },
  reference: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index pour la recherche
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ user: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
