const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');
const Inventory = require('../models/Inventory');

const getWholesalePrice = (p) => p.prixGros || p.price || 0;

// Entrées qui annulent des sorties de ventes supprimées : elles ne doivent pas
// apparaître dans le bilan (la vente supprimée n'est pas comptée comme sortie,
// sa restauration n'est donc pas une entrée de stock).
const isSaleCancellationEntry = (m) =>
  /annulation de la vente|suppression de vente/i.test(m.reason || '');

/**
 * Valeur réelle du stock au prix de gros à la fin d'une période,
 * reconstruite à partir du stock actuel et de TOUS les mouvements
 * postérieurs à cette date (somme de stock x prix de gros à l'instant T).
 */
const stockValueAt = async (date, productMap) => {
  const laterMoves = await StockMovement.find({
    createdAt: { $gt: date }
  }).lean();

  const deltas = new Map();
  laterMoves.forEach((m) => {
    const pid = m.product && m.product.toString();
    if (!pid || !productMap.has(pid)) return;
    if (m.type === 'exit') deltas.set(pid, (deltas.get(pid) || 0) + m.quantity);
    else if (m.type === 'entry') deltas.set(pid, (deltas.get(pid) || 0) - m.quantity);
  });

  let total = 0;
  productMap.forEach((p, pid) => {
    total += ((p.stock || 0) + (deltas.get(pid) || 0)) * getWholesalePrice(p);
  });
  return total;
};

/**
 * Bilan du stock d'une période, valorisé au prix de gros :
 * - inventaire : sorties de la période = somme des lignes de ventes vivantes
 *   (identique au tableau "Détail des sorties", au prix de gros)
 * - entrees    : mouvements 'entry' de la période hors annulations de ventes
 * - ouverture  : clôture (montantStockActuel) de l'inventaire précédent du
 *   même type, sinon réel + inventaire - entrees (premier inventaire)
 * - actuel     : ouverture + entrees - inventaire
 * - reel/ecart : valeur réelle reconstruite en fin de période ; l'écart est
 *   affiché tel quel, jamais masqué
 */
const computeStockBalance = async (type, startDate, endDate) => {
  const products = await Product.find({}).lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // Sorties de la période : ventes vivantes valorisées au prix de gros
  const sales = await Sale.find({
    status: { $ne: 'cancelled' },
    createdAt: { $gte: startDate, $lte: endDate }
  }).lean();
  const montantInventaire = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((s, item) => {
      const p = productMap.get(item.productId?.toString());
      return s + item.quantity * (p ? getWholesalePrice(p) : (item.unitPrice || 0));
    }, 0),
    0
  );

  // Entrées de stock de la période (réapprovisionnement), hors annulations
  const entryMoves = await StockMovement.find({
    type: 'entry',
    createdAt: { $gte: startDate, $lte: endDate }
  }).lean();
  const montantEntrees = entryMoves.reduce((sum, m) => {
    if (isSaleCancellationEntry(m)) return sum;
    const p = productMap.get(m.product && m.product.toString());
    return sum + (p ? m.quantity * getWholesalePrice(p) : 0);
  }, 0);

  // Valeur réelle du stock en fin de période
  const montantStockReel = await stockValueAt(endDate, productMap);

  // Ouverture : clôture du précédent inventaire du même type, sinon reconstruction
  let montantOuverture = null;
  if (type) {
    const prev = await Inventory.findOne({ type, date: { $lt: startDate } })
      .sort({ date: -1 })
      .lean();
    if (prev && prev.montantStockActuel != null) {
      montantOuverture = prev.montantStockActuel;
    }
  }
  if (montantOuverture == null) {
    montantOuverture = montantStockReel + montantInventaire - montantEntrees;
  }

  const montantStockActuel = montantOuverture + montantEntrees - montantInventaire;
  const ecartStock = montantStockReel - montantStockActuel;

  return {
    montantOuverture,
    montantEntrees,
    montantInventaire,
    montantStockActuel,
    montantStockReel,
    ecartStock
  };
};

module.exports = { computeStockBalance, stockValueAt };
