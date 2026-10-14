const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');

/**
 * Génère le prochain numéro de facture au format FAC-AAAA-NNN.
 * Utilise un compteur atomique par année (collection "counters") qui est
 * maintenu au moins égal au plus grand numéro existant : le compteur ne
 * redescend jamais, même après suppression d'une facture.
 */
const getNextInvoiceNumber = async (year = new Date().getFullYear()) => {
  const key = `invoice-${year}`;

  // Le compteur doit rester au moins égal au plus grand numéro existant
  const invoices = await Invoice.find({ number: new RegExp(`^FAC-${year}-\\d+$`) })
    .select('number')
    .lean();
  const maxSeq = invoices.reduce((max, inv) => {
    const seq = parseInt(inv.number.split('-')[2], 10);
    return Number.isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  await Counter.updateOne({ _id: key }, { $max: { seq: maxSeq } }, { upsert: true });

  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true }
  );

  return `FAC-${year}-${String(counter.seq).padStart(3, '0')}`;
};

module.exports = { getNextInvoiceNumber };
