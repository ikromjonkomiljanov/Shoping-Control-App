// routes/inventory.js — Inventar, Transfer, Sotuv
const express = require('express');
const router  = express.Router();

const { Product, Inventory, Log } = require('../models');
const { requireAdmin, requireWorker } = require('../middleware/auth');

// Materiallar ro'yxati (storage.js dagi DEFAULT_MATERIALS)
const MATERIALS = [
  { id: 'mat-1', name: 'Mato',           icon: '🧵', unit: 'metr' },
  { id: 'mat-2', name: 'Ip',             icon: '🪡', unit: 'dona' },
  { id: 'mat-3', name: 'Ichki gazlama',  icon: '🧶', unit: 'metr' },
  { id: 'mat-4', name: 'Tashqi gazlama', icon: '🪢', unit: 'metr' },
];

// ── GET /api/inventory/workshop ──────────────────────────────
router.get('/workshop', requireWorker, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['name', 'ASC']] });
    const items = await Promise.all(products.map(async (p) => {
      const inv = await Inventory.findOne({ where: { productId: p.id, location: 'workshop' } });
      return { productId: p.id, name: p.name, icon: p.icon, unit: p.unit, quantity: inv?.quantity || 0 };
    }));
    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── GET /api/inventory/shop ──────────────────────────────────
router.get('/shop', requireWorker, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['name', 'ASC']] });
    const items = await Promise.all(products.map(async (p) => {
      const inv = await Inventory.findOne({ where: { productId: p.id, location: 'shop' } });
      return { productId: p.id, name: p.name, icon: p.icon, unit: p.unit, quantity: inv?.quantity || 0 };
    }));
    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── GET /api/inventory/materials ────────────────────────────
router.get('/materials', requireWorker, async (req, res) => {
  try {
    const items = await Promise.all(MATERIALS.map(async (m) => {
      const inv = await Inventory.findOne({ where: { productId: m.id, location: 'material' } });
      return { ...m, quantity: inv?.quantity || 0 };
    }));
    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── PUT /api/inventory/adjust ────────────────────────────────
// Inventarni qo'lda tuzatish (admin)
router.put('/adjust', requireAdmin, async (req, res) => {
  try {
    const { productId, location, quantity } = req.body;
    if (!productId || !location) return res.status(400).json({ ok: false, msg: 'productId va location kerak.' });

    const [inv] = await Inventory.findOrCreate({
      where:    { productId, location },
      defaults: { quantity: 0 }
    });
    await inv.update({ quantity: Math.max(0, parseInt(quantity) || 0) });
    res.json({ ok: true, data: inv });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── POST /api/inventory/add-material ────────────────────────
router.post('/add-material', requireWorker, async (req, res) => {
  try {
    const { matId, qty } = req.body;
    const qty_int = parseInt(qty);
    if (!matId)           return res.status(400).json({ ok: false, msg: 'matId kerak.' });
    if (qty_int <= 0)     return res.status(400).json({ ok: false, msg: 'Musbat son kiriting.' });

    const mat = MATERIALS.find(m => m.id === matId);
    if (!mat) return res.status(404).json({ ok: false, msg: 'Material topilmadi.' });

    const [inv] = await Inventory.findOrCreate({
      where:    { productId: matId, location: 'material' },
      defaults: { quantity: 0 }
    });
    await inv.update({ quantity: inv.quantity + qty_int });

    await Log.create({
      type: 'material_add', productId: matId,
      productName: mat.name, quantity: qty_int,
      source: 'Tashqaridan', destination: 'Seh material'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── POST /api/inventory/transfer ────────────────────────────
// Sehdan do'konga yuborish
router.post('/transfer', requireAdmin, async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const qty_int = parseInt(qty);
    if (!productId)   return res.status(400).json({ ok: false, msg: 'productId kerak.' });
    if (qty_int <= 0) return res.status(400).json({ ok: false, msg: 'Musbat son kiriting.' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ ok: false, msg: 'Mahsulot topilmadi.' });

    // Seh inventarini tekshir
    const wsInv = await Inventory.findOne({ where: { productId, location: 'workshop' } });
    const wsQty = wsInv?.quantity || 0;
    if (qty_int > wsQty) return res.status(400).json({ ok: false, msg: `Sehda faqat ${wsQty} ta mavjud.` });

    // Sehdan ayir
    await wsInv.update({ quantity: wsQty - qty_int });

    // Do'konga qo'sh
    const [shopInv] = await Inventory.findOrCreate({
      where:    { productId, location: 'shop' },
      defaults: { quantity: 0 }
    });
    await shopInv.update({ quantity: shopInv.quantity + qty_int });

    await Log.create({
      type: 'transfer', productId,
      productName: product.name, quantity: qty_int,
      source: 'Seh', destination: "Do'kon"
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── POST /api/inventory/sell ─────────────────────────────────
router.post('/sell', requireAdmin, async (req, res) => {
  try {
    const { productId, qty, pricePerUnit, note } = req.body;
    const qty_int   = parseInt(qty);
    const price     = parseFloat(pricePerUnit) || 0;
    if (!productId)   return res.status(400).json({ ok: false, msg: 'productId kerak.' });
    if (qty_int <= 0) return res.status(400).json({ ok: false, msg: 'Musbat son kiriting.' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ ok: false, msg: 'Mahsulot topilmadi.' });

    const shopInv = await Inventory.findOne({ where: { productId, location: 'shop' } });
    const shopQty = shopInv?.quantity || 0;
    if (qty_int > shopQty) return res.status(400).json({ ok: false, msg: `Do'konda faqat ${shopQty} ta mavjud.` });

    await shopInv.update({ quantity: shopQty - qty_int });

    const log = await Log.create({
      type: 'sale', productId,
      productName: product.name, quantity: qty_int,
      source: "Do'kon", destination: 'Mijoz',
      pricePerUnit: price,
      totalPrice:   price * qty_int,
      note:         note?.trim() || ''
    });
    res.status(201).json({ ok: true, logId: log.id });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

module.exports = router;
