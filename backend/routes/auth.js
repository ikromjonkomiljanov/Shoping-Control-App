// routes/auth.js — Login/Logout API
const express       = require('express');
const bcrypt        = require('bcrypt');
const router        = express.Router();
const { Op }        = require('sequelize');
const { sequelize } = require('../config/db');   // yuqoriga ko'chirildi

const { Admin, Group }            = require('../models');
const { signToken, requireAdmin } = require('../middleware/auth');

// ── POST /api/auth/login ───────────────────────────────────────
// Admin va Worker uchun bitta endpoint — role parametr bilan farqlanadi
router.post('/login', async (req, res) => {
  try {
    const { role, password, groupName } = req.body;

    // ── Admin login ──────────────────────────────────────────
    if (role === 'admin') {
      if (!password) return res.status(400).json({ ok: false, msg: 'Parolni kiriting.' });

      const admin = await Admin.findOne({ where: { id: 1 } });
      if (!admin) return res.status(500).json({ ok: false, msg: 'Admin topilmadi. Server muammosi.' });

      const match = await bcrypt.compare(password, admin.passwordHash);
      if (!match) return res.status(401).json({ ok: false, msg: 'Parol noto\'g\'ri!' });

      const token = signToken({ role: 'admin' });
      return res.json({ ok: true, token, role: 'admin' });
    }

    // ── Worker login ─────────────────────────────────────────
    if (role === 'worker') {
      if (!groupName) return res.status(400).json({ ok: false, msg: 'Guruh nomini kiriting.' });
      if (!password)  return res.status(400).json({ ok: false, msg: 'Parolni kiriting.' });

      // Case-insensitive qidiruv
      const group = await Group.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          groupName.toLowerCase().trim()
        )
      });

      if (!group) return res.status(404).json({ ok: false, msg: `Guruh topilmadi: "${groupName}"` });

      const match = await bcrypt.compare(password, group.passwordHash);
      if (!match) return res.status(401).json({ ok: false, msg: 'Guruh paroli noto\'g\'ri!' });

      const token = signToken({
        role:      'worker',
        groupId:   group.id,
        groupName: group.name
      });
      return res.json({ ok: true, token, role: 'worker', groupId: group.id, groupName: group.name });
    }

    return res.status(400).json({ ok: false, msg: 'Role noto\'g\'ri: admin yoki worker bo\'lishi kerak.' });

  } catch (err) {
    console.error('Login xatosi:', err);
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── POST /api/auth/change-admin-password ──────────────────────
router.post('/change-admin-password', requireAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ ok: false, msg: 'Parollarni kiriting.' });
    if (newPassword.length < 4)       return res.status(400).json({ ok: false, msg: 'Kamida 4 ta belgi.' });

    const admin = await Admin.findByPk(1);
    const match = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!match) return res.status(401).json({ ok: false, msg: 'Joriy parol noto\'g\'ri.' });

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

// ── POST /api/auth/set-group-password ─────────────────────────
router.post('/set-group-password', requireAdmin, async (req, res) => {
  try {
    const { groupId, password } = req.body;
    if (!groupId)          return res.status(400).json({ ok: false, msg: 'groupId kerak.' });
    if (!password || password.length < 3) return res.status(400).json({ ok: false, msg: 'Kamida 3 ta belgi.' });

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ ok: false, msg: 'Guruh topilmadi.' });

    group.passwordHash = await bcrypt.hash(password, 10);
    await group.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: 'Server xatosi.' });
  }
});

module.exports = router;
