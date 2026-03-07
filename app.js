/**
 * APP.JS — UI Layer
 * All DOM rendering & event handling.
 * Business logic lives in Storage module only.
 * Replace DOM calls with React setState to migrate.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function toast(msg, type = 'success') {
  const c = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function fmtNum(n) { return Number(n).toLocaleString('uz-UZ'); }
function fmtMoney(n) { return fmtNum(n) + ' so\'m'; }

function deadlineStatus(deadline) {
  if (!deadline) return '';
  const today = new Date();
  today.setHours(0,0,0,0);
  const dl = new Date(deadline);
  const diff = Math.ceil((dl - today) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due-soon';
  return '';
}

function qtyClass(qty) {
  if (qty === 0) return 'qty-empty';
  if (qty <= 5)  return 'qty-warn';
  return 'qty-ok';
}

function logTypeBadge(type) {
  const map = {
    production:   ['badge-blue',  '🔨 Ishlab chiqarildi'],
    transfer:     ['badge-purple','📦 Yuborildi'],
    sale:         ['badge-green', '💰 Sotildi'],
    material_add: ['badge-amber', '➕ Material'],
  };
  const [cls, label] = map[type] || ['badge-grey', type];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */

let currentPage = 'dashboard';

function navigate(page) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $$('.page').forEach(p => p.classList.remove('active'));

  const navEl = $(`.nav-item[data-page="${page}"]`);
  const pageEl = $(`#page-${page}`);
  if (navEl)  navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');

  currentPage = page;
  renderPage(page);
  updateTopbar(page);
}

function updateTopbar(page) {
  const meta = {
    dashboard:  { name: '🏠 Dashboard', sub: 'Umumiy ko\'rinish' },
    products:   { name: '📦 Mahsulotlar', sub: 'Global mahsulot ro\'yxati' },
    workshop:   { name: '🔨 Seh', sub: 'Ishlab chiqarish va inventar' },
    groups:     { name: '👥 Guruhlar', sub: 'Ishchilar guruhlari va topshiriqlar' },
    shop:       { name: '🏪 Do\'kon', sub: 'Sotuv va inventar' },
    transfer:   { name: '🚚 Yuborish', sub: 'Sehdan do\'konga yuborish' },
    reports:    { name: '📊 Hisobotlar', sub: 'Tahlil va statistika' },
  };
  const m = meta[page] || { name: page, sub: '' };
  $('#topbar-name').textContent = m.name;
  $('#topbar-sub').textContent = m.sub;
}

function renderPage(page) {
  const renderers = {
    dashboard: renderDashboard,
    products:  renderProducts,
    workshop:  renderWorkshop,
    groups:    renderGroups,
    shop:      renderShop,
    transfer:  renderTransfer,
    reports:   renderReports,
  };
  if (renderers[page]) renderers[page]();
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */

function renderDashboard() {
  const r = Storage.getReportSummary();
  const wsInv = Storage.getWsInventory();
  const shopInv = Storage.getShopInventory();
  const tasks = Storage.getTasks().filter(t => t.status === 'active');

  const wsTotal   = Object.values(wsInv).reduce((s,v)=>s+v,0);
  const shopTotal = Object.values(shopInv).reduce((s,v)=>s+v,0);

  $('#dash-produced').textContent   = fmtNum(r.sum('production'));
  $('#dash-transferred').textContent= fmtNum(r.sum('transfer'));
  $('#dash-sold').textContent       = fmtNum(r.sum('sale'));
  $('#dash-revenue').textContent    = fmtMoney(r.revenue);
  $('#dash-ws-stock').textContent   = fmtNum(wsTotal);
  $('#dash-shop-stock').textContent = fmtNum(shopTotal);

  // Active tasks summary
  $('#dash-active-tasks').textContent = tasks.length;

  // Recent logs
  const logs = Storage.getRecentLogs(8);
  const logEl = $('#dash-logs');
  logEl.innerHTML = logs.length === 0
    ? `<div class="empty"><div class="empty-icon">📋</div><p>Hali hech qanday harakat amalga oshirilmagan</p></div>`
    : `<div class="log-feed">${logs.map(renderLogRow).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function renderProducts() {
  const products = Storage.getProducts();

  $('#products-count').textContent = products.length;

  const tbody = $('#products-tbody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><span style="font-size:20px">${p.icon}</span></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-grey">${p.unit}</span></td>
      <td><span class="badge badge-blue">ID: ${p.id}</span></td>
    </tr>
  `).join('');
}

