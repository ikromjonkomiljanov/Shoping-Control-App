// routes/logs.js — Loglar, Hisobotlar, Arxiv
const express  = require('express');
const router   = express.Router();
const { Op, fn, col, literal } = require('sequelize');

const { Log, Archive, Inventory, Product } = require('../models');
const { requireAdmin, requireWorker }      = require('../middleware/auth');

// ── GET /api/logs ────────────────────────────────────────────
router.get('/', requireWorker, async (req, res) => {
  try {
    const { type, productId, from, to, limit = 100 } = req.query;
    const where = {};
    if (type)      where.type      = type;
    if (productId) where.productId = productId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to)   where.createdAt[Op.lte] = new Date(to + 'T23:59:59Z');
    }
    const logs = await Log.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit), 500)
    });
    res.json({ ok: true, data: logs });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── PUT /api/logs/:id ────────────────────────────────────────
// Sotuv logini tahrirlash
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const log = await Log.findByPk(req.params.id);
    if (!log) return res.status(404).json({ ok: false, msg: 'Log topilmadi.' });
    if (log.type !== 'sale') return res.status(400).json({ ok: false, msg: 'Faqat sotuv loglari tahrirlanadi.' });

    const newQty   = parseInt(req.body.qty);
    const newPrice = parseFloat(req.body.pricePerUnit) || 0;
    const diff     = newQty - log.quantity;

    // Do'kon inventarini moslashtir
    const shopInv = await Inventory.findOne({ where: { productId: log.productId, location: 'shop' } });
    const shopQty = shopInv?.quantity || 0;
    if (shopQty - diff < 0) return res.status(400).json({ ok: false, msg: "Do'konda yetarli mahsulot yo'q." });

    if (shopInv) await shopInv.update({ quantity: shopQty - diff });

    await log.update({
      quantity:     newQty,
      pricePerUnit: newPrice,
      totalPrice:   newQty * newPrice,
      note:         req.body.note?.trim() ?? log.note,
      editedAt:     new Date()
    });
    res.json({ ok: true, data: log });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── DELETE /api/logs/:id ─────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const log = await Log.findByPk(req.params.id);
    if (!log) return res.status(404).json({ ok: false, msg: 'Log topilmadi.' });
    if (log.type !== 'sale') return res.status(400).json({ ok: false, msg: "Faqat sotuv loglari o'chiriladi." });

    // Inventarni qayta tiklash
    const shopInv = await Inventory.findOne({ where: { productId: log.productId, location: 'shop' } });
    if (shopInv) await shopInv.update({ quantity: shopInv.quantity + log.quantity });

    await log.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── GET /api/logs/reports/summary ───────────────────────────
