// routes/products.js — Mahsulotlar CRUD
const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');

const { Product, Task } = require('../models');
const { requireAdmin }  = require('../middleware/auth');

// GET /api/products — barcha mahsulotlar
router.get('/', requireAdmin, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'ASC']] });
    res.json({ ok: true, data: products });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// POST /api/products — yangi mahsulot
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, icon, unit } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, msg: 'Nomi kiritilmagan.' });

    const exists = await Product.findOne({
      where: { name: { [Op.iLike]: name.trim() } }  // iLike = case-insensitive
    });
    if (exists) return res.status(400).json({ ok: false, msg: 'Bu nomli mahsulot allaqachon mavjud.' });

    const product = await Product.create({
      name: name.trim(),
      icon: icon || '📦',
      unit: unit || 'dona'
    });
    res.status(201).json({ ok: true, data: product });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// PUT /api/products/:id — tahrirlash
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, icon, unit } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, msg: 'Nomi kiritilmagan.' });

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ ok: false, msg: 'Topilmadi.' });

    // Boshqa mahsulotda xuddi shu nom bormi?
    const conflict = await Product.findOne({
      where: { name: { [Op.iLike]: name.trim() }, id: { [Op.ne]: req.params.id } }
    });
    if (conflict) return res.status(400).json({ ok: false, msg: 'Bu nomli mahsulot allaqachon mavjud.' });

    await product.update({ name: name.trim(), icon: icon || product.icon, unit: unit || product.unit });
    res.json({ ok: true, data: product });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ ok: false, msg: 'Topilmadi.' });

    // Faol topshiriqda ishlatilayaptimi?
    const activeTask = await Task.findOne({
      where: { productId: req.params.id, status: 'active' }
    });
    if (activeTask) return res.status(400).json({ ok: false, msg: 'Bu mahsulot faol topshiriqda ishlatilmoqda.' });

    await product.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

module.exports = router;
