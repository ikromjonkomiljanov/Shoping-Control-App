// routes/tasks.js — Topshiriqlar + Ishlab chiqarish
const express = require("express");
const router = express.Router();

const { Task, Group, Product, Inventory, Log } = require("../models");
const { requireAdmin, requireWorker } = require("../middleware/auth");

// GET /api/tasks — barcha topshiriqlar (admin + worker)
router.get("/", requireWorker, async (req, res) => {
  try {
    let where = {};
    // Worker faqat o'z guruhini ko'radi
    if (req.user.role === "worker") {
      where.groupId = req.user.groupId;
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Group, as: "group", attributes: ["id", "name", "color"] },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "icon", "unit"],
        },
      ],
      order: [
        ["status", "ASC"], // active avval
        ["createdAt", "DESC"],
      ],
    });
    res.json({ ok: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Server xatosi." });
  }
});

// POST /api/tasks — yangi topshiriq (faqat admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { groupId, productId, quantity, deadline, pricePerItem, note } =
      req.body;
    if (!groupId)
      return res.status(400).json({ ok: false, msg: "groupId kerak." });
    if (!productId)
      return res.status(400).json({ ok: false, msg: "productId kerak." });
    if (!quantity || parseInt(quantity) < 1)
      return res.status(400).json({ ok: false, msg: "Miqdor kiritilmagan." });

    const group = await Group.findByPk(groupId);
    const product = await Product.findByPk(productId);
    if (!group)
      return res.status(404).json({ ok: false, msg: "Guruh topilmadi." });
    if (!product)
      return res.status(404).json({ ok: false, msg: "Mahsulot topilmadi." });

    const task = await Task.create({
      groupId,
      productId,
      quantity: parseInt(quantity),
      deadline: deadline || null,
      pricePerItem: parseFloat(pricePerItem) || 0,
      note: note?.trim() || "",
    });

    const full = await Task.findByPk(task.id, {
      include: [
        { model: Group, as: "group", attributes: ["id", "name", "color"] },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "icon", "unit"],
        },
      ],
    });
    res.status(201).json({ ok: true, data: full });
  } catch (err) {
    res.status(500).json({ ok: false, msg: "Server xatosi." });
  }
});

// PUT /api/tasks/:id — tahrirlash
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ ok: false, msg: "Topilmadi." });

    const { quantity, deadline, pricePerItem, note } = req.body;
    const newQty = parseInt(quantity);

    if (newQty < task.produced) {
      return res
        .status(400)
        .json({
          ok: false,
          msg: `Miqdor ${task.produced} tadan kam bo'lishi mumkin emas.`,
        });
    }

    await task.update({
      quantity: newQty,
      deadline: deadline || null,
      pricePerItem: parseFloat(pricePerItem) || 0,
      note: note?.trim() || task.note,
      status: newQty <= task.produced ? "completed" : "active",
    });
    res.json({ ok: true, data: task });
  } catch (err) {
    res.status(500).json({ ok: false, msg: "Server xatosi." });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ ok: false, msg: "Topilmadi." });
    await task.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: "Server xatosi." });
  }
});

// POST /api/tasks/:id/produce — Ishlab chiqarish (worker + admin)
router.post("/:id/produce", requireWorker, async (req, res) => {
  try {
    const qty = parseInt(req.body.qty);
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Product, as: "product" },
        { model: Group, as: "group" },
      ],
    });

    if (!task)
      return res.status(404).json({ ok: false, msg: "Topshiriq topilmadi." });
    if (isNaN(qty) || qty <= 0)
      return res.status(400).json({ ok: false, msg: "Musbat son kiriting." });

    // Worker faqat o'z guruhining topshirig'iga ishlab chiqara oladi
    if (req.user.role === "worker" && task.groupId !== req.user.groupId) {
      return res
        .status(403)
        .json({
          ok: false,
          msg: "Bu topshiriq sizning guruhingizga tegishli emas.",
        });
    }

    const remaining = task.quantity - task.produced;
    if (qty > remaining)
      return res
        .status(400)
        .json({ ok: false, msg: `Faqat ${remaining} ta qolgan.` });

    // 1. Task produced ni oshir
    const newProduced = task.produced + qty;
    await task.update({
      produced: newProduced,
      status: newProduced >= task.quantity ? "completed" : "active",
    });

    // 2. Seh inventarini oshir (yoki yaratib qo'y)
    const [inv] = await Inventory.findOrCreate({
      where: { productId: task.productId, location: "workshop" },
      defaults: { quantity: 0 },
    });
    await inv.update({ quantity: inv.quantity + qty });

    // 3. Log yoz
    await Log.create({
      type: "production",
      productId: task.productId,
      productName: task.product.name,
      quantity: qty,
      source: task.group?.name || "Seh",
      destination: "Seh inventar",
      pricePerUnit: task.pricePerItem,
      totalPrice: task.pricePerItem * qty,
    });

    res.json({ ok: true, produced: newProduced });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Server xatosi." });
  }
});

module.exports = router;
