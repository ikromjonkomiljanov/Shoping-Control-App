// APP.JS v3 — BiznesApp UI Layer

var $ = function(sel, ctx) { return (ctx||document).querySelector(sel); };
var $$ = function(sel, ctx) { return Array.from((ctx||document).querySelectorAll(sel)); };
var currentPage = 'dashboard';

// ─── TOAST ────────────────────────────────────────────────────
function toast(msg, type) {
  var c = $('#toast-container');
  var el = document.createElement('div');
  el.className = 'toast t-' + (type||'success');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function(){ el.remove(); }, 3800);
}

// ─── FORMAT ───────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('uz-UZ', {day:'2-digit', month:'2-digit', year:'numeric'});
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
}
function fmtNum(n) { return Number(n||0).toLocaleString('uz-UZ'); }
function fmtMoney(n) { return fmtNum(n) + " so'm"; }

function deadlineStatus(dl) {
  if (!dl) return '';
  var d = Math.ceil((new Date(dl) - new Date().setHours(0,0,0,0)) / 86400000);
  return d < 0 ? 'overdue' : d <= 3 ? 'due-soon' : '';
}
function qtyClass(q) { return q === 0 ? 'qty-empty' : q <= 5 ? 'qty-warn' : 'qty-ok'; }

function logTypeBadge(type) {
  var map = {
    production:   ['badge-blue',   '🔨 Ishlab chiqarildi'],
    transfer:     ['badge-purple', '📦 Yuborildi'],
    sale:         ['badge-green',  '💰 Sotildi'],
    material_add: ['badge-amber',  '➕ Material']
  };
  var item = map[type] || ['badge-grey', type];
  return '<span class="badge ' + item[0] + '">' + item[1] + '</span>';
}