function showAddProductModal() {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">➕ Yangi mahsulot qo'shish</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Mahsulot nomi *</label>
      <input type="text" id="np-name" placeholder="Masalan: Jaket" />
    </div>
    <div class="form-row cols-2">
      <div>
        <label class="form-label">Emoji (ixtiyoriy)</label>
        <input type="text" id="np-icon" placeholder="🧥" maxlength="4"/>
      </div>
      <div>
        <label class="form-label">O'lchov birligi</label>
        <select id="np-unit">
          <option value="dona">dona</option>
          <option value="juft">juft</option>
          <option value="metr">metr</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor qilish</button>
      <button class="btn btn-primary btn-full" onclick="submitAddProduct()">✅ Qo'shish</button>
    </div>
  `);
}

function submitAddProduct() {
  const name = $('#np-name').value.trim();
  const icon = $('#np-icon').value.trim() || '📦';
  const unit = $('#np-unit').value;
  if (!name) { toast('Mahsulot nomini kiriting', 'error'); return; }
  const result = Storage.createProduct(name, icon, unit);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`✅ "${name}" mahsuloti qo'shildi`);
  closeModal();
  renderProducts();
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORKSHOP PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function renderWorkshop() {
  renderWsInventory();
  renderMaterialInventory();
  initTabs('#page-workshop');
}

function renderWsInventory() {
  const inv = Storage.getWsInventory();
  const products = Storage.getProducts();
  const el = $('#ws-inventory-body');

  const rows = products.map(p => {
    const qty = inv[p.id] || 0;
    return `<tr>
      <td>${p.icon}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="qty-pill ${qtyClass(qty)}">${fmtNum(qty)}</span></td>
    </tr>`;
  }).join('');

  el.innerHTML = rows || `<tr><td colspan="3"><div class="empty"><div class="empty-icon">📦</div><p>Inventar bo'sh</p></div></td></tr>`;
}

function renderMaterialInventory() {
  const inv = Storage.getMatInventory();
  const materials = Storage.getMaterials();
  const el = $('#mat-inventory-body');

  el.innerHTML = materials.map(m => {
    const qty = inv[m.id] || 0;
    return `<tr>
      <td>${m.icon}</td>
      <td><strong>${m.name}</strong></td>
      <td><span class="badge badge-grey">${m.unit}</span></td>
      <td><span class="qty-pill ${qtyClass(qty)}">${fmtNum(qty)}</span></td>
      <td>
        <button class="btn btn-sm btn-amber" onclick="showAddMaterialModal('${m.id}','${m.name}')">
          ➕ Qo'shish
        </button>
      </td>
    </tr>`;
  }).join('');
}

function showAddMaterialModal(matId, matName) {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">➕ ${matName} qo'shish</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Miqdor</label>
      <input type="number" id="mat-qty" min="1" placeholder="Masalan: 100" />
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-amber btn-full" onclick="submitAddMaterial('${matId}')">➕ Qo'shish</button>
    </div>
  `);
}

function submitAddMaterial(matId) {
  const qty = parseInt($('#mat-qty').value);
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  Storage.addMaterial(matId, qty);
  toast('✅ Material qo\'shildi');
  closeModal();
  renderWorkshop();
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUPS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function renderGroups() {
  renderGroupList();
  renderTaskList();
  initTabs('#page-groups');
}

function renderGroupList() {
  const groups = Storage.getGroups();
  const tasks = Storage.getTasks();
  const el = $('#groups-list');

  if (groups.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><p>Hali guruh yo'q</p></div>`;
    return;
  }

  el.innerHTML = groups.map(g => {
    const gTasks  = tasks.filter(t => t.groupId === g.id);
    const active  = gTasks.filter(t => t.status === 'active').length;
    const done    = gTasks.filter(t => t.status === 'completed').length;
    const initial = g.name.charAt(0).toUpperCase();

    return `<div class="group-card">
      <div class="group-color-ring" style="background:${g.color}">${initial}</div>
      <div style="flex:1">
        <div class="group-name">${g.name}</div>
        <div class="group-stats">
          ${active > 0 ? `<span class="badge badge-blue">${active} faol topshiriq</span>&nbsp;` : ''}
          ${done  > 0 ? `<span class="badge badge-green">${done} bajarildi</span>` : ''}
          ${gTasks.length === 0 ? '<span class="badge badge-grey">Topshiriq yo\'q</span>' : ''}
        </div>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="showAssignTaskModal('${g.id}','${g.name}')">
        📋 Topshiriq
      </button>
    </div>`;
  }).join('');
}

