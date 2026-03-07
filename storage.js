/**
 * Storage Layer — Abstracted for future migration to Node.js + PostgreSQL
 * All localStorage interactions happen here only.
 */

const Storage = (() => {
  const KEYS = {
    PRODUCTS: 'smb_products',
    SHOP_INVENTORY: 'smb_shop_inventory',
    WORKSHOP_INVENTORY: 'smb_workshop_inventory',
    MATERIAL_INVENTORY: 'smb_material_inventory',
    LOGS: 'smb_logs',
  };

  // ─── Seed Default Data ────────────────────────────────────────────────────

  const DEFAULT_PRODUCTS = [
    { id: 'p1', name: "Kastyum/Shim",  icon: '👔' },
    { id: 'p2', name: "Kastyum",      icon: '👘' },
    { id: 'p3', name: "Shim",       icon: '👖' },
    { id: 'p4', name: "Kepka",         icon: '🧢' },
    { id: 'p5', name: "Poyabzal",      icon: '👟' },
  ];

  const DEFAULT_MATERIALS = [
    { id: 'm1', name: 'Material',        icon: '🧵' },
    { id: 'm2', name: 'Ip',              icon: '🪡' },
    { id: 'm3', name: 'Ichki gazlama',   icon: '🧶' },
  ];

  function seed() {
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
      set(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    }
    if (!localStorage.getItem(KEYS.SHOP_INVENTORY)) {
      set(KEYS.SHOP_INVENTORY, {});
    }
    if (!localStorage.getItem(KEYS.WORKSHOP_INVENTORY)) {
      set(KEYS.WORKSHOP_INVENTORY, {});
    }
    if (!localStorage.getItem(KEYS.MATERIAL_INVENTORY)) {
      const inv = {};
      DEFAULT_MATERIALS.forEach(m => inv[m.id] = 0);
      set(KEYS.MATERIAL_INVENTORY, inv);
    }
    if (!localStorage.getItem(KEYS.LOGS)) {
      set(KEYS.LOGS, []);
    }
  }

  // ─── Core Helpers ─────────────────────────────────────────────────────────

  function get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  function getProducts() {
    return get(KEYS.PRODUCTS) || [];
  }

  function getProductById(id) {
    return getProducts().find(p => p.id === id) || null;
  }

  function getMaterials() {
    return DEFAULT_MATERIALS;
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  function getShopInventory() {
    return get(KEYS.SHOP_INVENTORY) || {};
  }

  function getWorkshopInventory() {
    return get(KEYS.WORKSHOP_INVENTORY) || {};
  }

  function getMaterialInventory() {
    return get(KEYS.MATERIAL_INVENTORY) || {};
  }

  function setShopInventory(inv) {
    set(KEYS.SHOP_INVENTORY, inv);
  }

  function setWorkshopInventory(inv) {
    set(KEYS.WORKSHOP_INVENTORY, inv);
  }

  function setMaterialInventory(inv) {
    set(KEYS.MATERIAL_INVENTORY, inv);
  }

  // ─── Logs ─────────────────────────────────────────────────────────────────

  function getLogs() {
    return get(KEYS.LOGS) || [];
  }

  function addLog(entry) {
    const logs = getLogs();
    logs.unshift({
      id: 'log_' + Date.now(),
      date: new Date().toISOString(),
      ...entry,
    });
    set(KEYS.LOGS, logs);
  }

  function getLogsByType(type) {
    return getLogs().filter(l => l.type === type);
  }

  function getRecentLogs(n = 20) {
    return getLogs().slice(0, n);
  }

  function getTodayLogs() {
    const today = new Date().toDateString();
    return getLogs().filter(l => new Date(l.date).toDateString() === today);
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    seed();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    seed,
    getProducts, getProductById,
    getMaterials,
    getShopInventory, setShopInventory,
    getWorkshopInventory, setWorkshopInventory,
    getMaterialInventory, setMaterialInventory,
    getLogs, addLog, getLogsByType, getRecentLogs, getTodayLogs,
    resetAll,
  };
})();
