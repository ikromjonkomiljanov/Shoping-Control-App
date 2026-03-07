/**
 * STORAGE MODULE
 * Single source of truth for all data access.
 * Replace internals with fetch() calls to migrate to Node.js backend.
 */
const Storage = (() => {
  const KEYS = {
    PRODUCTS: "smb2_products",
    GROUPS: "smb2_groups",
    TASKS: "smb2_tasks",
    WS_INV: "smb2_ws_inventory",
    SHOP_INV: "smb2_shop_inventory",
    MAT_INV: "smb2_mat_inventory",
    LOGS: "smb2_logs",
  };

  const DEFAULT_PRODUCTS = [
    { id: "p1", name: "Kastyum/Shim", icon: "👔", unit: "dona" },
    { id: "p2", name: "Futbolka", icon: "👕", unit: "dona" },
    { id: "p3", name: "Ko'ylak", icon: "👗", unit: "dona" },
    { id: "p4", name: "Kepka", icon: "🧢", unit: "dona" },
    { id: "p5", name: "Poyabzal", icon: "👟", unit: "juft" },
  ];

  const DEFAULT_MATERIALS = [
    { id: "m1", name: "Material (mato)", icon: "🧵", unit: "metr" },
    { id: "m2", name: "Ip", icon: "🪡", unit: "dona" },
    { id: "m3", name: "Ichki gazlama", icon: "🧶", unit: "metr" },
    { id: "m4", name: "Tashqi gazlama", icon: "🪢", unit: "metr" },
  ];

  const DEFAULT_GROUPS = [
    {
      id: "g1",
      name: "A Guruh",
      color: "#4f8ef7",
      createdAt: new Date().toISOString(),
    },
    {
      id: "g2",
      name: "B Guruh",
      color: "#34d399",
      createdAt: new Date().toISOString(),
    },
    {
      id: "g3",
      name: "C Guruh",
      color: "#fbbf24",
      createdAt: new Date().toISOString(),
    },
  ];

  function _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }
  function _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function seed() {
    if (!_get(KEYS.PRODUCTS)) _set(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    if (!_get(KEYS.GROUPS)) _set(KEYS.GROUPS, DEFAULT_GROUPS);
    if (!_get(KEYS.TASKS)) _set(KEYS.TASKS, []);
    if (!_get(KEYS.WS_INV)) _set(KEYS.WS_INV, {});
    if (!_get(KEYS.SHOP_INV)) _set(KEYS.SHOP_INV, {});
    if (!_get(KEYS.MAT_INV)) {
      const inv = {};
      DEFAULT_MATERIALS.forEach((m) => (inv[m.id] = 0));
      _set(KEYS.MAT_INV, inv);
    }
    if (!_get(KEYS.LOGS)) _set(KEYS.LOGS, []);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  function getProducts() {
    return _get(KEYS.PRODUCTS) || [];
  }
  function getProductById(id) {
    return getProducts().find((p) => p.id === id) || null;
  }
  function saveProducts(list) {
    _set(KEYS.PRODUCTS, list);
  }
  function getMaterials() {
    return DEFAULT_MATERIALS;
  }

  function createProduct(name, icon, unit) {
    const products = getProducts();
    if (products.find((p) => p.name.toLowerCase() === name.toLowerCase()))
      return { ok: false, msg: "Bu nomli mahsulot allaqachon mavjud." };
    const newP = {
      id: "p" + Date.now(),
      name,
      icon: icon || "📦",
      unit: unit || "dona",
    };
    products.push(newP);
    saveProducts(products);
    return { ok: true, product: newP };
  }

  // ── Groups ────────────────────────────────────────────────────────────────
  function getGroups() {
    return _get(KEYS.GROUPS) || [];
  }
  function getGroupById(id) {
    return getGroups().find((g) => g.id === id) || null;
  }

  function createGroup(name, color) {
    const groups = getGroups();
    if (groups.find((g) => g.name.toLowerCase() === name.toLowerCase()))
      return { ok: false, msg: "Bu nomli guruh allaqachon mavjud." };
    const g = {
      id: "g" + Date.now(),
      name,
      color: color || "#4f8ef7",
      createdAt: new Date().toISOString(),
    };
    groups.push(g);
    _set(KEYS.GROUPS, groups);
    return { ok: true, group: g };
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  function getTasks() {
    return _get(KEYS.TASKS) || [];
  }
  function getTaskById(id) {
    return getTasks().find((t) => t.id === id) || null;
  }

  function createTask(
    groupId,
    productId,
    quantity,
    deadline,
    pricePerItem,
    note,
  ) {
    const tasks = getTasks();
    const t = {
      id: "task" + Date.now(),
      groupId,
      productId,
      quantity: parseInt(quantity),
      produced: 0,
      deadline,
      pricePerItem: parseFloat(pricePerItem) || 0,
      note: note || "",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    tasks.push(t);
    _set(KEYS.TASKS, tasks);
    return { ok: true, task: t };
  }

  function recordProduction(taskId, qty) {
    const tasks = getTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return { ok: false, msg: "Topshiriq topilmadi." };
    const task = tasks[idx];
    qty = parseInt(qty);
    const remaining = task.quantity - task.produced;
    if (qty > remaining)
      return { ok: false, msg: `Faqat ${remaining} ta qolgan.` };

    tasks[idx].produced += qty;
    if (tasks[idx].produced >= tasks[idx].quantity)
      tasks[idx].status = "completed";
    _set(KEYS.TASKS, tasks);

    // Update workshop inventory
    const inv = _get(KEYS.WS_INV) || {};
    inv[task.productId] = (inv[task.productId] || 0) + qty;
    _set(KEYS.WS_INV, inv);

    // Log
    const prod = getProductById(task.productId);
    const grp = getGroupById(task.groupId);
    addLog({
      type: "production",
      productId: task.productId,
      productName: prod ? prod.name : "?",
      quantity: qty,
      source: `seh (${grp ? grp.name : "?"})`,
      destination: "seh_inventory",
      price: task.pricePerItem * qty,
      note: `Topshiriq #${taskId.slice(-4)}`,
    });

    return { ok: true, task: tasks[idx] };
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  function getWsInventory() {
    return _get(KEYS.WS_INV) || {};
  }
  function getShopInventory() {
    return _get(KEYS.SHOP_INV) || {};
  }
  function getMatInventory() {
    return _get(KEYS.MAT_INV) || {};
  }

  function addMaterial(matId, qty) {
    const inv = getMatInventory();
    inv[matId] = (inv[matId] || 0) + parseInt(qty);
    _set(KEYS.MAT_INV, inv);
    const mat = getMaterials().find((m) => m.id === matId);
    addLog({
      type: "material_add",
      productId: matId,
      productName: mat ? mat.name : "?",
      quantity: parseInt(qty),
      source: "tashqi",
      destination: "seh",
      price: 0,
      note: "",
    });
    return { ok: true };
  }

  // ── Transfer ──────────────────────────────────────────────────────────────
  function transferToShop(productId, qty) {
    qty = parseInt(qty);
    const wsInv = getWsInventory();
    const available = wsInv[productId] || 0;
    if (qty <= 0 || qty > available) {
      return { ok: false, msg: `Sehda faqat ${available} ta mavjud.` };
    }
    wsInv[productId] = available - qty;
    _set(KEYS.WS_INV, wsInv);

    const shopInv = getShopInventory();
    shopInv[productId] = (shopInv[productId] || 0) + qty;
    _set(KEYS.SHOP_INV, shopInv);

    const prod = getProductById(productId);
    addLog({
      type: "transfer",
      productId,
      productName: prod ? prod.name : "?",
      quantity: qty,
      source: "seh",
      destination: "do'kon",
      price: 0,
      note: "",
    });
    return { ok: true };
  }

  // ── Sales ─────────────────────────────────────────────────────────────────
  function sellProduct(productId, qty, price, note) {
    qty = parseInt(qty);
    const shopInv = getShopInventory();
    const available = shopInv[productId] || 0;
    if (qty <= 0 || qty > available) {
      return { ok: false, msg: `Do'konda faqat ${available} ta mavjud.` };
    }
    shopInv[productId] = available - qty;
    _set(KEYS.SHOP_INV, shopInv);

    const prod = getProductById(productId);
    addLog({
      type: "sale",
      productId,
      productName: prod ? prod.name : "?",
      quantity: qty,
      source: "do'kon",
      destination: "mijoz",
      price: parseFloat(price) || 0,
      note: note || "",
    });
    return { ok: true };
  }

  // ── Logs ──────────────────────────────────────────────────────────────────
  function getLogs() {
    return _get(KEYS.LOGS) || [];
  }
  function getRecentLogs(n) {
    return getLogs().slice(0, n || 25);
  }
  function getLogsByType(type) {
    return getLogs().filter((l) => l.type === type);
  }

  function addLog(entry) {
    const logs = getLogs();
    logs.unshift({
      id: "log" + Date.now() + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      ...entry,
    });
    _set(KEYS.LOGS, logs);
  }

  function getLogsFiltered({ type, productId, from, to } = {}) {
    let logs = getLogs();
    if (type) logs = logs.filter((l) => l.type === type);
    if (productId) logs = logs.filter((l) => l.productId === productId);
    if (from) logs = logs.filter((l) => l.date >= from);
    if (to) logs = logs.filter((l) => l.date <= to);
    return logs;
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  function getReportSummary() {
    const logs = getLogs();
    const today = new Date().toDateString();

    const sum = (type) =>
      logs.filter((l) => l.type === type).reduce((s, l) => s + l.quantity, 0);
    const sumToday = (type) =>
      logs
        .filter(
          (l) => l.type === type && new Date(l.date).toDateString() === today,
        )
        .reduce((s, l) => s + l.quantity, 0);
    const revenue = logs
      .filter((l) => l.type === "sale")
      .reduce((s, l) => s + (l.price || 0), 0);
    const todayRevenue = logs
      .filter(
        (l) => l.type === "sale" && new Date(l.date).toDateString() === today,
      )
      .reduce((s, l) => s + (l.price || 0), 0);

    const salesByProduct = {};
    logs
      .filter((l) => l.type === "sale")
      .forEach((l) => {
        salesByProduct[l.productName] =
          (salesByProduct[l.productName] || 0) + l.quantity;
      });

    const prodByProduct = {};
    logs
      .filter((l) => l.type === "production")
      .forEach((l) => {
        prodByProduct[l.productName] =
          (prodByProduct[l.productName] || 0) + l.quantity;
      });

    // Monthly breakdown (last 6 months)
    const monthly = {};
    logs
      .filter((l) => l.type === "sale")
      .forEach((l) => {
        const m = l.date.slice(0, 7);
        monthly[m] = (monthly[m] || 0) + l.quantity;
      });

    return {
      sum,
      sumToday,
      revenue,
      todayRevenue,
      salesByProduct,
      prodByProduct,
      monthly,
    };
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    seed();
  }

  return {
    seed,
    resetAll,
    // Products
    getProducts,
    getProductById,
    getMaterials,
    createProduct,
    // Groups
    getGroups,
    getGroupById,
    createGroup,
    // Tasks
    getTasks,
    getTaskById,
    createTask,
    recordProduction,
    // Inventory
    getWsInventory,
    getShopInventory,
    getMatInventory,
    addMaterial,
    // Operations
    transferToShop,
    sellProduct,
    // Logs
    getLogs,
    getRecentLogs,
    getLogsByType,
    getLogsFiltered,
    addLog,
    // Reports
    getReportSummary,
  };
})();
