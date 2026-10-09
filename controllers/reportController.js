const Report = require('../models/Report');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * Helper pour obtenir la date en fuseau Africa/Bamako (UTC+0)
 */
const getBamakoDate = () => {
  const now = new Date();
  return new Date(now.toISOString().split('T')[0]);
};

/**
 * Helper pour obtenir les dates de période
 */
const getPeriodDates = (period) => {
  const now = getBamakoDate();
  let startDate, endDate, periodLabel;

  switch (period) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Aujourd'hui";
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Cette semaine";
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Ce mois";
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = "Cette année";
      break;
    default:
      startDate = new Date(now);
      endDate = new Date(now);
      periodLabel = "Période";
  }

  return { startDate, endDate, periodLabel };
};

/**
 * Upsert un rapport (créer ou mettre à jour)
 */
const upsertReport = async (type, period, userId) => {
  const { startDate, endDate, periodLabel } = getPeriodDates(period);
  const date = new Date(startDate);

  // Récupérer les ventes de la période (toutes les ventes valides, pas annulées)
  const sales = await Sale.find({
    status: { $ne: 'cancelled' },
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('items.productId');

  let data = [];
  let summary = {
    totalSales: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    topProducts: []
  };

  switch (type) {
    case 'sales':
      data = sales.map(sale => ({
        date: new Date(sale.createdAt).toLocaleDateString('fr-FR'),
        product: sale.items.map(item => item.productName).join(', '),
        quantity: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        amount: sale.total,
        customer: sale.customer
      }));

      summary.totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      summary.totalProducts = sales.reduce((sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);
      summary.totalCustomers = sales.length;
      summary.averageOrderValue = sales.length > 0 ? summary.totalRevenue / sales.length : 0;

      // Top produits
      const productSales = new Map();
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productSales.get(item.productId._id.toString());
          if (existing) {
            existing.quantitySold += item.quantity;
            existing.revenue += item.total;
          } else {
            productSales.set(item.productId._id.toString(), {
              productId: item.productId._id,
              productName: item.productName,
              quantitySold: item.quantity,
              revenue: item.total
            });
          }
        });
      });
      summary.topProducts = Array.from(productSales.values())
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 10);
      break;

    case 'inventory':
      const products = await Product.find();
      data = products.map(p => ({
        product: p.name,
        stock: p.stock,
        reserved: 0,
        available: p.stock,
        status: p.stock <= p.minStock ? "Stock faible" : "En stock"
      }));

      summary.totalProducts = products.length;
      summary.totalStock = products.reduce((sum, p) => sum + p.stock, 0);
      summary.totalReserved = 0;
      summary.totalAvailable = summary.totalStock;
      break;

    case 'customers':
      // Grouper par client
      const customerMap = new Map();
      sales.forEach(sale => {
        const existing = customerMap.get(sale.customer);
        if (existing) {
          existing.orders += 1;
          existing.totalSpent += sale.total;
        } else {
          customerMap.set(sale.customer, {
            name: sale.customer,
            orders: 1,
            totalSpent: sale.total
          });
        }
      });

      data = Array.from(customerMap.values());
      summary.totalCustomers = data.length;
      summary.totalOrders = sales.length;
      summary.totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      summary.averageOrders = data.length > 0 ? summary.totalOrders / data.length : 0;
      break;

    case 'financial':
      data = sales.map(sale => ({
        date: new Date(sale.createdAt).toLocaleDateString('fr-FR'),
        type: 'Vente',
        amount: sale.total,
        description: `Vente à ${sale.customer}`
      }));

      summary.totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      summary.totalSales = sales.length;
      break;
  }

  const title = `Rapport ${type === 'sales' ? 'de Ventes' : type === 'inventory' ? 'd\'Inventaire' : type === 'customers' ? 'Clients' : 'Financier'} - ${periodLabel}`;

  // Upsert le rapport
  const report = await Report.findOneAndUpdate(
    { date, type, period },
    {
      date,
      type,
      period,
      title,
      startDate,
      endDate,
      data,
      summary,
      createdBy: userId
    },
    { upsert: true, new: true }
  );

  return report;
};

/**
 * Obtenir tous les rapports
 */
const getReports = async (req, res, next) => {
  try {
    const { type, period, startDate, endDate } = req.query;
    const query = {};

    if (type) query.type = type;
    if (period) query.period = period;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const reports = await Report.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir un rapport par ID
 */
const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('summary.topProducts.productId');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un rapport
 */
const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    await logActivity(
      req.user.id,
      'delete_report',
      report._id,
      `${req.user.name} a supprimé le rapport ${report.title}`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Rapport supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer tous les rapports
 */
const deleteAllReports = async (req, res, next) => {
  try {
    const result = await Report.deleteMany({});

    await logActivity(
      req.user.id,
      'delete_all_reports',
      null,
      `${req.user.name} a supprimé tous les rapports (${result.deletedCount})`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} rapports supprimés avec succès`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Régénérer les rapports depuis les ventes existantes
 */
const regenerateReports = async (req, res, next) => {
  try {
    const { types = ['sales', 'inventory', 'customers'], period = 'month' } = req.body;

    const results = [];

    for (const type of types) {
      const report = await upsertReport(type, period, req.user.id);
      results.push(report);
    }

    await logActivity(
      req.user.id,
      'regenerate_reports',
      null,
      `${req.user.name} a régénéré les rapports (${types.join(', ')})`,
      req.ip,
      req.get('User-Agent')
    );

    res.status(200).json({
      success: true,
      message: 'Rapports régénérés avec succès',
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertReport,
  getReports,
  getReport,
  deleteReport,
  deleteAllReports,
  regenerateReports
};
