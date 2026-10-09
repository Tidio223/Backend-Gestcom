const express = require('express');
const router = express.Router();
const {
  createStockMovement,
  getStockMovements,
  getProductMovements
} = require('../controllers/stockMovementController');
const { protect } = require('../middlewares/auth');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Créer un mouvement de stock
router.post('/', createStockMovement);

// Obtenir tous les mouvements de stock (optionnellement filtrés par produit)
router.get('/', getStockMovements);

// Obtenir les mouvements d'un produit spécifique
router.get('/product/:productId', getProductMovements);

module.exports = router;
