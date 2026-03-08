// routes/groups.js — Guruhlar CRUD
const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const { Op }  = require('sequelize');

const { Group, Task }  = require('../models');
const { requireAdmin } = require('../middleware/auth');

// GET /api/groups
router.get('/', requireAdmin, async (req, res) => {
  try {
    const groups = await Group.findAll({
      order: [['createdAt', 'ASC']],
      attributes: { exclude: ['passwordHash'] }  // Parolni frontendga yubormaymiz
    });
    res.json({ ok: true, data: groups });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// POST /api/groups — yangi guruh
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, color, password } = req.body;
    if (!name?.trim())              return res.status(400).json({ ok: false, msg: 'Nom kiritilmagan.' });
    if (!password || password.length < 3) return res.status(400).json({ ok: false, msg: 'Parol kamida 3 ta belgi.' });

    const exists = await Group.findOne({
      where: { name: { [Op.iLike]: name.trim() } }
    });
    if (exists) return res.status(400).json({ ok: false, msg: 'Bu nomli guruh allaqachon mavjud.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const group = await Group.create({
      name: name.trim(),
      color: color || '#2563eb',
      passwordHash
    });

    // Qaytarishda passwordHash ni olib tashlaymiz
    const { passwordHash: _, ...groupData } = group.toJSON();
    res.status(201).json({ ok: true, data: groupData });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// PUT /api/groups/:id — nom va rang tahrirlash
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, msg: 'Nom kiritilmagan.' });

    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ ok: false, msg: 'Topilmadi.' });

    const conflict = await Group.findOne({
      where: { name: { [Op.iLike]: name.trim() }, id: { [Op.ne]: req.params.id } }
    });
    if (conflict) return res.status(400).json({ ok: false, msg: 'Bu nomli guruh allaqachon mavjud.' });

    await group.update({ name: name.trim(), color: color || group.color });
    const { passwordHash: _, ...groupData } = group.toJSON();
    res.json({ ok: true, data: groupData });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ ok: false, msg: 'Topilmadi.' });

    const activeTask = await Task.findOne({ where: { groupId: req.params.id, status: 'active' } });
    if (activeTask) return res.status(400).json({ ok: false, msg: 'Bu guruhda faol topshiriqlar bor.' });

    await group.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

module.exports = router;