function renderTaskList() {
  const tasks = Storage.getTasks();
  const el = $('#tasks-list');

  if (tasks.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p>Hali topshiriq yo'q</p></div>`;
    return;
  }

  const sorted = [...tasks].sort((a,b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  el.innerHTML = sorted.map(t => renderTaskCard(t)).join('');
}

function renderTaskCard(t) {
  const prod  = Storage.getProductById(t.productId);
  const grp   = Storage.getGroupById(t.groupId);
  const pct   = t.quantity > 0 ? Math.round((t.produced / t.quantity) * 100) : 0;
  const dlStatus = deadlineStatus(t.deadline);
  const isComplete = t.status === 'completed';

  return `<div class="task-card ${isComplete ? 'completed' : ''}">
    <div class="task-header">
      <div class="task-product">
        <span>${prod ? prod.icon : '📦'}</span>
        ${prod ? prod.name : 'Noma\'lum'}
      </div>
      ${grp ? `<span class="task-group-tag" style="background:${grp.color}">${grp.name}</span>` : ''}
    </div>

    <div class="task-meta">
      <div class="task-meta-item">📅 <strong class="${dlStatus}">${fmtDate(t.deadline) || 'Muddatsiz'}</strong></div>
      <div class="task-meta-item">💰 <strong>${fmtMoney(t.pricePerItem)}/dona</strong></div>
      <div class="task-meta-item">📦 <strong>${fmtNum(t.produced)} / ${fmtNum(t.quantity)}</strong> dona</div>
      ${t.note ? `<div class="task-meta-item">📝 ${t.note}</div>` : ''}
    </div>

    <div class="task-progress-label">
      <span>Bajarilish</span>
      <span>${pct}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill ${isComplete ? 'complete' : ''}" style="width:${pct}%"></div>
    </div>

    ${!isComplete ? `
      <div class="task-actions">
        <button class="btn btn-sm btn-primary" onclick="showProduceModal('${t.id}')">
          🔨 Ishlab chiqarildi
        </button>
        <span style="font-size:12px;color:var(--ink3);margin-left:4px">
          Qoldi: ${fmtNum(t.quantity - t.produced)} ta
        </span>
      </div>` : `
      <div style="margin-top:10px">
        <span class="badge badge-green">✅ Bajarildi</span>
      </div>`}
  </div>`;
}

function showCreateGroupModal() {
  const colors = ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0d9488'];
  openModal(`
    <div class="modal-header">
      <div class="modal-title">👥 Yangi guruh yaratish</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Guruh nomi *</label>
      <input type="text" id="grp-name" placeholder="Masalan: D Guruh" />
    </div>
    <div class="form-group">
      <label class="form-label">Rang</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${colors.map((c,i) => `
          <label style="cursor:pointer">
            <input type="radio" name="grp-color" value="${c}" ${i===0?'checked':''} style="display:none">
            <div style="width:30px;height:30px;border-radius:50%;background:${c};border:3px solid transparent;transition:border 0.12s" 
                 onclick="this.closest('div').querySelectorAll('div').forEach(d=>d.style.borderColor='transparent');this.style.borderColor='#1a1a2e'"></div>
          </label>`).join('')}
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitCreateGroup()">✅ Yaratish</button>
    </div>
  `);
}

function submitCreateGroup() {
  const name  = $('#grp-name').value.trim();
  const color = $('input[name="grp-color"]:checked')?.value || '#2563eb';
  if (!name) { toast('Guruh nomini kiriting', 'error'); return; }
  const result = Storage.createGroup(name, color);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`✅ "${name}" guruhi yaratildi`);
  closeModal();
  renderGroups();
}

function showAssignTaskModal(groupId, groupName) {
  const products = Storage.getProducts();
  const productOpts = products.map(p =>
    `<option value="${p.id}">${p.icon} ${p.name}</option>`
  ).join('');

  openModal(`
    <div class="modal-header">
      <div class="modal-title">📋 Topshiriq berish — ${groupName}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Mahsulot *</label>
      <select id="task-product"><option value="">-- Tanlang --</option>${productOpts}</select>
    </div>
    <div class="form-row cols-2">
      <div>
        <label class="form-label">Miqdor (dona) *</label>
        <input type="number" id="task-qty" min="1" placeholder="50" />
      </div>
      <div>
        <label class="form-label">Muddati</label>
        <input type="date" id="task-deadline" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Narx (1 dona uchun, so'm)</label>
      <input type="number" id="task-price" min="0" placeholder="200000" />
    </div>
    <div class="form-group">
      <label class="form-label">Izoh</label>
      <textarea id="task-note" placeholder="Ixtiyoriy izoh..."></textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitAssignTask('${groupId}')">📋 Topshiriq berish</button>
    </div>
  `);
}

function submitAssignTask(groupId) {
  const productId    = $('#task-product').value;
  const quantity     = $('#task-qty').value;
  const deadline     = $('#task-deadline').value;
  const pricePerItem = $('#task-price').value;
  const note         = $('#task-note').value.trim();

  if (!productId) { toast('Mahsulotni tanlang', 'error'); return; }
  if (!quantity || parseInt(quantity) <= 0) { toast('Miqdorni kiriting', 'error'); return; }

  const result = Storage.createTask(groupId, productId, quantity, deadline, pricePerItem, note);
  if (!result.ok) { toast(result.msg, 'error'); return; }

  const prod = Storage.getProductById(productId);
  toast(`✅ Topshiriq berildi: ${prod?.name} — ${fmtNum(quantity)} ta`);
  closeModal();
  renderGroups();
}

function showProduceModal(taskId) {
  const task = Storage.getTaskById(taskId);
  if (!task) return;
  const prod = Storage.getProductById(task.productId);
  const remaining = task.quantity - task.produced;

  openModal(`
    <div class="modal-header">
      <div class="modal-title">🔨 Ishlab chiqarish — ${prod?.name || ''}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="background:var(--blue-lt);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px;font-size:13.5px;color:var(--ink2)">
      Topshiriq: <strong>${fmtNum(task.quantity)}</strong> ta &nbsp;|&nbsp;
      Bajarildi: <strong>${fmtNum(task.produced)}</strong> ta &nbsp;|&nbsp;
      Qoldi: <strong style="color:var(--blue)">${fmtNum(remaining)}</strong> ta
    </div>
    <div class="form-group">
      <label class="form-label">Nechta ishlab chiqarildi? *</label>
      <input type="number" id="prod-qty" min="1" max="${remaining}" placeholder="Masalan: ${remaining}" />
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitProduce('${taskId}')">🔨 Tasdiqlash</button>
    </div>
  `);
}

function submitProduce(taskId) {
  const qty = $('#prod-qty').value;
  if (!qty || parseInt(qty) <= 0) { toast('Miqdorni kiriting', 'error'); return; }
  const result = Storage.recordProduction(taskId, qty);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`✅ ${fmtNum(qty)} ta mahsulot seh inventariga qo'shildi`);
  closeModal();
  renderGroups();
  if (currentPage === 'workshop') renderWorkshop();
  if (currentPage === 'dashboard') renderDashboard();
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSFER PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function renderTransfer() {
  // Populate product select
  const wsInv = Storage.getWsInventory();
  const products = Storage.getProducts();
  const sel = $('#transfer-product');
  sel.innerHTML = '<option value="">-- Mahsulot tanlang --</option>';
  products.forEach(p => {
    const qty = wsInv[p.id] || 0;
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.icon} ${p.name} (${fmtNum(qty)} ta mavjud)`;
    if (qty === 0) opt.disabled = true;
    sel.appendChild(opt);
  });

  // Render transfer log
  renderTransferLog();
}

function renderTransferLog() {
  const logs = Storage.getLogsByType('transfer').slice(0,20);
  const el = $('#transfer-log');
  el.innerHTML = logs.length === 0
    ? `<div class="empty"><div class="empty-icon">🚚</div><p>Hali yuborish amalga oshirilmagan</p></div>`
    : `<div class="log-feed">${logs.map(renderLogRow).join('')}</div>`;
}

function submitTransfer() {
  const productId = $('#transfer-product').value;
  const qty       = parseInt($('#transfer-qty').value);

  if (!productId) { toast('Mahsulotni tanlang', 'error'); return; }
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }

  const result = Storage.transferToShop(productId, qty);
  if (!result.ok) { toast(result.msg, 'error'); return; }

  const prod = Storage.getProductById(productId);
  toast(`✅ ${fmtNum(qty)} ta ${prod?.name} do'konga yuborildi`);
  $('#transfer-qty').value = '';
  $('#transfer-product').value = '';
  renderTransfer();
  if (currentPage === 'dashboard') renderDashboard();
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHOP PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function renderShop() {
  renderShopInventory();
  renderSaleLog();
  populateSellSelect();
  initTabs('#page-shop');
}

function renderShopInventory() {
  const inv = Storage.getShopInventory();
  const products = Storage.getProducts();
  const el = $('#shop-inventory-body');

  el.innerHTML = products.map(p => {
    const qty = inv[p.id] || 0;
    return `<tr>
      <td>${p.icon}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="qty-pill ${qtyClass(qty)}">${fmtNum(qty)}</span></td>
    </tr>`;
  }).join('');
}

function populateSellSelect() {
  const inv = Storage.getShopInventory();
  const products = Storage.getProducts();
  const sel = $('#sell-product');
  sel.innerHTML = '<option value="">-- Mahsulot tanlang --</option>';
  products.forEach(p => {
    const qty = inv[p.id] || 0;
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.icon} ${p.name} (${fmtNum(qty)} ta)`;
    if (qty === 0) opt.disabled = true;
    sel.appendChild(opt);
  });
}

function renderSaleLog() {
  const logs = Storage.getLogsByType('sale').slice(0,20);
  const el = $('#sale-log');
  el.innerHTML = logs.length === 0
    ? `<div class="empty"><div class="empty-icon">💰</div><p>Hali sotuv amalga oshirilmagan</p></div>`
    : `<div class="log-feed">${logs.map(renderLogRow).join('')}</div>`;
}

function submitSale() {
  const productId = $('#sell-product').value;
  const qty       = parseInt($('#sell-qty').value);
  const price     = parseFloat($('#sell-price').value) || 0;
  const note      = $('#sell-note').value.trim();

  if (!productId) { toast('Mahsulotni tanlang', 'error'); return; }
  if (!qty || qty <= 0) { toast('Miqdorni kiriting', 'error'); return; }

  const result = Storage.sellProduct(productId, qty, price, note);
  if (!result.ok) { toast(result.msg, 'error'); return; }

  const prod = Storage.getProductById(productId);
  toast(`✅ ${fmtNum(qty)} ta ${prod?.name} sotildi` + (price > 0 ? ` — ${fmtMoney(price * qty)}` : ''));
  $('#sell-qty').value = '';
  $('#sell-price').value = '';
  $('#sell-note').value = '';
  renderShop();
  if (currentPage === 'dashboard') renderDashboard();
}

/* ═══════════════════════════════════════════════════════════════════════════
   REPORTS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function renderReports() {
  const r = Storage.getReportSummary();

  $('#rpt-total-produced').textContent    = fmtNum(r.sum('production'));
  $('#rpt-total-transferred').textContent = fmtNum(r.sum('transfer'));
  $('#rpt-total-sold').textContent        = fmtNum(r.sum('sale'));
  $('#rpt-total-revenue').textContent     = fmtMoney(r.revenue);
  $('#rpt-today-sold').textContent        = fmtNum(r.sumToday('sale'));
  $('#rpt-today-produced').textContent    = fmtNum(r.sumToday('production'));
  $('#rpt-today-revenue').textContent     = fmtMoney(r.todayRevenue);

  // Sales by product chart
  renderBarChart('#sales-by-product-chart', r.salesByProduct, 'bf-green');
  // Production by product chart
  renderBarChart('#prod-by-product-chart', r.prodByProduct, 'bf-blue');
  // Monthly sales
  renderBarChart('#monthly-sales-chart', r.monthly, 'bf-amber');

  // Full log table
  const logs = Storage.getLogs();
  const tbody = $('#full-log-tbody');
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-icon">📋</div><p>Hali hech qanday harakat yo'q</p></div></td></tr>`;
  } else {
    tbody.innerHTML = logs.slice(0,50).map(l => `
      <tr>
        <td>${fmtDate(l.date)} <span style="color:var(--ink3);font-size:11px">${fmtTime(l.date)}</span></td>
        <td>${logTypeBadge(l.type)}</td>
        <td>${l.productName || '—'}</td>
        <td><strong>${fmtNum(l.quantity)}</strong></td>
        <td>${l.price > 0 ? fmtMoney(l.price) : '—'}</td>
        <td style="font-size:12px;color:var(--ink3)">${l.note || '—'}</td>
      </tr>
    `).join('');
  }
}

function renderBarChart(selector, data, colorClass) {
  const el = $(selector);
  if (!el) return;
  const entries = Object.entries(data);
  if (entries.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><p>Ma'lumot yo'q</p></div>`;
    return;
  }
  const max = Math.max(...entries.map(([,v])=>v));
  el.innerHTML = `<div class="bar-chart">${entries.slice(0,10).map(([label, val]) => `
    <div class="bar-row">
      <div class="bar-label" title="${label}">${label}</div>
      <div class="bar-track">
        <div class="bar-fill ${colorClass}" style="width:${max>0 ? Math.round((val/max)*100) : 0}%"></div>
      </div>
      <div class="bar-val">${fmtNum(val)}</div>
    </div>
  `).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED LOG ROW
   ═══════════════════════════════════════════════════════════════════════════ */

function renderLogRow(l) {
  const dotClass = `dot-${l.type}`;
  const priceStr = l.price > 0 ? ` · ${fmtMoney(l.price)}` : '';
  return `<div class="log-item">
    <div class="log-type-dot ${dotClass}"></div>
    <div style="flex:1">
      <div class="log-main">${l.productName || '—'}</div>
      <div class="log-sub">${l.source || ''} → ${l.destination || ''}${priceStr}</div>
    </div>
    <div class="log-qty">×${fmtNum(l.quantity)}</div>
    <div class="log-date">${fmtDate(l.date)}</div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */

function openModal(html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const existing = $('#modal-overlay');
  if (existing) existing.remove();
}

/* ═══════════════════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════════════════ */

function initTabs(pageSelector) {
  $$(pageSelector + ' .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const pane = tab.dataset.pane;
      const parent = tab.closest('.tabs').parentElement;
      parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const paneEl = parent.querySelector('#' + pane);
      if (paneEl) paneEl.classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESET
   ═══════════════════════════════════════════════════════════════════════════ */

function confirmReset() {
  if (confirm("Barcha ma'lumotlar o'chiriladi va demo holat tiklanadi. Davom etasizmi?")) {
    Storage.resetAll();
    toast("✅ Ma'lumotlar tozalandi");
    navigate('dashboard');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATE
   ═══════════════════════════════════════════════════════════════════════════ */

function updateClock() {
  const el = $('#topbar-date');
  if (el) {
    const d = new Date();
    el.textContent = d.toLocaleDateString('uz-UZ', {
      weekday:'short', day:'numeric', month:'short', year:'numeric'
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  Storage.seed();

  // Nav
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Date
  updateClock();
  setInterval(updateClock, 60000);

  // Keyboard: ESC closes modal
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Boot to dashboard
  navigate('dashboard');
});