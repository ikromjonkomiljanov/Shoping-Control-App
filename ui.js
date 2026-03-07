/**
 * UI Layer — All DOM rendering and event binding
 * Communicates only through App.* and Storage.* — easy to swap for React components.
 */

const UI = (() => {

  // ─── Toast ────────────────────────────────────────────────────────────────

  function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
      });
    });
  }

  function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    const pageEl = document.getElementById(`page-${page}`);

    if (navEl)  navEl.classList.add('active');
    if (pageEl) {
      pageEl.classList.add('active');
      renderPage(page);
    }
  }

  function renderPage(page) {
    switch (page) {
      case 'dashboard':   renderDashboard(); break;
      case 'workshop':    renderWorkshop();  break;
      case 'transfer':    renderTransfer();  break;
      case 'shop':        renderShop();      break;
      case 'reports':     renderReports();   break;
    }
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  function initTabs(containerSelector) {
    document.querySelectorAll(`${containerSelector} .tab`).forEach(tab => {
      tab.addEventListener('click', () => {
        const paneId = tab.dataset.pane;
        const parent = tab.closest('.tabs').parentElement;
        parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = parent.querySelector(`#${paneId}`);
        if (pane) pane.classList.add('active');
      });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function qtyBadge(qty) {
    const cls = qty === 0 ? 'empty' : qty <= 5 ? 'warn' : 'ok';
    return `<span class="qty-badge ${cls}">${qty}</span>`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }

  function logBadge(type) {
    const labels = {
      production:   '🔨 Ishlab chiqarish',
      transfer:     '📦 Yuborish',
      sale:         '💰 Sotuv',
      material_add: '➕ Material',
    };
    return `<span class="log-badge ${type}">${labels[type] || type}</span>`;
  }

  function productSelectOptions(placeholder = "-- Mahsulot tanlang --") {
    const products = Storage.getProducts();
    return `<option value="">${placeholder}</option>` +
      products.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('');
  }

  function materialSelectOptions() {
    const materials = Storage.getMaterials();
    return `<option value="">-- Material tanlang --</option>` +
      materials.map(m => `<option value="${m.id}">${m.icon} ${m.name}</option>`).join('');
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  function renderDashboard() {
    const summary = App.getReportSummary();
    const shopInv = Storage.getShopInventory();
    const workshopInv = Storage.getWorkshopInventory();

    const shopTotal = Object.values(shopInv).reduce((s, v) => s + v, 0);
    const workshopTotal = Object.values(workshopInv).reduce((s, v) => s + v, 0);

    document.getElementById('dash-produced').textContent = summary.totalProduced;
    document.getElementById('dash-transferred').textContent = summary.totalTransferred;
    document.getElementById('dash-sold').textContent = summary.totalSold;
    document.getElementById('dash-shop-stock').textContent = shopTotal;
    document.getElementById('dash-workshop-stock').textContent = workshopTotal;
    document.getElementById('dash-today-sold').textContent = summary.todaySold;

    // Recent logs
    const logs = Storage.getRecentLogs(8);
    const container = document.getElementById('dash-recent-logs');
    if (logs.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Hali hech qanday harakat yo'q</p></div>`;
    } else {
      container.innerHTML = `<div class="log-list">${logs.map(renderLogItem).join('')}</div>`;
    }
  }

  // ─── WORKSHOP ─────────────────────────────────────────────────────────────

  function renderWorkshop() {
    renderWorkshopInventory();
    renderMaterialInventory();
    initTabs('#page-workshop');
  }

  function renderWorkshopInventory() {
    const inv = Storage.getWorkshopInventory();
    const products = Storage.getProducts();
    const el = document.getElementById('workshop-inventory-table');

    const rows = products.map(p => {
      const qty = inv[p.id] || 0;
      return `<tr>
        <td><span style="font-size:18px">${p.icon}</span></td>
        <td style="font-weight:600">${p.name}</td>
        <td>${qtyBadge(qty)}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `<table class="inv-table">
      <thead><tr><th></th><th>Mahsulot</th><th>Miqdor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderMaterialInventory() {
    const inv = Storage.getMaterialInventory();
    const materials = Storage.getMaterials();
    const el = document.getElementById('material-inventory-table');

    const rows = materials.map(m => {
      const qty = inv[m.id] || 0;
      return `<tr>
        <td><span style="font-size:18px">${m.icon}</span></td>
        <td style="font-weight:600">${m.name}</td>
        <td>${qtyBadge(qty)}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `<table class="inv-table">
      <thead><tr><th></th><th>Material</th><th>Miqdor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function bindWorkshopForm() {
    // Produce product
    document.getElementById('btn-produce').addEventListener('click', () => {
      const productId = document.getElementById('produce-product').value;
      const qty = document.getElementById('produce-qty').value;
      const result = App.produceProduct(productId, qty);
      toast(result.msg, result.ok ? 'success' : 'error');
      if (result.ok) {
        document.getElementById('produce-qty').value = '';
        renderWorkshopInventory();
      }
    });

    // Add material
    document.getElementById('btn-add-material').addEventListener('click', () => {
      const materialId = document.getElementById('material-type').value;
      const qty = document.getElementById('material-qty').value;
      const result = App.addMaterial(materialId, qty);
      toast(result.msg, result.ok ? 'success' : 'error');
      if (result.ok) {
        document.getElementById('material-qty').value = '';
        renderMaterialInventory();
      }
    });
  }

  // ─── TRANSFER ─────────────────────────────────────────────────────────────

  function renderTransfer() {
    renderTransferLogs();
  }

  function renderTransferLogs() {
    const logs = Storage.getLogsByType('transfer').slice(0, 15);
    const el = document.getElementById('transfer-logs');
    if (logs.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>Hali yuborish amalga oshirilmagan</p></div>`;
    } else {
      el.innerHTML = `<div class="log-list">${logs.map(renderLogItem).join('')}</div>`;
    }
  }

  function bindTransferForm() {
    document.getElementById('btn-transfer').addEventListener('click', () => {
      const productId = document.getElementById('transfer-product').value;
      const qty = document.getElementById('transfer-qty').value;
      const result = App.transferProduct(productId, qty);
      toast(result.msg, result.ok ? 'success' : 'error');
      if (result.ok) {
        document.getElementById('transfer-qty').value = '';
        renderTransferLogs();
        // Update workshop inventory badge in sidebar hint
      }
    });
  }

  // ─── SHOP ─────────────────────────────────────────────────────────────────

  function renderShop() {
    renderShopInventory();
    renderSaleLogs();
    initTabs('#page-shop');
  }

  function renderShopInventory() {
    const inv = Storage.getShopInventory();
    const products = Storage.getProducts();
    const el = document.getElementById('shop-inventory-table');

    const rows = products.map(p => {
      const qty = inv[p.id] || 0;
      return `<tr>
        <td><span style="font-size:18px">${p.icon}</span></td>
        <td style="font-weight:600">${p.name}</td>
        <td>${qtyBadge(qty)}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `<table class="inv-table">
      <thead><tr><th></th><th>Mahsulot</th><th>Miqdor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderSaleLogs() {
    const logs = Storage.getLogsByType('sale').slice(0, 15);
    const el = document.getElementById('sale-logs');
    if (logs.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><p>Hali sotuv amalga oshirilmagan</p></div>`;
    } else {
      el.innerHTML = `<div class="log-list">${logs.map(renderLogItem).join('')}</div>`;
    }
  }

  function bindShopForm() {
    document.getElementById('btn-sell').addEventListener('click', () => {
      const productId = document.getElementById('sell-product').value;
      const qty = document.getElementById('sell-qty').value;
      const result = App.sellProduct(productId, qty);
      toast(result.msg, result.ok ? 'success' : 'error');
      if (result.ok) {
        document.getElementById('sell-qty').value = '';
        renderShopInventory();
        renderSaleLogs();
      }
    });
  }

  // ─── REPORTS ──────────────────────────────────────────────────────────────

  function renderReports() {
    const summary = App.getReportSummary();

    document.getElementById('rpt-produced').textContent = summary.totalProduced;
    document.getElementById('rpt-transferred').textContent = summary.totalTransferred;
    document.getElementById('rpt-sold').textContent = summary.totalSold;
    document.getElementById('rpt-today-sold').textContent = summary.todaySold;
    document.getElementById('rpt-today-produced').textContent = summary.todayProduced;

    // Sales chart
    const chartEl = document.getElementById('sales-chart');
    const salesData = summary.salesByProduct;
    const entries = Object.entries(salesData);

    if (entries.length === 0) {
      chartEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Sotuv ma'lumotlari yo'q</p></div>`;
    } else {
      const max = Math.max(...entries.map(([,v]) => v));
      chartEl.innerHTML = entries.map(([name, val]) => `
        <div class="chart-bar-row">
          <div class="chart-bar-label" title="${name}">${name}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${Math.round((val / max) * 100)}%"></div>
          </div>
          <div class="chart-bar-val">${val}</div>
        </div>
      `).join('');
    }

    // All logs
    const allLogs = Storage.getRecentLogs(30);
    const logsEl = document.getElementById('all-logs');
    if (allLogs.length === 0) {
      logsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Hali hech qanday harakat yo'q</p></div>`;
    } else {
      logsEl.innerHTML = `<div class="log-list">${allLogs.map(renderLogItem).join('')}</div>`;
    }
  }

  // ─── Log Item ─────────────────────────────────────────────────────────────

  function renderLogItem(log) {
    const arrow = log.source === log.destination ? '' : `<span style="color:var(--text3);font-size:11px">${log.source} → ${log.destination}</span>`;
    return `<div class="log-item">
      ${logBadge(log.type)}
      <div class="log-main">${log.productName}</div>
      <span class="log-qty">×${log.quantity}</span>
      ${arrow}
      <span class="log-date">${formatDate(log.date)}</span>
    </div>`;
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  function bindReset() {
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm("Barcha ma'lumotlar o'chiriladi. Davom etasizmi?")) {
        Storage.resetAll();
        toast("✅ Ma'lumotlar tozalandi.", 'success');
        navigateTo('dashboard');
      }
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    Storage.seed();
    initNav();
    bindWorkshopForm();
    bindTransferForm();
    bindShopForm();
    bindReset();
    navigateTo('dashboard');

    // Populate selects
    document.getElementById('produce-product').innerHTML = productSelectOptions();
    document.getElementById('material-type').innerHTML = materialSelectOptions();
    document.getElementById('transfer-product').innerHTML = productSelectOptions();
    document.getElementById('sell-product').innerHTML = productSelectOptions();
  }

  return { init, toast, navigateTo };
})();

// Boot
document.addEventListener('DOMContentLoaded', UI.init);
