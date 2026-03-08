/**
 * WORKER.JS — BiznesApp v4
 * Worker (ishchi) role UI
 * Only: tasks, production, ws-inventory, materials
 * NO: shop, sales, transfers, reports, financials
 */

var $ = function(sel, ctx) { return (ctx || document).querySelector(sel); };
var $$ = function(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); };
var currentPage = 'w-dashboard';
var workerGroup = null; // { id, name }

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, type) {
  var c = $('#toast-container');
  var el = document.createElement('div');
  el.className = 'toast t-' + (type || 'success');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function () { el.remove(); }, 3800);
}

// ── FORMAT ────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}
function fmtNum(n) { return Number(n || 0).toLocaleString('uz-UZ'); }
function fmtMoney(n) { return fmtNum(n) + " so'm"; }

function deadlineStatus(dl) {
  if (!dl) return '';
  var d = Math.ceil((new Date(dl) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return d < 0 ? 'overdue' : d <= 3 ? 'due-soon' : '';
}
function qtyClass(q) { return q === 0 ? 'qty-empty' : q <= 5 ? 'qty-warn' : 'qty-ok'; }

// ── MODAL ─────────────────────────────────────────────────────
function openModal(html) {
  closeModal();
  var overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal">' + html + '</div>';
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() { var e = $('#modal-overlay'); if (e) e.remove(); }
function mHead(title) {
  return '<div class="modal-header"><div class="modal-title">' + title + '</div>' +
    '<button class="modal-close" onclick="closeModal()">✕</button></div>';
}
function mActions(cancelLbl, okLbl, fn) {
  return '<div class="modal-actions">' +
    '<button class="btn btn-ghost btn-full" onclick="closeModal()">' + cancelLbl + '</button>' +
    '<button class="btn btn-primary btn-full" onclick="' + fn + '">' + okLbl + '</button>' +
    '</div>';
}

// ── NAVIGATION ────────────────────────────────────────────────
function navigate(page) {
  $$('.w-nav-item').forEach(function (n) { n.classList.remove('active'); });
  $$('.w-page').forEach(function (p) { p.classList.remove('active'); });
  var navEl = $('.w-nav-item[data-page="' + page + '"]');
  var pageEl = $('#page-' + page);
  if (navEl) navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');
  currentPage = page;
  updateTopbar(page);
  renderPage(page);
}

function updateTopbar(page) {
  var meta = {
    'w-dashboard': { name: '🏠 Dashboard', sub: workerGroup ? workerGroup.name + ' — umumiy ko\'rinish' : '' },
    'w-tasks':     { name: '📋 Topshiriqlar', sub: 'Guruhingizning topshiriqlari' },
    'w-workshop':  { name: '🔨 Seh inventari', sub: 'Tayyor mahsulotlar miqdori' },
    'w-materials': { name: '🧵 Materiallar', sub: 'Xom ashyo va materiallar' },
  };
  var m = meta[page] || { name: page, sub: '' };
  var nameEl = $('#topbar-name');
  var subEl  = $('#topbar-sub');
  if (nameEl) nameEl.textContent = m.name;
  if (subEl)  subEl.textContent  = m.sub;
}

function renderPage(page) {
  var map = {
    'w-dashboard': renderWorkerDashboard,
    'w-tasks':     renderTasks,
    'w-workshop':  renderWsInventory,
    'w-materials': renderMaterials,
  };
  if (map[page]) map[page]();
}

// ── TABS ──────────────────────────────────────────────────────
function initTabs(sel) {
  $$(sel + ' .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var pane   = tab.dataset.pane;
      var parent = tab.closest('.tabs').parentElement;
      parent.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      parent.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var pEl = parent.querySelector('#' + pane);
      if (pEl) pEl.classList.add('active');
    });
  });
}

