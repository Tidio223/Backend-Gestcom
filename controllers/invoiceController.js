const Invoice = require('../models/Invoice');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * @desc    Créer une facture
 * @route   POST /api/invoices
 * @access  Private
 */
const createInvoice = async (req, res, next) => {
  try {
    const { number, client, items, total, status, typeVente, saleId } = req.body;

    // Validation
    if (!number || !client || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Numéro, client et articles sont obligatoires'
      });
    }

    // Vérifier si le numéro de facture existe déjà
    const existingInvoice = await Invoice.findOne({ number });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de facture existe déjà'
      });
    }

    // Créer la facture
    const invoice = await Invoice.create({
      number,
      client,
      items,
      total,
      status: status || 'pending',
      typeVente: typeVente || 'detail',
      saleId,
      createdBy: req.user.id
    });

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'create_invoice',
      invoice._id,
      `${req.user.name} a créé la facture ${number} pour ${client}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Facture créée avec succès',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir toutes les factures
 * @route   GET /api/invoices
 * @access  Private
 */
const getInvoices = async (req, res, next) => {
  try {
    const { status, typeVente, client } = req.query;
    const query = {};

    if (status) query.status = status;
    if (typeVente) query.typeVente = typeVente;
    if (client) query.client = { $regex: client, $options: 'i' };

    const invoices = await Invoice.find(query)
      .populate('createdBy', 'name email')
      .populate('saleId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtenir une facture par ID
 * @route   GET /api/invoices/:id
 * @access  Private
 */
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('saleId')
      .populate('items.productId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mettre à jour une facture
 * @route   PUT /api/invoices/:id
 * @access  Private
 */
const updateInvoice = async (req, res, next) => {
  try {
    const { status, client } = req.body;

    let invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    // Mettre à jour les champs
    if (status) invoice.status = status;
    if (client) invoice.client = client;

    await invoice.save();

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'update_invoice',
      invoice._id,
      `${req.user.name} a mis à jour la facture ${invoice.number}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Facture mise à jour avec succès',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Supprimer une facture
 * @route   DELETE /api/invoices/:id
 * @access  Private/Admin
 */
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    // Enregistrer l'activité
    await logActivity(
      req.user.id,
      'delete_invoice',
      invoice._id,
      `${req.user.name} a supprimé la facture ${invoice.number}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Facture supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice
};