router.get('/reports/summary', requireAdmin, async (req, res) => {
  try {
    const logs  = await Log.findAll();
    const today = new Date().toDateString();

    // Helper: tur bo'yicha yig'indi
    function sum(type)      { return logs.filter(l => l.type === type).reduce((s, l) => s + l.quantity, 0); }
    function sumToday(type) { return logs.filter(l => l.type === type && new Date(l.createdAt).toDateString() === today).reduce((s,l) => s+l.quantity, 0); }
    const revenue      = logs.filter(l => l.type === 'sale').reduce((s,l) => s + parseFloat(l.totalPrice||0), 0);
    const todayRevenue = logs.filter(l => l.type === 'sale' && new Date(l.createdAt).toDateString() === today).reduce((s,l) => s + parseFloat(l.totalPrice||0), 0);

    const salesByProduct = {};
    const prodByProduct  = {};
    const monthly        = {};

    logs.filter(l => l.type === 'sale').forEach(l => {
      if (!salesByProduct[l.productName]) salesByProduct[l.productName] = { qty: 0, revenue: 0 };
      salesByProduct[l.productName].qty     += l.quantity;
      salesByProduct[l.productName].revenue += parseFloat(l.totalPrice || 0);
      const m = l.createdAt.toISOString().slice(0, 7);
      if (!monthly[m]) monthly[m] = { qty: 0, revenue: 0 };
      monthly[m].qty     += l.quantity;
      monthly[m].revenue += parseFloat(l.totalPrice || 0);
    });
    logs.filter(l => l.type === 'production').forEach(l => {
      prodByProduct[l.productName] = (prodByProduct[l.productName] || 0) + l.quantity;
    });

    res.json({ ok: true, data: {
      totalProduced:    sum('production'),
      totalTransferred: sum('transfer'),
      totalSold:        sum('sale'),
      totalRevenue:     revenue,
      todaySold:        sumToday('sale'),
      todayProduced:    sumToday('production'),
      todayRevenue,
      salesByProduct,
      prodByProduct,
      monthly
    }});
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── GET /api/logs/archive ────────────────────────────────────
router.get('/archive', requireAdmin, async (req, res) => {
  try {
    const archives = await Archive.findAll({ order: [['monthKey', 'DESC']] });
    res.json({ ok: true, data: archives });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── POST /api/logs/archive ───────────────────────────────────
router.post('/archive', requireAdmin, async (req, res) => {
  try {
    const { monthKey } = req.body; // "2024-03"
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ ok: false, msg: 'monthKey noto\'g\'ri format (YYYY-MM).' });
    }

    const exists = await Archive.findOne({ where: { monthKey } });
    if (exists) return res.status(400).json({ ok: false, msg: 'Bu oy allaqachon arxivlangan.' });

    // Bu oydagi loglarni ol
    const start = new Date(monthKey + '-01T00:00:00Z');
    const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const monthLogs = await Log.findAll({ where: { createdAt: { [Op.between]: [start, end] } } });

    if (monthLogs.length === 0) return res.status(400).json({ ok: false, msg: 'Bu oyda hech qanday yozuv topilmadi.' });

    // Inventar snapshot
    const products = await Product.findAll();
    const wsSnap = {}, shopSnap = {};
    await Promise.all(products.map(async (p) => {
      const ws   = await Inventory.findOne({ where: { productId: p.id, location: 'workshop' } });
      const shop = await Inventory.findOne({ where: { productId: p.id, location: 'shop' } });
      wsSnap[p.id]   = ws?.quantity   || 0;
      shopSnap[p.id] = shop?.quantity || 0;
    }));

    // Summary hisoblash
    const sl = monthLogs.filter(l => l.type === 'sale');
    const pl = monthLogs.filter(l => l.type === 'production');
    const tl = monthLogs.filter(l => l.type === 'transfer');
    const salesByProduct = {};
    sl.forEach(l => {
      if (!salesByProduct[l.productId]) salesByProduct[l.productId] = { name: l.productName, qty: 0, revenue: 0 };
      salesByProduct[l.productId].qty     += l.quantity;
      salesByProduct[l.productId].revenue += parseFloat(l.totalPrice || 0);
    });

    const monthNames = ['','Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
    const parts = monthKey.split('-');
    const label = monthNames[parseInt(parts[1])] + ' ' + parts[0];

    const archive = await Archive.create({
      monthKey, label,
      summary: {
        totalSold:        sl.reduce((s,l) => s + l.quantity, 0),
        totalRevenue:     sl.reduce((s,l) => s + parseFloat(l.totalPrice||0), 0),
        totalProduced:    pl.reduce((s,l) => s + l.quantity, 0),
        totalTransferred: tl.reduce((s,l) => s + l.quantity, 0),
        salesByProduct
      },
      snapshots: { wsInventory: wsSnap, shopInventory: shopSnap },
      logs: monthLogs.map(l => l.toJSON())
    });

    // Bu oydagi loglarni o'chir
    await Log.destroy({ where: { createdAt: { [Op.between]: [start, end] } } });

    res.status(201).json({ ok: true, data: archive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── DELETE /api/logs/archive/:id ────────────────────────────
router.delete('/archive/:id', requireAdmin, async (req, res) => {
  try {
    const archive = await Archive.findByPk(req.params.id);
    if (!archive) return res.status(404).json({ ok: false, msg: 'Topilmadi.' });
    await archive.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

module.exports = router;