// ─── MODAL ────────────────────────────────────────────────────
function openModal(html, wide) {
  closeModal();
  var overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal' + (wide ? ' modal-wide' : '') + '">' + html + '</div>';
  overlay.addEventListener('click', function(e){ if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
function closeModal() {
  var e = $('#modal-overlay');
  if (e) e.remove();
}
function mHead(title) {
  return '<div class="modal-header"><div class="modal-title">' + title + '</div>' +
         '<button class="modal-close" onclick="closeModal()">✕</button></div>';
}
function mActions(cancelLabel, submitLabel, submitFn) {
  cancelLabel = cancelLabel || 'Bekor';
  return '<div class="modal-actions">' +
    '<button class="btn btn-ghost btn-full" onclick="closeModal()">' + cancelLabel + '</button>' +
    '<button class="btn btn-primary btn-full" onclick="' + submitFn + '">' + submitLabel + '</button>' +
    '</div>';
}

// ─── COLOR PICKER ─────────────────────────────────────────────
function colorPickerHtml(selected) {
  var colors = ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0d9488','#db2777','#ea580c'];
  var html = '<div class="color-picker">';
  colors.forEach(function(c) {
    html += '<div class="color-swatch' + (c === selected ? ' selected' : '') + '" ' +
            'data-color="' + c + '" style="background:' + c + '" onclick="pickColor(this)"></div>';
  });
  html += '<input type="hidden" id="color-val" value="' + (selected || colors[0]) + '"></div>';
  return html;
}
function pickColor(el) {
  var picker = el.closest('.color-picker');
  picker.querySelectorAll('.color-swatch').forEach(function(s){ s.classList.remove('selected'); });
  el.classList.add('selected');
  picker.querySelector('#color-val').value = el.dataset.color;
}

// ─── NAVIGATION ───────────────────────────────────────────────
function navigate(page) {
  $$('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  $$('.page').forEach(function(p){ p.classList.remove('active'); });
  var navEl = $('.nav-item[data-page="' + page + '"]');
  var pageEl = $('#page-' + page);
  if (navEl) navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');
  currentPage = page;
  updateTopbar(page);
  renderPage(page);
}

function updateTopbar(page) {
  var meta = {
    dashboard: {name:'🏠 Dashboard',       sub:"Umumiy ko'rinish"},
    products:  {name:'📦 Mahsulotlar',      sub:"Global mahsulot ro'yxati"},
    workshop:  {name:'🔨 Seh',              sub:'Ishlab chiqarish va inventar'},
    groups:    {name:'👥 Guruhlar',          sub:'Ishchilar guruhlari va topshiriqlar'},
    shop:      {name:"🏪 Do'kon",           sub:'Sotuv va inventar'},
    transfer:  {name:'🚚 Yuborish',          sub:"Sehdan do'konga yuborish"},
    reports:   {name:'📊 Hisobotlar',        sub:'Tahlil va statistika'},
    archive:   {name:'🗄 Arxiv',            sub:'Oylik hisobot arxivi'}
  };
  var m = meta[page] || {name: page, sub: ''};
  $('#topbar-name').textContent = m.name;
  $('#topbar-sub').textContent  = m.sub;
}

function renderPage(page) {
  var map = {
    dashboard: renderDashboard,
    products:  renderProducts,
    workshop:  renderWorkshop,
    groups:    renderGroups,
    shop:      renderShop,
    transfer:  renderTransfer,
    reports:   renderReports,
    archive:   renderArchive
  };
  if (map[page]) map[page]();
}

// ─── TABS ─────────────────────────────────────────────────────
function initTabs(pageSelector) {
  $$(pageSelector + ' .tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      var pane = tab.dataset.pane;
      var parent = tab.closest('.tabs').parentElement;
      parent.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
      parent.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      var paneEl = parent.querySelector('#' + pane);
      if (paneEl) paneEl.classList.add('active');
    });
  });
}

// ─── LOG ROW ──────────────────────────────────────────────────
function renderLogRow(l, showEdit) {
  var priceStr = (l.totalPrice > 0) ? ' · ' + fmtMoney(l.totalPrice) : '';
  var editMark = l.editedAt ? ' <span style="font-size:10px;color:var(--amber)">✏</span>' : '';
  var actions = '';
  if (showEdit && l.type === 'sale') {
    actions = '<div style="display:flex;gap:4px;margin-left:6px">' +
      '<button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="showEditSaleModal(\'' + l.id + '\')">✏</button>' +
      '<button class="btn btn-sm btn-red"   style="padding:3px 7px" onclick="confirmDeleteSale(\'' + l.id + '\')">🗑</button>' +
      '</div>';
  }
  return '<div class="log-item">' +
    '<div class="log-type-dot dot-' + l.type + '"></div>' +
    '<div style="flex:1">' +
      '<div class="log-main">' + (l.productName||'—') + editMark + '</div>' +
      '<div class="log-sub">' + (l.source||'') + ' → ' + (l.destination||'') + priceStr + '</div>' +
    '</div>' +
    '<div class="log-qty">×' + fmtNum(l.quantity) + '</div>' +
    '<div class="log-date">' + fmtDate(l.date) + ' ' + fmtTime(l.date) + '</div>' +
    actions +
  '</div>';
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderDashboard() {
  var r = Storage.getReportSummary();
  var wsInv   = Storage.getWsInventory();
  var shopInv = Storage.getShopInventory();
  var tasks   = Storage.getTasks().filter(function(t){ return t.status === 'active'; });
  var wsTotal   = Object.values(wsInv).reduce(function(s,v){ return s+v; }, 0);
  var shopTotal = Object.values(shopInv).reduce(function(s,v){ return s+v; }, 0);

  $('#dash-produced').textContent    = fmtNum(r.sum('production'));
  $('#dash-transferred').textContent = fmtNum(r.sum('transfer'));
  $('#dash-sold').textContent        = fmtNum(r.sum('sale'));
  $('#dash-revenue').textContent     = fmtMoney(r.revenue);
  $('#dash-ws-stock').textContent    = fmtNum(wsTotal);
  $('#dash-shop-stock').textContent  = fmtNum(shopTotal);
  $('#dash-active-tasks').textContent= tasks.length;

  var logs = Storage.getRecentLogs(8);
  var logEl = $('#dash-logs');
  if (logs.length === 0) {
    logEl.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>Hali hech qanday harakat amalga oshirilmagan</p></div>';
  } else {
    logEl.innerHTML = '<div class="log-feed">' + logs.map(function(l){ return renderLogRow(l, false); }).join('') + '</div>';
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════
function renderProducts() {
  var products = Storage.getProducts();
  $('#products-count').textContent = products.length;
  $('#products-tbody').innerHTML = products.map(function(p) {
    return '<tr>' +
      '<td style="font-size:20px">' + p.icon + '</td>' +
      '<td><strong>' + p.name + '</strong></td>' +
      '<td><span class="badge badge-grey">' + p.unit + '</span></td>' +
      '<td><span class="badge badge-blue" style="font-size:11px">ID: ' + p.id + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm btn-ghost" onclick="showEditProductModal(\'' + p.id + '\')">✏ Tahrirlash</button> ' +
        '<button class="btn btn-sm btn-red"   onclick="confirmDeleteProduct(\'' + p.id + '\')">🗑</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function showAddProductModal() {
  openModal(
    mHead('➕ Yangi mahsulot') +
    '<div class="form-group"><label class="form-label">Mahsulot nomi *</label>' +
      '<input type="text" id="np-name" placeholder="Masalan: Jaket"/></div>' +
    '<div class="form-row cols-2">' +
      '<div><label class="form-label">Emoji</label><input type="text" id="np-icon" placeholder="🧥" maxlength="4"/></div>' +
      '<div><label class="form-label">Birlik</label><select id="np-unit">' +
        '<option value="dona">dona</option><option value="juft">juft</option><option value="metr">metr</option>' +
      '</select></div>' +
    '</div>' +
    mActions('Bekor', '✅ Qo\'shish', 'submitAddProduct()')
  );
}
function submitAddProduct() {
  var name = $('#np-name').value.trim();
  var icon = $('#np-icon').value.trim() || '📦';
  var unit = $('#np-unit').value;
  if (!name) { toast('Mahsulot nomini kiriting', 'error'); return; }
  var r = Storage.createProduct(name, icon, unit);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ "' + name + '" qo\'shildi');
  closeModal(); renderProducts();
}

function showEditProductModal(id) {
  var p = Storage.getProductById(id);
  if (!p) return;
  openModal(
    mHead('✏ Mahsulotni tahrirlash') +
    '<div class="form-group"><label class="form-label">Nomi *</label>' +
      '<input type="text" id="ep-name" value="' + p.name + '"/></div>' +
    '<div class="form-row cols-2">' +
      '<div><label class="form-label">Emoji</label><input type="text" id="ep-icon" value="' + p.icon + '" maxlength="4"/></div>' +
      '<div><label class="form-label">Birlik</label><select id="ep-unit">' +
        '<option value="dona"' + (p.unit==='dona'?' selected':'') + '>dona</option>' +
        '<option value="juft"' + (p.unit==='juft'?' selected':'') + '>juft</option>' +
        '<option value="metr"' + (p.unit==='metr'?' selected':'') + '>metr</option>' +
      '</select></div>' +
    '</div>' +
    mActions('Bekor', '💾 Saqlash', 'submitEditProduct(\'' + id + '\')')
  );
}
function submitEditProduct(id) {
  var name = $('#ep-name').value.trim();
  var icon = $('#ep-icon').value.trim();
  var unit = $('#ep-unit').value;
  if (!name) { toast('Nomini kiriting', 'error'); return; }
  var r = Storage.updateProduct(id, name, icon, unit);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Mahsulot yangilandi'); closeModal(); renderProducts();
}
function confirmDeleteProduct(id) {
  var p = Storage.getProductById(id);
  if (!p) return;
  if (!confirm('"' + p.name + '" mahsulotini o\'chirasizmi?')) return;
  var r = Storage.deleteProduct(id);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('🗑 O\'chirildi'); renderProducts();
}

// ═══════════════════════════════════════════════════════════════
// WORKSHOP
// ═══════════════════════════════════════════════════════════════
function renderWorkshop() {
  renderWsInventory();
  renderMaterialInventory();
  initTabs('#page-workshop');
}

function renderWsInventory() {
  var inv = Storage.getWsInventory();
  var products = Storage.getProducts();
  $('#ws-inventory-body').innerHTML = products.map(function(p) {
    var qty = inv[p.id] || 0;
    return '<tr>' +
      '<td style="font-size:18px">' + p.icon + '</td>' +
      '<td><strong>' + p.name + '</strong></td>' +
      '<td><span class="qty-pill ' + qtyClass(qty) + '">' + fmtNum(qty) + '</span></td>' +
      '<td><button class="btn btn-sm btn-ghost" onclick="showAdjustInvModal(\'ws\',\'' + p.id + '\',\'' + p.name + '\',' + qty + ')">✏ Tuzatish</button></td>' +
    '</tr>';
  }).join('');
}

function renderMaterialInventory() {
  var inv  = Storage.getMatInventory();
  var mats = Storage.getMaterials();
  $('#mat-inventory-body').innerHTML = mats.map(function(m) {
    var qty = inv[m.id] || 0;
    return '<tr>' +
      '<td style="font-size:18px">' + m.icon + '</td>' +
      '<td><strong>' + m.name + '</strong></td>' +
      '<td><span class="badge badge-grey">' + m.unit + '</span></td>' +
      '<td><span class="qty-pill ' + qtyClass(qty) + '">' + fmtNum(qty) + '</span></td>' +
      '<td style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-amber" onclick="showAddMaterialModal(\'' + m.id + '\',\'' + m.name + '\')">➕ Qo\'shish</button>' +
        '<button class="btn btn-sm btn-ghost" onclick="showAdjustMatModal(\'' + m.id + '\',\'' + m.name + '\',' + qty + ')">✏</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function showAddMaterialModal(matId, matName) {
  openModal(
    mHead('➕ ' + matName + ' qo\'shish') +
    '<div class="form-group"><label class="form-label">Miqdor</label>' +
      '<input type="number" id="mat-qty" min="1" placeholder="100"/></div>' +
    mActions('Bekor', '➕ Qo\'shish', 'submitAddMaterial(\'' + matId + '\')')
  );
}
function submitAddMaterial(matId) {
  var qty = parseInt($('#mat-qty').value);
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  Storage.addMaterial(matId, qty);
  toast('✅ Material qo\'shildi'); closeModal(); renderWorkshop();
}

function showAdjustMatModal(matId, matName, currentQty) {
  openModal(
    mHead('✏ ' + matName + ' miqdori') +
    '<div class="info-box">Hozirgi miqdor: <strong>' + fmtNum(currentQty) + '</strong></div>' +
    '<div class="form-group"><label class="form-label">Yangi miqdor</label>' +
      '<input type="number" id="adj-mat-qty" min="0" value="' + currentQty + '"/></div>' +
    mActions('Bekor', '💾 Saqlash', 'submitAdjustMat(\'' + matId + '\')')
  );
}
function submitAdjustMat(matId) {
  Storage.setMatInventoryQty(matId, $('#adj-mat-qty').value);
  toast('✅ Material yangilandi'); closeModal(); renderWorkshop();
}

function showAdjustInvModal(type, productId, productName, currentQty) {
  var title = type === 'ws' ? 'Seh inventari' : "Do'kon inventari";
  openModal(
    mHead('✏ ' + title + ' — ' + productName) +
    '<div class="info-box">Hozirgi miqdor: <strong>' + fmtNum(currentQty) + '</strong></div>' +
    '<div class="form-group"><label class="form-label">Yangi miqdor</label>' +
      '<input type="number" id="adj-inv-qty" min="0" value="' + currentQty + '"/></div>' +
    mActions('Bekor', '💾 Saqlash', 'submitAdjustInv(\'' + type + '\',\'' + productId + '\')')
  );
}
function submitAdjustInv(type, productId) {
  var qty = $('#adj-inv-qty').value;
  if (type === 'ws') Storage.setWsInventoryQty(productId, qty);
  else Storage.setShopInventoryQty(productId, qty);
  toast('✅ Inventar yangilandi'); closeModal();
  if (type === 'ws') renderWorkshop(); else renderShop();
}

// ═══════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════
function renderGroups() {
  renderGroupList();
  renderTaskList();
  initTabs('#page-groups');
}

function renderGroupList() {
  var groups = Storage.getGroups();
  var tasks  = Storage.getTasks();
  var el = $('#groups-list');
  if (groups.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><p>Hali guruh yo\'q</p></div>';
    return;
  }
  el.innerHTML = groups.map(function(g) {
    var gt     = tasks.filter(function(t){ return t.groupId === g.id; });
    var active = gt.filter(function(t){ return t.status === 'active'; }).length;
    var done   = gt.filter(function(t){ return t.status === 'completed'; }).length;
    return '<div class="group-card">' +
      '<div class="group-color-ring" style="background:' + g.color + '">' + g.name.charAt(0) + '</div>' +
      '<div style="flex:1">' +
        '<div class="group-name">' + g.name + '</div>' +
        '<div class="group-stats">' +
          (active > 0 ? '<span class="badge badge-blue">' + active + ' faol</span>&nbsp;' : '') +
          (done   > 0 ? '<span class="badge badge-green">' + done + ' bajarildi</span>' : '') +
          (gt.length === 0 ? '<span class="badge badge-grey">Topshiriq yo\'q</span>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-primary" onclick="showAssignTaskModal(\'' + g.id + '\',\'' + g.name + '\')">📋 Topshiriq</button>' +
        '<button class="btn btn-sm btn-amber"   onclick="showGroupPasswordModal(\'' + g.id + '\')">🔑</button>' +
        '<button class="btn btn-sm btn-ghost"   onclick="showEditGroupModal(\'' + g.id + '\')">✏</button>' +
        '<button class="btn btn-sm btn-red"     onclick="confirmDeleteGroup(\'' + g.id + '\')">🗑</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderTaskList() {
  var tasks = Storage.getTasks();
  var el = $('#tasks-list');
  if (tasks.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>Hali topshiriq yo\'q</p></div>';
    return;
  }
  var sorted = tasks.slice().sort(function(a, b) {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return  1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  el.innerHTML = sorted.map(renderTaskCard).join('');
}

function renderTaskCard(t) {
  var prod  = Storage.getProductById(t.productId);
  var grp   = Storage.getGroupById(t.groupId);
  var pct   = t.quantity > 0 ? Math.round((t.produced / t.quantity) * 100) : 0;
  var dlCls = deadlineStatus(t.deadline);
  var done  = t.status === 'completed';

  var html = '<div class="task-card' + (done ? ' completed' : '') + '">' +
    '<div class="task-header">' +
      '<div class="task-product">' + (prod ? prod.icon : '📦') + ' ' + (prod ? prod.name : "Noma'lum") + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        (grp ? '<span class="task-group-tag" style="background:' + grp.color + '">' + grp.name + '</span>' : '') +
        (!done ? '<button class="btn btn-sm btn-ghost" style="padding:3px 7px" onclick="showEditTaskModal(\'' + t.id + '\')">✏</button>' : '') +
        '<button class="btn btn-sm btn-red" style="padding:3px 7px" onclick="confirmDeleteTask(\'' + t.id + '\')">🗑</button>' +
      '</div>' +
    '</div>' +
    '<div class="task-meta">' +
      '<div class="task-meta-item">📅 <strong class="' + dlCls + '">' + (t.deadline ? fmtDate(t.deadline) : 'Muddatsiz') + '</strong></div>' +
      '<div class="task-meta-item">💰 <strong>' + fmtMoney(t.pricePerItem) + '/dona</strong></div>' +
      '<div class="task-meta-item">📦 <strong>' + fmtNum(t.produced) + ' / ' + fmtNum(t.quantity) + '</strong></div>' +
      (t.note ? '<div class="task-meta-item">📝 ' + t.note + '</div>' : '') +
    '</div>' +
    '<div class="task-progress-label"><span>Bajarilish</span><span>' + pct + '%</span></div>' +
    '<div class="progress-bar"><div class="progress-fill' + (done ? ' complete' : '') + '" style="width:' + pct + '%"></div></div>';

  if (!done) {
    html += '<div class="task-actions">' +
      '<button class="btn btn-sm btn-primary" onclick="showProduceModal(\'' + t.id + '\')">🔨 Ishlab chiqarildi</button>' +
      '<span style="font-size:12px;color:var(--ink3);margin-left:6px">Qoldi: ' + fmtNum(t.quantity - t.produced) + ' ta</span>' +
    '</div>';
  } else {
    html += '<div style="margin-top:10px"><span class="badge badge-green">✅ Bajarildi</span></div>';
  }
  return html + '</div>';
}

function showCreateGroupModal() {
  openModal(
    mHead('👥 Yangi guruh yaratish') +
    '<div class="form-group"><label class="form-label">Guruh nomi *</label>' +
      '<input type="text" id="grp-name" placeholder="Masalan: D Guruh"/></div>' +
    '<div class="form-group"><label class="form-label">Rang</label>' +
      colorPickerHtml('#2563eb') + '</div>' +
    mActions('Bekor', '✅ Yaratish', 'submitCreateGroup()')
  );
}
function submitCreateGroup() {
  var name  = $('#grp-name').value.trim();
  var color = $('#color-val').value;
  if (!name) { toast('Guruh nomini kiriting', 'error'); return; }
  var r = Storage.createGroup(name, color);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ "' + name + '" yaratildi'); closeModal(); renderGroups();
}

function showEditGroupModal(id) {
  var g = Storage.getGroupById(id);
  if (!g) return;
  openModal(
    mHead('✏ Guruhni tahrirlash') +
    '<div class="form-group"><label class="form-label">Guruh nomi *</label>' +
      '<input type="text" id="egrp-name" value="' + g.name + '"/></div>' +
    '<div class="form-group"><label class="form-label">Rang</label>' +
      colorPickerHtml(g.color) + '</div>' +
    mActions('Bekor', '💾 Saqlash', 'submitEditGroup(\'' + id + '\')')
  );
}
function submitEditGroup(id) {
  var name  = $('#egrp-name').value.trim();
  var color = $('#color-val').value;
  if (!name) { toast('Nomini kiriting', 'error'); return; }
  var r = Storage.updateGroup(id, name, color);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Guruh yangilandi'); closeModal(); renderGroups();
}
function confirmDeleteGroup(id) {
  var g = Storage.getGroupById(id);
  if (!g) return;
  if (!confirm('"' + g.name + '" guruhini o\'chirasizmi?')) return;
  var r = Storage.deleteGroup(id);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('🗑 Guruh o\'chirildi'); renderGroups();
}

function showAssignTaskModal(groupId, groupName) {
  var products = Storage.getProducts();
  var opts = '<option value="">-- Tanlang --</option>' + products.map(function(p) {
    return '<option value="' + p.id + '">' + p.icon + ' ' + p.name + '</option>';
  }).join('');
  openModal(
    mHead('📋 Topshiriq berish — ' + groupName) +
    '<div class="form-group"><label class="form-label">Mahsulot *</label>' +
      '<select id="task-product">' + opts + '</select></div>' +
    '<div class="form-row cols-2">' +
      '<div><label class="form-label">Miqdor (dona) *</label><input type="number" id="task-qty" min="1" placeholder="50"/></div>' +
      '<div><label class="form-label">Muddati</label><input type="date" id="task-deadline"/></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Narx (1 dona, so\'m)</label>' +
      '<input type="number" id="task-price" min="0" placeholder="200000"/></div>' +
    '<div class="form-group"><label class="form-label">Izoh</label>' +
      '<textarea id="task-note" placeholder="Ixtiyoriy..."></textarea></div>' +
    mActions('Bekor', '📋 Topshiriq berish', 'submitAssignTask(\'' + groupId + '\')')
  );
}
function submitAssignTask(groupId) {
  var productId = $('#task-product').value;
  var qty       = $('#task-qty').value;
  var deadline  = $('#task-deadline').value;
  var price     = $('#task-price').value;
  var note      = $('#task-note').value.trim();
  if (!productId) { toast('Mahsulotni tanlang', 'error'); return; }
  if (!qty || parseInt(qty) <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  var r = Storage.createTask(groupId, productId, qty, deadline, price, note);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Topshiriq berildi'); closeModal(); renderGroups();
}

function showEditTaskModal(id) {
  var t    = Storage.getTaskById(id);
  if (!t) return;
  var prod = Storage.getProductById(t.productId);
  openModal(
    mHead('✏ Topshiriq — ' + (prod ? prod.name : '')) +
    '<div class="info-box">Allaqachon ishlab chiqarilgan: <strong>' + fmtNum(t.produced) + ' ta</strong></div>' +
    '<div class="form-row cols-2">' +
      '<div><label class="form-label">Jami miqdor *</label>' +
        '<input type="number" id="et-qty" min="' + t.produced + '" value="' + t.quantity + '"/></div>' +
      '<div><label class="form-label">Muddati</label>' +
        '<input type="date" id="et-deadline" value="' + (t.deadline||'') + '"/></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Narx (1 dona, so\'m)</label>' +
      '<input type="number" id="et-price" value="' + t.pricePerItem + '"/></div>' +
    '<div class="form-group"><label class="form-label">Izoh</label>' +
      '<textarea id="et-note">' + (t.note||'') + '</textarea></div>' +
    mActions('Bekor', '💾 Saqlash', 'submitEditTask(\'' + id + '\')')
  );
}
function submitEditTask(id) {
  var r = Storage.updateTask(id, {
    quantity:     $('#et-qty').value,
    deadline:     $('#et-deadline').value,
    pricePerItem: $('#et-price').value,
    note:         $('#et-note').value.trim()
  });
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Topshiriq yangilandi'); closeModal(); renderGroups();
}
function confirmDeleteTask(id) {
  var t    = Storage.getTaskById(id);
  if (!t) return;
  var prod = Storage.getProductById(t.productId);
  if (!confirm('"' + (prod ? prod.name : 'Topshiriq') + '" ni o\'chirasizmi?')) return;
  var r = Storage.deleteTask(id);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('🗑 Topshiriq o\'chirildi'); renderGroups();
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
    mActions('Bekor', '🔨 Tasdiqlash', 'submitProduce(\'' + taskId + '\')')
  );
}
function submitProduce(taskId) {
  var qty = $('#prod-qty').value;
  if (!qty || parseInt(qty) <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  var r = Storage.recordProduction(taskId, qty);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ ' + fmtNum(qty) + ' ta seh inventariga qo\'shildi');
  closeModal(); renderGroups();
  if (currentPage === 'workshop') renderWorkshop();
  if (currentPage === 'dashboard') renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER
// ═══════════════════════════════════════════════════════════════
function renderTransfer() {
  var wsInv    = Storage.getWsInventory();
  var products = Storage.getProducts();
  var sel      = $('#transfer-product');
  sel.innerHTML = '<option value="">-- Mahsulot tanlang --</option>';
  products.forEach(function(p) {
    var qty = wsInv[p.id] || 0;
    var opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.icon + ' ' + p.name + ' (' + fmtNum(qty) + ' ta mavjud)';
    if (qty === 0) opt.disabled = true;
    sel.appendChild(opt);
  });
  renderTransferLog();
}

function renderTransferLog() {
  var logs = Storage.getLogsByType('transfer').slice(0, 30);
  var el   = $('#transfer-log');
  if (logs.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🚚</div><p>Hali yuborish amalga oshirilmagan</p></div>';
  } else {
    el.innerHTML = '<div class="log-feed">' + logs.map(function(l){ return renderLogRow(l, false); }).join('') + '</div>';
  }
}

function submitTransfer() {
  var productId = $('#transfer-product').value;
  var qty       = parseInt($('#transfer-qty').value);
  if (!productId) { toast('Mahsulotni tanlang', 'error'); return; }
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  var r = Storage.transferToShop(productId, qty);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  var prod = Storage.getProductById(productId);
  toast('✅ ' + fmtNum(qty) + ' ta ' + prod.name + " do'konga yuborildi");
  $('#transfer-qty').value = '';
  $('#transfer-product').value = '';
  renderTransfer();
  if (currentPage === 'dashboard') renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
// SHOP
// ═══════════════════════════════════════════════════════════════
function renderShop() {
  renderShopInventory();
  populateSellSelect();
  renderSaleLog();
  initTabs('#page-shop');
}

function renderShopInventory() {
  var inv      = Storage.getShopInventory();
  var products = Storage.getProducts();
  var rows = products.map(function(p) {
    var qty = inv[p.id] || 0;
    return '<tr>' +
      '<td style="font-size:18px">' + p.icon + '</td>' +
      '<td><strong>' + p.name + '</strong></td>' +
      '<td><span class="qty-pill ' + qtyClass(qty) + '">' + fmtNum(qty) + '</span></td>' +
      '<td><button class="btn btn-sm btn-ghost" onclick="showAdjustInvModal(\'shop\',\'' + p.id + '\',\'' + p.name + '\',' + qty + ')">✏ Tuzatish</button></td>' +
    '</tr>';
  }).join('');

  var el1 = $('#shop-inventory-body');
  var el2 = $('#shop-inventory-body-full');
  if (el1) el1.innerHTML = rows;
  if (el2) el2.innerHTML = rows;
}

function populateSellSelect() {
  var inv      = Storage.getShopInventory();
  var products = Storage.getProducts();
  var sel      = $('#sell-product');
  sel.innerHTML = '<option value="">-- Mahsulot tanlang --</option>';
  products.forEach(function(p) {
    var qty = inv[p.id] || 0;
    var opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.icon + ' ' + p.name + ' (' + fmtNum(qty) + ' ta mavjud)';
    if (qty === 0) opt.disabled = true;
    sel.appendChild(opt);
  });
}

function renderSaleLog() {
  var logs = Storage.getLogsByType('sale').slice(0, 50);
  var el   = $('#sale-log');
  if (logs.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">💰</div><p>Hali sotuv amalga oshirilmagan</p></div>';
  } else {
    el.innerHTML = '<div class="log-feed">' + logs.map(function(l){ return renderLogRow(l, true); }).join('') + '</div>';
  }
}

function submitSale() {
  var productId    = $('#sell-product').value;
  var qty          = parseInt($('#sell-qty').value);
  var pricePerUnit = parseFloat($('#sell-price').value) || 0;
  var note         = $('#sell-note').value.trim();

  if (!productId) { toast('Mahsulotni tanlang', 'error'); return; }
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }

  var r = Storage.sellProduct(productId, qty, pricePerUnit, note);
  if (!r.ok) { toast(r.msg, 'error'); return; }

  var prod  = Storage.getProductById(productId);
  var total = pricePerUnit * qty;
  toast('✅ ' + fmtNum(qty) + ' ta ' + prod.name + ' sotildi' + (total > 0 ? ' — ' + fmtMoney(total) : ''));
  $('#sell-qty').value    = '';
  $('#sell-price').value  = '';
  $('#sell-note').value   = '';
  renderShop();
  if (currentPage === 'dashboard') renderDashboard();
}

function showEditSaleModal(logId) {
  var l = Storage.getLogById(logId);
  if (!l) return;
  openModal(
    mHead('✏ Sotuvni tahrirlash') +
    '<div class="info-box">' +
      'Mahsulot: <strong>' + l.productName + '</strong> &nbsp;|&nbsp; ' +
      'Sana: <strong>' + fmtDate(l.date) + '</strong>' +
    '</div>' +
    '<div class="form-row cols-2">' +
      '<div><label class="form-label">Miqdor *</label><input type="number" id="es-qty" min="1" value="' + l.quantity + '"/></div>' +
      '<div><label class="form-label">Narx (1 dona, so\'m)</label><input type="number" id="es-price" min="0" value="' + (l.pricePerUnit||0) + '"/></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Izoh</label>' +
      '<input type="text" id="es-note" value="' + (l.note||'') + '"/></div>' +
    mActions('Bekor', '💾 Saqlash', 'submitEditSale(\'' + logId + '\')')
  );
}
function submitEditSale(logId) {
  var qty   = $('#es-qty').value;
  var price = $('#es-price').value;
  var note  = $('#es-note').value.trim();
  if (!qty || parseInt(qty) <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  var r = Storage.editSaleLog(logId, qty, price, note);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Sotuv yangilandi'); closeModal(); renderShop();
  if (currentPage === 'dashboard') renderDashboard();
}

function confirmDeleteSale(logId) {
  var l = Storage.getLogById(logId);
  if (!l) return;
  if (!confirm('"' + l.productName + '" sotuvini o\'chirasizmi?\nInventar qayta tiklanadi.')) return;
  var r = Storage.deleteSaleLog(logId);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('🗑 Sotuv o\'chirildi, inventar tiklandi'); renderShop();
  if (currentPage === 'dashboard') renderDashboard();
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
function renderReports() {
  var r = Storage.getReportSummary();

  $('#rpt-total-produced').textContent    = fmtNum(r.sum('production'));
  $('#rpt-total-transferred').textContent = fmtNum(r.sum('transfer'));
  $('#rpt-total-sold').textContent        = fmtNum(r.sum('sale'));
  $('#rpt-total-revenue').textContent     = fmtMoney(r.revenue);
  $('#rpt-today-sold').textContent        = fmtNum(r.sumToday('sale'));
  $('#rpt-today-produced').textContent    = fmtNum(r.sumToday('production'));
  $('#rpt-today-revenue').textContent     = fmtMoney(r.todayRevenue);

  // Charts
  var sbp = Object.entries(r.salesByProduct).map(function(e) {
    return {label: e[0], val: e[1].qty, sub: fmtMoney(e[1].revenue)};
  });
  renderBarChart('#sales-by-product-chart', sbp, 'bf-green');

  var pbp = Object.entries(r.prodByProduct).map(function(e) {
    return {label: e[0], val: e[1]};
  });
  renderBarChart('#prod-by-product-chart', pbp, 'bf-blue');

  var monthly = Object.entries(r.monthly).sort().map(function(e) {
    return {label: e[0], val: e[1].qty, sub: fmtMoney(e[1].revenue)};
  });
  renderBarChart('#monthly-sales-chart', monthly, 'bf-amber');

  // Full log table
  var logs  = Storage.getLogs();
  var tbody = $('#full-log-tbody');
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">📋</div><p>Yozuvlar yo\'q</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = logs.slice(0, 100).map(function(l) {
    return '<tr>' +
      '<td>' + fmtDate(l.date) + ' <span style="color:var(--ink3);font-size:11px">' + fmtTime(l.date) + '</span></td>' +
      '<td>' + logTypeBadge(l.type) + '</td>' +
      '<td>' + (l.productName||'—') + '</td>' +
      '<td><strong>' + fmtNum(l.quantity) + '</strong></td>' +
      '<td>' + (l.pricePerUnit > 0 ? fmtMoney(l.pricePerUnit) : '—') + '</td>' +
      '<td>' + (l.totalPrice   > 0 ? fmtMoney(l.totalPrice)   : '—') + '</td>' +
      '<td style="font-size:12px;color:var(--ink3)">' + (l.note||'—') + (l.editedAt ? ' <span style="color:var(--amber)">✏</span>' : '') + '</td>' +
    '</tr>';
  }).join('');
}

function renderBarChart(selector, items, colorClass) {
  var el = $(selector);
  if (!el) return;
  if (items.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><p>Ma\'lumot yo\'q</p></div>';
    return;
  }
  var max = Math.max.apply(null, items.map(function(i){ return i.val; }));
  el.innerHTML = '<div class="bar-chart">' + items.slice(0, 12).map(function(item) {
    var w = max > 0 ? Math.round((item.val / max) * 100) : 0;
    return '<div class="bar-row">' +
      '<div class="bar-label" title="' + item.label + '">' + item.label + '</div>' +
      '<div class="bar-track"><div class="bar-fill ' + colorClass + '" style="width:' + w + '%"></div></div>' +
      '<div class="bar-val">' + fmtNum(item.val) + (item.sub ? '<div style="font-size:10px;color:var(--ink3)">' + item.sub + '</div>' : '') + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

// ═══════════════════════════════════════════════════════════════
// ARCHIVE
// ═══════════════════════════════════════════════════════════════
function renderArchive() {
  var archives = Storage.getArchives();
  var months   = Storage.getAvailableMonths();
  var monthNames = ['','Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  var sel = $('#archive-month-sel');
  if (sel) {
    sel.innerHTML = '<option value="">-- Oy tanlang --</option>' + months.map(function(m) {
      var parts = m.split('-');
      return '<option value="' + m + '">' + monthNames[parseInt(parts[1])] + ' ' + parts[0] + '</option>';
    }).join('');
  }

  var el = $('#archive-list');
  if (archives.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🗄</div><p>Hali arxiv yo\'q. Oy tugagandan so\'ng "Arxivlash" tugmasini bosing.</p></div>';
    return;
  }
  el.innerHTML = archives.map(function(a) {
    return '<div class="archive-card">' +
      '<div class="archive-card-header">' +
        '<div class="archive-month-label">🗓 ' + a.label + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<span style="font-size:11px;color:var(--ink3)">Arxivlangan: ' + fmtDate(a.archivedAt) + '</span>' +
          '<button class="btn btn-sm btn-primary" onclick="showArchiveDetail(\'' + a.id + '\')">📋 Ko\'rish</button>' +
          '<button class="btn btn-sm btn-red" onclick="confirmDeleteArchive(\'' + a.id + '\')">🗑</button>' +
        '</div>' +
      '</div>' +
      '<div class="g4" style="margin-top:12px">' +
        '<div class="archive-stat"><div class="archive-stat-val">' + fmtNum(a.summary.totalSold) + '</div><div class="archive-stat-lbl">Sotilgan</div></div>' +
        '<div class="archive-stat"><div class="archive-stat-val">' + fmtMoney(a.summary.totalRevenue) + '</div><div class="archive-stat-lbl">Daromad</div></div>' +
        '<div class="archive-stat"><div class="archive-stat-val">' + fmtNum(a.summary.totalProduced) + '</div><div class="archive-stat-lbl">Ishlab chiqarilgan</div></div>' +
        '<div class="archive-stat"><div class="archive-stat-val">' + fmtNum(a.summary.totalTransferred) + '</div><div class="archive-stat-lbl">Yuborilgan</div></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function submitArchiveMonth() {
  var key = $('#archive-month-sel').value;
  if (!key) { toast('Oyni tanlang', 'error'); return; }
  if (!confirm('Bu oyning barcha yozuvlari arxivga ko\'chiriladi. Davom etasizmi?')) return;
  var r = Storage.archiveMonth(key);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ ' + r.archive.label + ' arxivlandi'); renderArchive();
}

function submitArchiveCurrentMonth() {
  if (!confirm('Joriy oyning barcha yozuvlari arxivga ko\'chiriladi. Davom etasizmi?')) return;
  var r = Storage.archiveCurrentMonth();
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ ' + r.archive.label + ' arxivlandi'); renderArchive();
}

function showArchiveDetail(archiveId) {
  var a = Storage.getArchiveById(archiveId);
  if (!a) return;
  var products = Storage.getProducts();

  var salesRows = Object.entries(a.summary.salesByProduct).map(function(e) {
    return '<tr><td>' + e[1].name + '</td><td>' + fmtNum(e[1].qty) + '</td><td>' + fmtMoney(e[1].revenue) + '</td></tr>';
  }).join('');

  var wsRows = products.map(function(p) {
    return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">' +
      '<span>' + p.icon + ' ' + p.name + '</span><strong>' + (a.snapshots.wsInventory[p.id]||0) + '</strong></div>';
  }).join('');

  var shopRows = products.map(function(p) {
    return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">' +
      '<span>' + p.icon + ' ' + p.name + '</span><strong>' + (a.snapshots.shopInventory[p.id]||0) + '</strong></div>';
  }).join('');

  openModal(
    mHead('📋 ' + a.label + ' — Arxiv hisoboti') +
    '<div class="g4" style="margin-bottom:16px">' +
      '<div class="archive-stat-inline"><strong>' + fmtNum(a.summary.totalSold) + '</strong><span>Sotilgan</span></div>' +
      '<div class="archive-stat-inline"><strong>' + fmtMoney(a.summary.totalRevenue) + '</strong><span>Daromad</span></div>' +
      '<div class="archive-stat-inline"><strong>' + fmtNum(a.summary.totalProduced) + '</strong><span>Ishlab chiqarilgan</span></div>' +
      '<div class="archive-stat-inline"><strong>' + fmtNum(a.summary.totalTransferred) + '</strong><span>Yuborilgan</span></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<div class="card-title" style="margin:12px 0 8px">💰 Mahsulot bo\'yicha sotuv</div>' +
    (salesRows
      ? '<table class="data-table"><thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Daromad</th></tr></thead><tbody>' + salesRows + '</tbody></table>'
      : '<p style="color:var(--ink3);font-size:13px">Sotuv yo\'q</p>') +
    '<div class="divider" style="margin:12px 0"></div>' +
    '<div class="card-title" style="margin-bottom:10px">📦 Oy oxiri inventar</div>' +
    '<div class="form-row cols-2">' +
      '<div><div style="font-size:12px;font-weight:700;color:var(--ink3);margin-bottom:6px">SEH</div>' + wsRows + '</div>' +
      '<div><div style="font-size:12px;font-weight:700;color:var(--ink3);margin-bottom:6px">DO\'KON</div>' + shopRows + '</div>' +
    '</div>' +
    '<div class="modal-actions" style="margin-top:16px">' +
      '<button class="btn btn-ghost btn-full" onclick="closeModal()">Yopish</button>' +
    '</div>',
    true
  );
}

function confirmDeleteArchive(id) {
  var a = Storage.getArchiveById(id);
  if (!a) return;
  if (!confirm('"' + a.label + '" arxivini o\'chirasizmi? Bu amal qaytarib bo\'lmaydi.')) return;
  Storage.deleteArchive(id);
  toast('🗑 Arxiv o\'chirildi'); renderArchive();
}

// ═══════════════════════════════════════════════════════════════
// CLOCK & RESET & INIT
// ═══════════════════════════════════════════════════════════════
function updateClock() {
  var el = $('#topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('uz-UZ',
    {weekday:'short', day:'numeric', month:'short', year:'numeric'});
}

function confirmReset() {
  if (confirm("Barcha ma'lumotlar o'chiriladi. Davom etasizmi?")) {
    Storage.resetAll();
    toast("✅ Ma'lumotlar tozalandi");
    navigate('dashboard');
  }
}

function logoutAdmin() {
  if (confirm('Tizimdan chiqmoqchimisiz?')) {
    Auth.logout();
    window.location.href = 'login.html';
  }
}

function showGroupPasswordModal(groupId) {
  var g = Storage.getGroupById(groupId);
  if (!g) return;
  openModal(
    mHead('🔑 "' + g.name + '" paroli') +
    '<div class="info-box">Guruh ishchilari kirish uchun shu parolni ishlatadi.</div>' +
    '<div class="form-group"><label class="form-label">Yangi parol *</label>' +
      '<input type="text" id="grp-pw" value="' + (g.password || '') + '" placeholder="Kamida 3 ta belgi"/></div>' +
    mActions('Bekor', '🔑 Saqlash', 'submitGroupPassword(\'' + groupId + '\')')
  );
}
function submitGroupPassword(groupId) {
  var pw = document.getElementById('grp-pw').value.trim();
  var r  = Auth.setGroupPassword(groupId, pw);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Parol saqlandi'); closeModal(); renderGroups();
}

function showChangeAdminPassModal() {
  openModal(
    mHead('🔐 Admin parolini o\'zgartirish') +
    '<div class="form-group"><label class="form-label">Joriy parol</label>' +
      '<input type="password" id="ap-old" placeholder="Joriy parol"/></div>' +
    '<div class="form-group"><label class="form-label">Yangi parol *</label>' +
      '<input type="password" id="ap-new" placeholder="Kamida 4 ta belgi"/></div>' +
    mActions('Bekor', '🔐 O\'zgartirish', 'submitChangeAdminPass()')
  );
}
function submitChangeAdminPass() {
  var oldP = document.getElementById('ap-old').value;
  var newP = document.getElementById('ap-new').value;
  var r = Auth.changeAdminPassword(oldP, newP);
  if (!r.ok) { toast(r.msg, 'error'); return; }
  toast('✅ Parol o\'zgartirildi'); closeModal();
}

document.addEventListener('DOMContentLoaded', function() {
  // Auth guard
  if (!Auth.requireAdmin()) return;

  Storage.seed();
  Auth.seedAdmin();

  // Show user info in topbar
  var userEl = document.getElementById('topbar-user');
  if (userEl) userEl.textContent = '🏢 Admin';

  $$('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(){ navigate(item.dataset.page); });
  });
  updateClock();
  setInterval(updateClock, 60000);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });
  navigate('dashboard');
});
