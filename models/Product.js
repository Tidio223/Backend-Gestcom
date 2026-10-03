const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du produit est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  category: {
    type: String,
    required: [true, 'La catégorie est obligatoire'],
    trim: true,
    enum: ['électronique', 'alimentation', 'vêtements', 'maison', 'autres']
  },
  // Prix de gros (obligatoire pour les nouveaux produits)
  prixGros: {
    type: Number,
    required: false,
    min: [0, 'Le prix de gros ne peut pas être négatif'],
    default: 0
  },
  // Prix de détail (obligatoire pour les nouveaux produits)
  prixDetail: {
    type: Number,
    required: false,
    min: [0, 'Le prix de détail ne peut pas être négatif'],
    default: 0
  },
  // Ancien champ price gardé pour compatibilité
  price: {
    type: Number,
    required: false,
    min: [0, 'Le prix ne peut pas être négatif']
  },
  stock: {
    type: Number,
    required: [true, 'Le stock est obligatoire'],
    min: [0, 'Le stock ne peut pas être négatif'],
    default: 0
  },
  unit: {
    type: String,
    required: false,
    trim: true,
    default: 'unité'
  },
  minStock: {
    type: Number,
    required: [true, 'Le stock minimum est obligatoire'],
    min: [0, 'Le stock minimum ne peut pas être négatif'],
    default: 10
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  supplier: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index pour la recherche
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

module.exports = mongoose.model('Product', productSchema);