// ══════════════════════════════════════════════════════════════
// WORKER DASHBOARD
// ══════════════════════════════════════════════════════════════
function renderWorkerDashboard() {
  var groupId  = workerGroup ? workerGroup.id : null;
  var allTasks = Storage.getTasks();
  var myTasks  = groupId ? allTasks.filter(function (t) { return t.groupId === groupId; }) : allTasks;
  var active   = myTasks.filter(function (t) { return t.status === 'active'; });
  var done     = myTasks.filter(function (t) { return t.status === 'completed'; });
  var totalProd = myTasks.reduce(function (s, t) { return s + t.produced; }, 0);

  var el = $('#w-dash-stats');
  if (el) el.innerHTML =
    '<div class="stat"><div class="stat-icon si-blue">📋</div><div><div class="stat-val">' + fmtNum(active.length) + '</div><div class="stat-lbl">Faol topshiriqlar</div></div></div>' +
    '<div class="stat"><div class="stat-icon si-green">✅</div><div><div class="stat-val">' + fmtNum(done.length) + '</div><div class="stat-lbl">Bajarilgan</div></div></div>' +
    '<div class="stat"><div class="stat-icon si-amber">🔨</div><div><div class="stat-val">' + fmtNum(totalProd) + '</div><div class="stat-lbl">Jami ishlab chiqargan</div></div></div>';

  // Active tasks preview
  var listEl = $('#w-dash-active');
  if (!listEl) return;
  if (active.length === 0) {
    listEl.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>Hozircha faol topshiriq yo\'q</p></div>';
    return;
  }
  listEl.innerHTML = active.slice(0, 5).map(function (t) {
    var prod = Storage.getProductById(t.productId);
    var pct  = t.quantity > 0 ? Math.round((t.produced / t.quantity) * 100) : 0;
    return '<div class="task-card" style="margin-bottom:10px">' +
      '<div class="task-header">' +
        '<div class="task-product">' + (prod ? prod.icon : '📦') + ' ' + (prod ? prod.name : '') + '</div>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-sm btn-primary" onclick="showProduceModal(\'' + t.id + '\')">🔨 Kiritish</button>' +
        '</div>' +
      '</div>' +
      '<div class="task-progress-label"><span>Bajarilish</span><span>' + pct + '%</span></div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div style="font-size:12px;color:var(--ink3);margin-top:6px">' +
        fmtNum(t.produced) + ' / ' + fmtNum(t.quantity) + ' ta' +
        (t.deadline ? ' &nbsp;·&nbsp; Muddati: <strong class="' + deadlineStatus(t.deadline) + '">' + fmtDate(t.deadline) + '</strong>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════
function renderTasks() {
  var groupId = workerGroup ? workerGroup.id : null;
  var tasks   = Storage.getTasks();
  var mine    = groupId ? tasks.filter(function (t) { return t.groupId === groupId; }) : tasks;

  var sorted = mine.slice().sort(function (a, b) {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  var el = $('#w-tasks-list');
  if (!el) return;

  if (sorted.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>Hali topshiriq yo\'q. Admin topshiriq berishi kutilmoqda.</p></div>';
    return;
  }
  el.innerHTML = sorted.map(renderTaskCard).join('');
}

function renderTaskCard(t) {
  var prod  = Storage.getProductById(t.productId);
  var pct   = t.quantity > 0 ? Math.round((t.produced / t.quantity) * 100) : 0;
  var dlCls = deadlineStatus(t.deadline);
  var done  = t.status === 'completed';

  var html = '<div class="task-card' + (done ? ' completed' : '') + '">' +
    '<div class="task-header">' +
      '<div class="task-product">' + (prod ? prod.icon : '📦') + ' ' + (prod ? prod.name : "Noma'lum") + '</div>' +
      (done ? '<span class="badge badge-green">✅ Bajarildi</span>' : '') +
    '</div>' +
    '<div class="task-meta">' +
      '<div class="task-meta-item">📅 <strong class="' + dlCls + '">' + (t.deadline ? fmtDate(t.deadline) : 'Muddatsiz') + '</strong></div>' +
      '<div class="task-meta-item">📦 <strong>' + fmtNum(t.produced) + ' / ' + fmtNum(t.quantity) + ' ta</strong></div>' +
      (t.note ? '<div class="task-meta-item">📝 ' + t.note + '</div>' : '') +
    '</div>' +
    '<div class="task-progress-label"><span>Bajarilish</span><span>' + pct + '%</span></div>' +
    '<div class="progress-bar"><div class="progress-fill' + (done ? ' complete' : '') + '" style="width:' + pct + '%"></div></div>';

  if (!done) {
    html += '<div class="task-actions">' +
      '<button class="btn btn-primary" onclick="showProduceModal(\'' + t.id + '\')">🔨 Ishlab chiqarildi</button>' +
      '<span style="font-size:12px;color:var(--ink3);margin-left:8px">Qoldi: ' + fmtNum(t.quantity - t.produced) + ' ta</span>' +
    '</div>';
  }
  return html + '</div>';
}

function showProduceModal(taskId) {
  var task = Storage.getTaskById(taskId);
  if (!task) return;
  var prod      = Storage.getProductById(task.productId);
  var remaining = task.quantity - task.produced;
  openModal(
    mHead('🔨 Ishlab chiqarish — ' + (prod ? prod.name : '')) +
    '<div class="info-box" style="background:var(--blue-lt)">' +
      'Topshiriq: <strong>' + fmtNum(task.quantity) + '</strong> ta &nbsp;|&nbsp; ' +
      'Bajarildi: <strong>' + fmtNum(task.produced) + '</strong> ta &nbsp;|&nbsp; ' +
      'Qoldi: <strong style="color:var(--blue)">' + fmtNum(remaining) + '</strong> ta' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Nechta ishlab chiqarildi? *</label>' +
      '<input type="number" id="prod-qty" min="1" max="' + remaining + '" placeholder="' + remaining + '"/></div>' +
    mActions('Bekor', '✅ Tasdiqlash', 'submitProduce(\'' + taskId + '\')')
  );
}
function submitProduce(taskId) {
  var qty = document.getElementById('prod-qty').value;
  if (!qty || parseInt(qty) <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  var r = Storage.recordProduction(taskId, qty);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ ' + fmtNum(qty) + ' ta seh inventariga qo\'shildi');
  closeModal();
  renderTasks();
  if (currentPage === 'w-dashboard') renderWorkerDashboard();
  if (currentPage === 'w-workshop')  renderWsInventory();
}

// ══════════════════════════════════════════════════════════════
// WORKSHOP INVENTORY (read + adjust)
// ══════════════════════════════════════════════════════════════
function renderWsInventory() {
  var inv      = Storage.getWsInventory();
  var products = Storage.getProducts();
  var el = $('#w-ws-body');
  if (!el) return;
  el.innerHTML = products.map(function (p) {
    var qty = inv[p.id] || 0;
    return '<tr>' +
      '<td style="font-size:18px">' + p.icon + '</td>' +
      '<td><strong>' + p.name + '</strong></td>' +
      '<td><span class="qty-pill ' + qtyClass(qty) + '">' + fmtNum(qty) + '</span></td>' +
    '</tr>';
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// MATERIALS
// ══════════════════════════════════════════════════════════════
function renderMaterials() {
  var inv  = Storage.getMatInventory();
  var mats = Storage.getMaterials();
  var el   = $('#w-mat-body');
  if (!el) return;
  el.innerHTML = mats.map(function (m) {
    var qty = inv[m.id] || 0;
    return '<tr>' +
      '<td style="font-size:18px">' + m.icon + '</td>' +
      '<td><strong>' + m.name + '</strong></td>' +
      '<td><span class="badge badge-grey">' + m.unit + '</span></td>' +
      '<td><span class="qty-pill ' + qtyClass(qty) + '">' + fmtNum(qty) + '</span></td>' +
      '<td><button class="btn btn-sm btn-amber" onclick="showAddMaterialModal(\'' + m.id + '\',\'' + m.name + '\')">➕ Qo\'shish</button></td>' +
    '</tr>';
  }).join('');
}

function showAddMaterialModal(matId, matName) {
  openModal(
    mHead('➕ ' + matName + ' qo\'shish') +
    '<div class="form-group"><label class="form-label">Miqdor *</label>' +
      '<input type="number" id="mat-qty" min="1" placeholder="100"/></div>' +
    mActions('Bekor', '➕ Qo\'shish', 'submitAddMaterial(\'' + matId + '\')')
  );
}
function submitAddMaterial(matId) {
  var qty = parseInt(document.getElementById('mat-qty').value);
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  Storage.addMaterial(matId, qty);
  toast('✅ Material qo\'shildi'); closeModal(); renderMaterials();
}

// ── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
  var el = $('#topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('uz-UZ',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── LOGOUT ────────────────────────────────────────────────────
function logoutWorker() {
  if (confirm('Tizimdan chiqmoqchimisiz?')) {
    Auth.logout();
    window.location.href = 'login.html';
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  if (!Auth.requireWorker()) return;

  Storage.seed();
  workerGroup = Auth.getWorkerGroup();

  // Show group name in topbar
  var userEl = $('#topbar-user');
  if (userEl && workerGroup) userEl.textContent = '👷 ' + workerGroup.name;

  // Show group name in sidebar
  var grpEl = $('#worker-group-name');
  if (grpEl && workerGroup) grpEl.textContent = workerGroup.name;

  $$('.w-nav-item').forEach(function (item) {
    item.addEventListener('click', function () { navigate(item.dataset.page); });
  });

  updateClock();
  setInterval(updateClock, 60000);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  navigate('w-dashboard');
});
