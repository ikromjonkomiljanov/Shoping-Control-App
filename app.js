/**
 * App Logic — Business operations
 * Pure functions that operate on data; no DOM here.
 * Easy to migrate: replace Storage.* calls with API calls.
 */

const App = (() => {

  // ─── Workshop: Produce Product ────────────────────────────────────────────

  function produceProduct(productId, qty) {
    qty = parseInt(qty);
    if (!productId || qty <= 0) return { ok: false, msg: "Mahsulot va miqdorni to'g'ri kiriting." };

    const product = Storage.getProductById(productId);
    if (!product) return { ok: false, msg: "Mahsulot topilmadi." };

    const inv = Storage.getWorkshopInventory();
    inv[productId] = (inv[productId] || 0) + qty;
    Storage.setWorkshopInventory(inv);

    Storage.addLog({
      type: 'production',
      productId,
      productName: product.name,
      quantity: qty,
      source: 'seh',
      destination: 'seh',
    });

    return { ok: true, msg: `✅ ${qty} ta ${product.name} ishlab chiqarildi.` };
  }

  // ─── Workshop: Add Material ───────────────────────────────────────────────

  function addMaterial(materialId, qty) {
    qty = parseInt(qty);
    if (!materialId || qty <= 0) return { ok: false, msg: "Material va miqdorni to'g'ri kiriting." };

    const materials = Storage.getMaterials();
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return { ok: false, msg: "Material topilmadi." };

    const inv = Storage.getMaterialInventory();
    inv[materialId] = (inv[materialId] || 0) + qty;
    Storage.setMaterialInventory(inv);

    Storage.addLog({
      type: 'material_add',
      productId: materialId,
      productName: mat.name,
      quantity: qty,
      source: 'tashqi',
      destination: 'seh',
    });

    return { ok: true, msg: `✅ ${qty} birlik ${mat.name} qo'shildi.` };
  }

  // ─── Transfer: Workshop → Shop ────────────────────────────────────────────

  function transferProduct(productId, qty) {
    qty = parseInt(qty);
    if (!productId || qty <= 0) return { ok: false, msg: "Mahsulot va miqdorni to'g'ri kiriting." };

    const product = Storage.getProductById(productId);
    if (!product) return { ok: false, msg: "Mahsulot topilmadi." };

    const workshopInv = Storage.getWorkshopInventory();
    const available = workshopInv[productId] || 0;

    if (available < qty) {
      return { ok: false, msg: `❌ Sehda faqat ${available} ta ${product.name} bor.` };
    }

    // Deduct from workshop
    workshopInv[productId] = available - qty;
    Storage.setWorkshopInventory(workshopInv);

    // Add to shop
    const shopInv = Storage.getShopInventory();
    shopInv[productId] = (shopInv[productId] || 0) + qty;
    Storage.setShopInventory(shopInv);

    Storage.addLog({
      type: 'transfer',
      productId,
      productName: product.name,
      quantity: qty,
      source: 'seh',
      destination: "do'kon",
    });

    return { ok: true, msg: `✅ ${qty} ta ${product.name} do'konga yuborildi.` };
  }

  // ─── Shop: Sell Product ───────────────────────────────────────────────────

  function sellProduct(productId, qty) {
    qty = parseInt(qty);
    if (!productId || qty <= 0) return { ok: false, msg: "Mahsulot va miqdorni to'g'ri kiriting." };

    const product = Storage.getProductById(productId);
    if (!product) return { ok: false, msg: "Mahsulot topilmadi." };

    const shopInv = Storage.getShopInventory();
    const available = shopInv[productId] || 0;

    if (available < qty) {
      return { ok: false, msg: `❌ Do'konda faqat ${available} ta ${product.name} bor.` };
    }

    shopInv[productId] = available - qty;
    Storage.setShopInventory(shopInv);

    Storage.addLog({
      type: 'sale',
      productId,
      productName: product.name,
      quantity: qty,
      source: "do'kon",
      destination: 'mijoz',
    });

    return { ok: true, msg: `✅ ${qty} ta ${product.name} sotildi.` };
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  function getReportSummary() {
    const logs = Storage.getLogs();
    const todayLogs = Storage.getTodayLogs();

    const totalProduced = logs
      .filter(l => l.type === 'production')
      .reduce((s, l) => s + l.quantity, 0);

    const totalTransferred = logs
      .filter(l => l.type === 'transfer')
      .reduce((s, l) => s + l.quantity, 0);

    const totalSold = logs
      .filter(l => l.type === 'sale')
      .reduce((s, l) => s + l.quantity, 0);

    const todaySold = todayLogs
      .filter(l => l.type === 'sale')
      .reduce((s, l) => s + l.quantity, 0);

    const todayProduced = todayLogs
      .filter(l => l.type === 'production')
      .reduce((s, l) => s + l.quantity, 0);

    // Sales by product
    const salesByProduct = {};
    logs.filter(l => l.type === 'sale').forEach(l => {
      salesByProduct[l.productName] = (salesByProduct[l.productName] || 0) + l.quantity;
    });

    return {
      totalProduced,
      totalTransferred,
      totalSold,
      todaySold,
      todayProduced,
      salesByProduct,
    };
  }

  return {
    produceProduct,
    addMaterial,
    transferProduct,
    sellProduct,
    getReportSummary,
  };
})();
