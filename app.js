/**
 * APP.JS v3 — UI Layer
 * Fixes: sotuv edit/delete, edit everywhere, monthly archive
 */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ══════════════════════════════ UTILITIES ══════════════════════════════ */

function toast(msg, type = "success") {
  const c = $("#toast-container");
  const el = document.createElement("div");
  el.className = "toast t-" + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtNum(n) {
  return Number(n || 0).toLocaleString("uz-UZ");
}
function fmtMoney(n) {
  return fmtNum(n) + " so'm";
}

function deadlineStatus(dl) {
  if (!dl) return "";
  const d = Math.ceil(
    (new Date(dl) - new Date().setHours(0, 0, 0, 0)) / 86400000,
  );
  return d < 0 ? "overdue" : d <= 3 ? "due-soon" : "";
}
function qtyClass(q) {
  return q === 0 ? "qty-empty" : q <= 5 ? "qty-warn" : "qty-ok";
}

function logTypeBadge(type) {
  const map = {
    production: ["badge-blue", "🔨 Ishlab chiqarildi"],
    transfer: ["badge-purple", "📦 Yuborildi"],
    sale: ["badge-green", "💰 Sotildi"],
    material_add: ["badge-amber", "➕ Material"],
  };
  const [cls, label] = map[type] || ["badge-grey", type];
  return '<span class="badge ' + cls + '">' + label + "</span>";
}

function productSelectHtml(selectedId, showQty, invSource) {
  const products = Storage.getProducts();
  const inv = invSource ? invSource() : null;
  return (
    '<option value="">-- Mahsulot tanlang --</option>' +
    products
      .map((p) => {
        const qty = inv ? inv[p.id] || 0 : null;
        const label =
          p.icon +
          " " +
          p.name +
          (qty !== null ? " (" + fmtNum(qty) + " ta)" : "");
        const disabled = qty !== null && qty === 0 ? "disabled" : "";
        const sel = p.id === selectedId ? "selected" : "";
        return (
          '<option value="' +
          p.id +
          '" ' +
          disabled +
          " " +
          sel +
          ">" +
          label +
          "</option>"
        );
      })
      .join("")
  );
}

function colorPickerHtml(selectedColor) {
  const colors = [
    "#2563eb",
    "#059669",
    "#d97706",
    "#7c3aed",
    "#dc2626",
    "#0d9488",
    "#db2777",
    "#ea580c",
  ];
  return (
    '<div class="color-picker">' +
    colors
      .map(
        (c) =>
          '<div class="color-swatch' +
          (c === selectedColor ? " selected" : "") +
          '" data-color="' +
          c +
          '" style="background:' +
          c +
          '" onclick="pickColor(this)"></div>',
      )
      .join("") +
    '<input type="hidden" id="color-val" value="' +
    (selectedColor || colors[0]) +
    '"></div>'
  );
}

function pickColor(el) {
  el.closest(".color-picker")
    .querySelectorAll(".color-swatch")
    .forEach((s) => s.classList.remove("selected"));
  el.classList.add("selected");
  el.closest(".color-picker").querySelector("#color-val").value =
    el.dataset.color;
}

/* ══════════════════════════════ NAVIGATION ══════════════════════════════ */
let currentPage = "dashboard";

function navigate(page) {
  $$(".nav-item").forEach((n) => n.classList.remove("active"));
  $$(".page").forEach((p) => p.classList.remove("active"));
  const navEl = $('.nav-item[data-page="' + page + '"]');
  const pageEl = $("#page-" + page);
  if (navEl) navEl.classList.add("active");
  if (pageEl) pageEl.classList.add("active");
  currentPage = page;
  renderPage(page);
  updateTopbar(page);
}

function updateTopbar(page) {
  const meta = {
    dashboard: { name: "🏠 Dashboard", sub: "Umumiy ko'rinish" },
    products: { name: "📦 Mahsulotlar", sub: "Global mahsulot ro'yxati" },
    workshop: { name: "🔨 Seh", sub: "Ishlab chiqarish va inventar" },
    groups: { name: "👥 Guruhlar", sub: "Ishchilar guruhlari va topshiriqlar" },
    shop: { name: "🏪 Do'kon", sub: "Sotuv va inventar" },
    transfer: { name: "🚚 Yuborish", sub: "Sehdan do'konga yuborish" },
    reports: { name: "📊 Hisobotlar", sub: "Tahlil va statistika" },
    archive: { name: "🗄 Arxiv", sub: "Oylik hisobot arxivi" },
  };
  const m = meta[page] || { name: page, sub: "" };
  $("#topbar-name").textContent = m.name;
  $("#topbar-sub").textContent = m.sub;
}

function renderPage(page) {
  const r = {
    dashboard: renderDashboard,
    products: renderProducts,
    workshop: renderWorkshop,
    groups: renderGroups,
    shop: renderShop,
    transfer: renderTransfer,
    reports: renderReports,
    archive: renderArchive,
  };
  if (r[page]) r[page]();
}

/* ══════════════════════════════ TABS ══════════════════════════════ */
function initTabs(pageSelector) {
  $$(pageSelector + " .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const pane = tab.dataset.pane;
      const parent = tab.closest(".tabs").parentElement;
      parent
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      parent
        .querySelectorAll(".tab-pane")
        .forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const paneEl = parent.querySelector("#" + pane);
      if (paneEl) paneEl.classList.add("active");
    });
  });
}

/* ══════════════════════════════ MODAL ══════════════════════════════ */
function openModal(html, wide) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.className = "modal-overlay";
  overlay.innerHTML =
    '<div class="modal' + (wide ? " modal-wide" : "") + '">' + html + "</div>";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
}
function closeModal() {
  const e = $("#modal-overlay");
  if (e) e.remove();
}

function modalHeader(title) {
  return (
    '<div class="modal-header"><div class="modal-title">' +
    title +
    '</div><button class="modal-close" onclick="closeModal()">✕</button></div>'
  );
}

/* ══════════════════════════════ LOG ROW ══════════════════════════════ */
function renderLogRow(l, showEdit) {
  const priceStr = l.totalPrice > 0 ? " · " + fmtMoney(l.totalPrice) : "";
  const editedMark = l.editedAt
    ? ' <span style="font-size:10px;color:var(--amber)">✏ tahrirlangan</span>'
    : "";
  const actions =
    showEdit && l.type === "sale"
      ? `
    <button class="btn btn-sm btn-ghost" style="padding:4px 8px" onclick="showEditSaleModal('${l.id}')">✏</button>
    <button class="btn btn-sm btn-red"   style="padding:4px 8px" onclick="confirmDeleteSale('${l.id}')">🗑</button>`
      : "";
  return (
    '<div class="log-item">' +
    '<div class="log-type-dot dot-' +
    l.type +
    '"></div>' +
    '<div style="flex:1">' +
    '<div class="log-main">' +
    l.productName +
    editedMark +
    "</div>" +
    '<div class="log-sub">' +
    (l.source || "") +
    " → " +
    (l.destination || "") +
    priceStr +
    "</div>" +
    "</div>" +
    '<div class="log-qty">×' +
    fmtNum(l.quantity) +
    "</div>" +
    '<div class="log-date">' +
    fmtDate(l.date) +
    " " +
    fmtTime(l.date) +
    "</div>" +
    (actions
      ? '<div style="display:flex;gap:4px;margin-left:6px">' +
        actions +
        "</div>"
      : "") +
    "</div>"
  );
}

/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */
function renderDashboard() {
  const r = Storage.getReportSummary();
  const wsInv = Storage.getWsInventory();
  const shopInv = Storage.getShopInventory();
  const tasks = Storage.getTasks().filter((t) => t.status === "active");
  const wsTotal = Object.values(wsInv).reduce((s, v) => s + v, 0);
  const shopTotal = Object.values(shopInv).reduce((s, v) => s + v, 0);

  $("#dash-produced").textContent = fmtNum(r.sum("production"));
  $("#dash-transferred").textContent = fmtNum(r.sum("transfer"));
  $("#dash-sold").textContent = fmtNum(r.sum("sale"));
  $("#dash-revenue").textContent = fmtMoney(r.revenue);
  $("#dash-ws-stock").textContent = fmtNum(wsTotal);
  $("#dash-shop-stock").textContent = fmtNum(shopTotal);
  $("#dash-active-tasks").textContent = tasks.length;

  const logs = Storage.getRecentLogs(8);
  const logEl = $("#dash-logs");
  logEl.innerHTML =
    logs.length === 0
      ? '<div class="empty"><div class="empty-icon">📋</div><p>Hali hech qanday harakat amalga oshirilmagan</p></div>'
      : '<div class="log-feed">' +
        logs.map((l) => renderLogRow(l, false)).join("") +
        "</div>";
}

/* ══════════════════════════════ PRODUCTS ══════════════════════════════ */
function renderProducts() {
  const products = Storage.getProducts();
  $("#products-count").textContent = products.length;
  $("#products-tbody").innerHTML = products
    .map(
      (p) => `
    <tr>
      <td style="font-size:20px">${p.icon}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-grey">${p.unit}</span></td>
      <td><span class="badge badge-blue" style="font-size:11px">ID: ${p.id}</span></td>
      <td>
        <button class="btn btn-sm btn-ghost" onclick="showEditProductModal('${p.id}')">✏ Tahrirlash</button>
        <button class="btn btn-sm btn-red" style="margin-left:4px" onclick="confirmDeleteProduct('${p.id}')">🗑</button>
      </td>
    </tr>`,
    )
    .join("");
}

function showAddProductModal() {
  openModal(
    modalHeader("➕ Yangi mahsulot") +
      `
    <div class="form-group"><label class="form-label">Mahsulot nomi *</label>
      <input type="text" id="np-name" placeholder="Masalan: Jaket"/></div>
    <div class="form-row cols-2">
      <div><label class="form-label">Emoji</label>
        <input type="text" id="np-icon" placeholder="🧥" maxlength="4"/></div>
      <div><label class="form-label">O'lchov birligi</label>
        <select id="np-unit"><option value="dona">dona</option><option value="juft">juft</option><option value="metr">metr</option></select></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitAddProduct()">✅ Qo'shish</button>
    </div>`,
  );
}

function submitAddProduct() {
  const name = $("#np-name").value.trim(),
    icon = $("#np-icon").value.trim() || "📦",
    unit = $("#np-unit").value;
  if (!name) {
    toast("Mahsulot nomini kiriting", "error");
    return;
  }
  const r = Storage.createProduct(name, icon, unit);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast('✅ "' + name + "\" mahsuloti qo'shildi");
  closeModal();
  renderProducts();
}

function showEditProductModal(id) {
  const p = Storage.getProductById(id);
  if (!p) return;
  openModal(
    modalHeader("✏ Mahsulotni tahrirlash") +
      `
    <div class="form-group"><label class="form-label">Mahsulot nomi *</label>
      <input type="text" id="ep-name" value="${p.name}"/></div>
    <div class="form-row cols-2">
      <div><label class="form-label">Emoji</label>
        <input type="text" id="ep-icon" value="${p.icon}" maxlength="4"/></div>
      <div><label class="form-label">O'lchov birligi</label>
        <select id="ep-unit">
          <option value="dona"${p.unit === "dona" ? " selected" : ""}>dona</option>
          <option value="juft"${p.unit === "juft" ? " selected" : ""}>juft</option>
          <option value="metr"${p.unit === "metr" ? " selected" : ""}>metr</option>
        </select></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitEditProduct('${id}')">💾 Saqlash</button>
    </div>`,
  );
}

function submitEditProduct(id) {
  const name = $("#ep-name").value.trim(),
    icon = $("#ep-icon").value.trim(),
    unit = $("#ep-unit").value;
  if (!name) {
    toast("Nomini kiriting", "error");
    return;
  }
  const r = Storage.updateProduct(id, name, icon, unit);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ Mahsulot yangilandi");
  closeModal();
  renderProducts();
}

function confirmDeleteProduct(id) {
  const p = Storage.getProductById(id);
  if (!p) return;
  if (!confirm('"' + p.name + "\" mahsulotini o'chirasizmi?")) return;
  const r = Storage.deleteProduct(id);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("🗑 Mahsulot o'chirildi");
  renderProducts();
}

/* ══════════════════════════════ WORKSHOP ══════════════════════════════ */
function renderWorkshop() {
  renderWsInventory();
  renderMaterialInventory();
  initTabs("#page-workshop");
}

function renderWsInventory() {
  const inv = Storage.getWsInventory(),
    products = Storage.getProducts();
  $("#ws-inventory-body").innerHTML = products
    .map((p) => {
      const qty = inv[p.id] || 0;
      return (
        '<tr><td style="font-size:18px">' +
        p.icon +
        "</td><td><strong>" +
        p.name +
        "</strong></td>" +
        '<td><span class="qty-pill ' +
        qtyClass(qty) +
        '">' +
        fmtNum(qty) +
        "</span></td>" +
        "<td><button class=\"btn btn-sm btn-ghost\" onclick=\"showAdjustInventoryModal('ws','" +
        p.id +
        "','" +
        p.name +
        "'," +
        qty +
        ')">✏ Tuzatish</button></td></tr>'
      );
    })
    .join("");
}

function renderMaterialInventory() {
  const inv = Storage.getMatInventory(),
    mats = Storage.getMaterials();
  $("#mat-inventory-body").innerHTML = mats
    .map((m) => {
      const qty = inv[m.id] || 0;
      return (
        '<tr><td style="font-size:18px">' +
        m.icon +
        "</td><td><strong>" +
        m.name +
        "</strong></td>" +
        '<td><span class="badge badge-grey">' +
        m.unit +
        "</span></td>" +
        '<td><span class="qty-pill ' +
        qtyClass(qty) +
        '">' +
        fmtNum(qty) +
        "</span></td>" +
        '<td style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-amber" onclick="showAddMaterialModal(\'' +
        m.id +
        "','" +
        m.name +
        "')\">➕ Qo'shish</button>" +
        '<button class="btn btn-sm btn-ghost" onclick="showAdjustMatModal(\'' +
        m.id +
        "','" +
        m.name +
        "'," +
        qty +
        ')">✏</button>' +
        "</td></tr>"
      );
    })
    .join("");
}

function showAddMaterialModal(matId, matName) {
  openModal(
    modalHeader("➕ " + matName + " qo'shish") +
      `
    <div class="form-group"><label class="form-label">Miqdor</label>
      <input type="number" id="mat-qty" min="1" placeholder="Masalan: 100"/></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-amber btn-full" onclick="submitAddMaterial('${matId}')">➕ Qo'shish</button>
    </div>`,
  );
}

function submitAddMaterial(matId) {
  const qty = parseInt($("#mat-qty").value);
  if (!qty || qty <= 0) {
    toast("Miqdorni kiriting", "error");
    return;
  }
  Storage.addMaterial(matId, qty);
  toast("✅ Material qo'shildi");
  closeModal();
  renderWorkshop();
}

function showAdjustMatModal(matId, matName, currentQty) {
  openModal(
    modalHeader("✏ " + matName + " miqdorini tuzatish") +
      `
    <div class="info-box">Hozirgi miqdor: <strong>${fmtNum(currentQty)}</strong></div>
    <div class="form-group"><label class="form-label">Yangi miqdor</label>
      <input type="number" id="adj-mat-qty" min="0" value="${currentQty}"/></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitAdjustMat('${matId}')">💾 Saqlash</button>
    </div>`,
  );
}

function submitAdjustMat(matId) {
  const qty = $("#adj-mat-qty").value;
  Storage.setMatInventoryQty(matId, qty);
  toast("✅ Material miqdori yangilandi");
  closeModal();
  renderWorkshop();
}

function showAdjustInventoryModal(type, productId, productName, currentQty) {
  const title =
    type === "ws" ? "Seh inventarini tuzatish" : "Do'kon inventarini tuzatish";
  openModal(
    modalHeader("✏ " + title) +
      `
    <div class="info-box"><strong>${productName}</strong> — Hozirgi miqdor: <strong>${fmtNum(currentQty)}</strong></div>
    <div class="form-group"><label class="form-label">Yangi miqdor</label>
      <input type="number" id="adj-inv-qty" min="0" value="${currentQty}"/></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitAdjustInventory('${type}','${productId}')">💾 Saqlash</button>
    </div>`,
  );
}

function submitAdjustInventory(type, productId) {
  const qty = $("#adj-inv-qty").value;
  if (type === "ws") Storage.setWsInventoryQty(productId, qty);
  else Storage.setShopInventoryQty(productId, qty);
  toast("✅ Inventar yangilandi");
  closeModal();
  if (type === "ws") renderWorkshop();
  else renderShop();
}

/* ══════════════════════════════ GROUPS ══════════════════════════════ */
function renderGroups() {
  renderGroupList();
  renderTaskList();
  initTabs("#page-groups");
}

function renderGroupList() {
  const groups = Storage.getGroups(),
    tasks = Storage.getTasks();
  const el = $("#groups-list");
  if (groups.length === 0) {
    el.innerHTML =
      '<div class="empty"><div class="empty-icon">👥</div><p>Hali guruh yo\'q</p></div>';
    return;
  }
  el.innerHTML = groups
    .map((g) => {
      const gt = tasks.filter((t) => t.groupId === g.id);
      const active = gt.filter((t) => t.status === "active").length;
      const done = gt.filter((t) => t.status === "completed").length;
      return (
        '<div class="group-card">' +
        '<div class="group-color-ring" style="background:' +
        g.color +
        '">' +
        g.name.charAt(0) +
        "</div>" +
        '<div style="flex:1">' +
        '<div class="group-name">' +
        g.name +
        "</div>" +
        '<div class="group-stats">' +
        (active > 0
          ? '<span class="badge badge-blue">' + active + " faol</span>&nbsp;"
          : "") +
        (done > 0
          ? '<span class="badge badge-green">' + done + " bajarildi</span>"
          : "") +
        (gt.length === 0
          ? '<span class="badge badge-grey">Topshiriq yo\'q</span>'
          : "") +
        "</div>" +
        "</div>" +
        '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-primary" onclick="showAssignTaskModal(\'' +
        g.id +
        "','" +
        g.name +
        "')\">📋 Topshiriq</button>" +
        '<button class="btn btn-sm btn-ghost" onclick="showEditGroupModal(\'' +
        g.id +
        "')\">✏</button>" +
        '<button class="btn btn-sm btn-red" onclick="confirmDeleteGroup(\'' +
        g.id +
        "')\">🗑</button>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

function renderTaskList() {
  const tasks = Storage.getTasks();
  const el = $("#tasks-list");
  if (tasks.length === 0) {
    el.innerHTML =
      '<div class="empty"><div class="empty-icon">📋</div><p>Hali topshiriq yo\'q</p></div>';
    return;
  }
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  el.innerHTML = sorted.map(renderTaskCard).join("");
}

function renderTaskCard(t) {
  const prod = Storage.getProductById(t.productId);
  const grp = Storage.getGroupById(t.groupId);
  const pct = t.quantity > 0 ? Math.round((t.produced / t.quantity) * 100) : 0;
  const dlStatus = deadlineStatus(t.deadline);
  const isComplete = t.status === "completed";

  return (
    '<div class="task-card' +
    (isComplete ? " completed" : "") +
    '">' +
    '<div class="task-header">' +
    '<div class="task-product">' +
    (prod ? prod.icon : "📦") +
    " " +
    (prod ? prod.name : "Noma'lum") +
    "</div>" +
    '<div style="display:flex;align-items:center;gap:6px">' +
    (grp
      ? '<span class="task-group-tag" style="background:' +
        grp.color +
        '">' +
        grp.name +
        "</span>"
      : "") +
    (!isComplete
      ? '<button class="btn btn-sm btn-ghost" style="padding:4px 8px" onclick="showEditTaskModal(\'' +
        t.id +
        "')\">✏</button>"
      : "") +
    '<button class="btn btn-sm btn-red" style="padding:4px 8px" onclick="confirmDeleteTask(\'' +
    t.id +
    "')\">🗑</button>" +
    "</div>" +
    "</div>" +
    '<div class="task-meta">' +
    '<div class="task-meta-item">📅 <strong class="' +
    dlStatus +
    '">' +
    (t.deadline ? fmtDate(t.deadline) : "Muddatsiz") +
    "</strong></div>" +
    '<div class="task-meta-item">💰 <strong>' +
    fmtMoney(t.pricePerItem) +
    "/dona</strong></div>" +
    '<div class="task-meta-item">📦 <strong>' +
    fmtNum(t.produced) +
    " / " +
    fmtNum(t.quantity) +
    "</strong></div>" +
    (t.note ? '<div class="task-meta-item">📝 ' + t.note + "</div>" : "") +
    "</div>" +
    '<div class="task-progress-label"><span>Bajarilish</span><span>' +
    pct +
    "%</span></div>" +
    '<div class="progress-bar"><div class="progress-fill' +
    (isComplete ? " complete" : "") +
    '" style="width:' +
    pct +
    '%"></div></div>' +
    (!isComplete
      ? '<div class="task-actions">' +
        '<button class="btn btn-sm btn-primary" onclick="showProduceModal(\'' +
        t.id +
        "')\">🔨 Ishlab chiqarildi</button>" +
        '<span style="font-size:12px;color:var(--ink3);margin-left:4px">Qoldi: ' +
        fmtNum(t.quantity - t.produced) +
        " ta</span>" +
        "</div>"
      : '<div style="margin-top:10px"><span class="badge badge-green">✅ Bajarildi</span></div>') +
    "</div>"
  );
}

function showCreateGroupModal() {
  openModal(
    modalHeader("👥 Yangi guruh yaratish") +
      `
    <div class="form-group"><label class="form-label">Guruh nomi *</label>
      <input type="text" id="grp-name" placeholder="Masalan: D Guruh"/></div>
    <div class="form-group"><label class="form-label">Rang</label>
      ${colorPickerHtml("#2563eb")}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitCreateGroup()">✅ Yaratish</button>
    </div>`,
  );
}

function submitCreateGroup() {
  const name = $("#grp-name").value.trim(),
    color = $("#color-val").value;
  if (!name) {
    toast("Guruh nomini kiriting", "error");
    return;
  }
  const r = Storage.createGroup(name, color);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast('✅ "' + name + '" guruhi yaratildi');
  closeModal();
  renderGroups();
}

function showEditGroupModal(id) {
  const g = Storage.getGroupById(id);
  if (!g) return;
  openModal(
    modalHeader("✏ Guruhni tahrirlash") +
      `
    <div class="form-group"><label class="form-label">Guruh nomi *</label>
      <input type="text" id="egrp-name" value="${g.name}"/></div>
    <div class="form-group"><label class="form-label">Rang</label>
      ${colorPickerHtml(g.color)}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitEditGroup('${id}')">💾 Saqlash</button>
    </div>`,
  );
}

function submitEditGroup(id) {
  const name = $("#egrp-name").value.trim(),
    color = $("#color-val").value;
  if (!name) {
    toast("Nomini kiriting", "error");
    return;
  }
  const r = Storage.updateGroup(id, name, color);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ Guruh yangilandi");
  closeModal();
  renderGroups();
}

function confirmDeleteGroup(id) {
  const g = Storage.getGroupById(id);
  if (!g) return;
  if (!confirm('"' + g.name + "\" guruhini o'chirasizmi?")) return;
  const r = Storage.deleteGroup(id);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("🗑 Guruh o'chirildi");
  renderGroups();
}

function showAssignTaskModal(groupId, groupName) {
  openModal(
    modalHeader("📋 Topshiriq berish — " + groupName) +
      `
    <div class="form-group"><label class="form-label">Mahsulot *</label>
      <select id="task-product">${productSelectHtml("")}</select></div>
    <div class="form-row cols-2">
      <div><label class="form-label">Miqdor (dona) *</label>
        <input type="number" id="task-qty" min="1" placeholder="50"/></div>
      <div><label class="form-label">Muddati</label>
        <input type="date" id="task-deadline"/></div>
    </div>
    <div class="form-group"><label class="form-label">Narx (1 dona, so'm)</label>
      <input type="number" id="task-price" min="0" placeholder="200000"/></div>
    <div class="form-group"><label class="form-label">Izoh</label>
      <textarea id="task-note" placeholder="Ixtiyoriy..."></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitAssignTask('${groupId}')">📋 Topshiriq berish</button>
    </div>`,
  );
}

function submitAssignTask(groupId) {
  const productId = $("#task-product").value,
    qty = $("#task-qty").value;
  const deadline = $("#task-deadline").value,
    price = $("#task-price").value;
  const note = $("#task-note").value.trim();
  if (!productId) {
    toast("Mahsulotni tanlang", "error");
    return;
  }
  if (!qty || parseInt(qty) <= 0) {
    toast("Miqdorni kiriting", "error");
    return;
  }
  const r = Storage.createTask(groupId, productId, qty, deadline, price, note);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ Topshiriq berildi");
  closeModal();
  renderGroups();
}

function showEditTaskModal(id) {
  const t = Storage.getTaskById(id);
  if (!t) return;
  const prod = Storage.getProductById(t.productId);
  openModal(
    modalHeader("✏ Topshiriqni tahrirlash — " + (prod ? prod.name : "")) +
      `
    <div class="info-box">Allaqachon ishlab chiqarilgan: <strong>${fmtNum(t.produced)} ta</strong> — bu qiymatdan kam kiritmang.</div>
    <div class="form-row cols-2">
      <div><label class="form-label">Jami miqdor *</label>
        <input type="number" id="et-qty" min="${t.produced}" value="${t.quantity}"/></div>
      <div><label class="form-label">Muddati</label>
        <input type="date" id="et-deadline" value="${t.deadline || ""}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Narx (1 dona, so'm)</label>
      <input type="number" id="et-price" value="${t.pricePerItem}"/></div>
    <div class="form-group"><label class="form-label">Izoh</label>
      <textarea id="et-note">${t.note || ""}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitEditTask('${id}')">💾 Saqlash</button>
    </div>`,
  );
}

function submitEditTask(id) {
  const r = Storage.updateTask(id, {
    quantity: $("#et-qty").value,
    deadline: $("#et-deadline").value,
    pricePerItem: $("#et-price").value,
    note: $("#et-note").value.trim(),
  });
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ Topshiriq yangilandi");
  closeModal();
  renderGroups();
}

function confirmDeleteTask(id) {
  var t = Storage.getTaskById(id);
  if (!t) return;
  var prod = Storage.getProductById(t.productId);
  var msg =
    '"' + (prod ? prod.name : "Topshiriq") + "\" topshiriqni o'chirasizmi?";
  if (t.produced > 0)
    msg +=
      "\n\nDiqqat: " +
      t.produced +
      " ta allaqachon ishlab chiqarilgan, lekin seh inventarida qoladi.";
  if (!confirm(msg)) return;
  var r = Storage.deleteTask(id);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("🗑 Topshiriq o'chirildi");
  renderGroups();
}

function showProduceModal(taskId) {
  const task = Storage.getTaskById(taskId);
  if (!task) return;
  const prod = Storage.getProductById(task.productId);
  const remaining = task.quantity - task.produced;
  openModal(
    modalHeader("🔨 Ishlab chiqarish — " + (prod ? prod.name : "")) +
      `
    <div class="info-box" style="background:var(--blue-lt)">
      Topshiriq: <strong>${fmtNum(task.quantity)}</strong> ta &nbsp;|&nbsp;
      Bajarildi: <strong>${fmtNum(task.produced)}</strong> ta &nbsp;|&nbsp;
      Qoldi: <strong style="color:var(--blue)">${fmtNum(remaining)}</strong> ta
    </div>
    <div class="form-group"><label class="form-label">Nechta ishlab chiqarildi? *</label>
      <input type="number" id="prod-qty" min="1" max="${remaining}" placeholder="${remaining}"/></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitProduce('${taskId}')">🔨 Tasdiqlash</button>
    </div>`,
  );
}

function submitProduce(taskId) {
  const qty = $("#prod-qty").value;
  if (!qty || parseInt(qty) <= 0) {
    toast("Miqdorni kiriting", "error");
    return;
  }
  const r = Storage.recordProduction(taskId, qty);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ " + fmtNum(qty) + " ta mahsulot seh inventariga qo'shildi");
  closeModal();
  renderGroups();
  if (currentPage === "workshop") renderWorkshop();
  if (currentPage === "dashboard") renderDashboard();
}

/* ══════════════════════════════ TRANSFER ══════════════════════════════ */
function renderTransfer() {
  const sel = $("#transfer-product");
  sel.innerHTML = productSelectHtml("", true, Storage.getWsInventory);
  renderTransferLog();
}

function renderTransferLog() {
  const logs = Storage.getLogsByType("transfer").slice(0, 30);
  $("#transfer-log").innerHTML =
    logs.length === 0
      ? '<div class="empty"><div class="empty-icon">🚚</div><p>Hali yuborish amalga oshirilmagan</p></div>'
      : '<div class="log-feed">' +
        logs.map((l) => renderLogRow(l, false)).join("") +
        "</div>";
}

function submitTransfer() {
  const productId = $("#transfer-product").value;
  const qty = parseInt($("#transfer-qty").value);
  if (!productId) {
    toast("Mahsulotni tanlang", "error");
    return;
  }
  if (!qty || qty <= 0) {
    toast("Miqdorni kiriting", "error");
    return;
  }
  const r = Storage.transferToShop(productId, qty);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  const prod = Storage.getProductById(productId);
  toast("✅ " + fmtNum(qty) + " ta " + prod.name + " do'konga yuborildi");
  $("#transfer-qty").value = "";
  $("#transfer-product").value = "";
  renderTransfer();
  if (currentPage === "dashboard") renderDashboard();
}

/* ══════════════════════════════ SHOP ══════════════════════════════ */
function renderShop() {
  renderShopInventory();
  populateSellSelect();
  renderSaleLog();
  initTabs("#page-shop");
}

function renderShopInventory() {
  const inv = Storage.getShopInventory(),
    products = Storage.getProducts();
  const el = $("#shop-inventory-body");
  el.innerHTML = products
    .map((p) => {
      const qty = inv[p.id] || 0;
      return (
        '<tr><td style="font-size:18px">' +
        p.icon +
        "</td>" +
        "<td><strong>" +
        p.name +
        "</strong></td>" +
        '<td><span class="qty-pill ' +
        qtyClass(qty) +
        '">' +
        fmtNum(qty) +
        "</span></td>" +
        "<td><button class=\"btn btn-sm btn-ghost\" onclick=\"showAdjustInventoryModal('shop','" +
        p.id +
        "','" +
        p.name +
        "'," +
        qty +
        ')">✏ Tuzatish</button></td>' +
        "</tr>"
      );
    })
    .join("");
}

function populateSellSelect() {
  const inv = Storage.getShopInventory(),
    products = Storage.getProducts();
  const sel = $("#sell-product");
  sel.innerHTML = '<option value="">-- Mahsulot tanlang --</option>';
  products.forEach((p) => {
    const qty = inv[p.id] || 0;
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent =
      p.icon + " " + p.name + " (" + fmtNum(qty) + " ta mavjud)";
    if (qty === 0) opt.disabled = true;
    sel.appendChild(opt);
  });
}

function renderSaleLog() {
  const logs = Storage.getLogsByType("sale").slice(0, 40);
  const el = $("#sale-log");
  if (logs.length === 0) {
    el.innerHTML =
      '<div class="empty"><div class="empty-icon">💰</div><p>Hali sotuv amalga oshirilmagan</p></div>';
    return;
  }
  el.innerHTML =
    '<div class="log-feed">' +
    logs.map((l) => renderLogRow(l, true)).join("") +
    "</div>";
}

function submitSale() {
  const productId = $("#sell-product").value;
  const qty = parseInt($("#sell-qty").value);
  const pricePerUnit = parseFloat($("#sell-price").value) || 0;
  const note = $("#sell-note").value.trim();

  if (!productId) {
    toast("Mahsulotni tanlang", "error");
    return;
  }
  if (!qty || qty <= 0) {
    toast("Miqdorni kiriting", "error");
    return;
  }

  const r = Storage.sellProduct(productId, qty, pricePerUnit, note);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }

  const prod = Storage.getProductById(productId);
  const total = pricePerUnit * qty;
  toast(
    "✅ " +
      fmtNum(qty) +
      " ta " +
      prod.name +
      " sotildi" +
      (total > 0 ? " — " + fmtMoney(total) : ""),
  );
  $("#sell-qty").value = "";
  $("#sell-price").value = "";
  $("#sell-note").value = "";
  renderShop();
  if (currentPage === "dashboard") renderDashboard();
}

/* ── Sale Edit / Delete ───────────────────────────────────────────────── */
function showEditSaleModal(logId) {
  const l = Storage.getLogById(logId);
  if (!l) return;
  openModal(
    modalHeader("✏ Sotuvni tahrirlash") +
      `
    <div class="info-box">
      Mahsulot: <strong>${l.productName}</strong> &nbsp;|&nbsp;
      Sana: <strong>${fmtDate(l.date)}</strong>
    </div>
    <div class="form-row cols-2">
      <div><label class="form-label">Miqdor *</label>
        <input type="number" id="es-qty" min="1" value="${l.quantity}"/></div>
      <div><label class="form-label">Narx (1 dona, so'm)</label>
        <input type="number" id="es-price" min="0" value="${l.pricePerUnit || 0}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Izoh</label>
      <input type="text" id="es-note" value="${l.note || ""}"/></div>
    <div class="modal-actions">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Bekor</button>
      <button class="btn btn-primary btn-full" onclick="submitEditSale('${logId}')">💾 Saqlash</button>
    </div>`,
  );
}

function submitEditSale(logId) {
  const qty = $("#es-qty").value,
    price = $("#es-price").value,
    note = $("#es-note").value.trim();
  if (!qty || parseInt(qty) <= 0) {
    toast("Miqdorni kiriting", "error");
    return;
  }
  const r = Storage.editSaleLog(logId, qty, price, note);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ Sotuv yangilandi");
  closeModal();
  renderShop();
  if (currentPage === "dashboard") renderDashboard();
}

function confirmDeleteSale(logId) {
  const l = Storage.getLogById(logId);
  if (!l) return;
  if (
    !confirm(
      '"' +
        l.productName +
        "\" sotuvini o'chirasizmi? Inventar qayta tiklanadi.",
    )
  )
    return;
  const r = Storage.deleteSaleLog(logId);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("🗑 Sotuv o'chirildi va inventar tiklandi");
  renderShop();
  if (currentPage === "dashboard") renderDashboard();
}

/* ══════════════════════════════ REPORTS ══════════════════════════════ */
function renderReports() {
  const r = Storage.getReportSummary();
  $("#rpt-total-produced").textContent = fmtNum(r.sum("production"));
  $("#rpt-total-transferred").textContent = fmtNum(r.sum("transfer"));
  $("#rpt-total-sold").textContent = fmtNum(r.sum("sale"));
  $("#rpt-total-revenue").textContent = fmtMoney(r.revenue);
  $("#rpt-today-sold").textContent = fmtNum(r.sumToday("sale"));
  $("#rpt-today-produced").textContent = fmtNum(r.sumToday("production"));
  $("#rpt-today-revenue").textContent = fmtMoney(r.todayRevenue);

  // Sales by product
  const sbp = Object.entries(r.salesByProduct).map(([name, v]) => ({
    label: name,
    val: v.qty,
    sub: fmtMoney(v.revenue),
  }));
  renderBarChart("#sales-by-product-chart", sbp, "bf-green");

  // Prod by product
  const pbp = Object.entries(r.prodByProduct).map(([name, val]) => ({
    label: name,
    val,
  }));
  renderBarChart("#prod-by-product-chart", pbp, "bf-blue");

  // Monthly
  const monthly = Object.entries(r.monthly)
    .sort()
    .map(([key, v]) => ({
      label: key,
      val: v.qty,
      sub: fmtMoney(v.revenue),
    }));
  renderBarChart("#monthly-sales-chart", monthly, "bf-amber");

  // Full log table
  const logs = Storage.getLogs();
  const tbody = $("#full-log-tbody");
  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7"><div class="empty"><div class="empty-icon">📋</div><p>Hali hech qanday harakat yo\'q</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = logs
    .slice(0, 100)
    .map(
      (l) => `
    <tr>
      <td>${fmtDate(l.date)} <span style="color:var(--ink3);font-size:11px">${fmtTime(l.date)}</span></td>
      <td>${logTypeBadge(l.type)}</td>
      <td>${l.productName || "—"}</td>
      <td><strong>${fmtNum(l.quantity)}</strong></td>
      <td>${l.pricePerUnit > 0 ? fmtMoney(l.pricePerUnit) : "—"}</td>
      <td>${l.totalPrice > 0 ? fmtMoney(l.totalPrice) : "—"}</td>
      <td style="font-size:12px;color:var(--ink3)">${l.note || "—"}${l.editedAt ? '<span style="color:var(--amber)"> ✏</span>' : ""}</td>
    </tr>`,
    )
    .join("");
}

function renderBarChart(selector, items, colorClass) {
  const el = $(selector);
  if (!el) return;
  if (items.length === 0) {
    el.innerHTML =
      '<div class="empty"><div class="empty-icon">📊</div><p>Ma\'lumot yo\'q</p></div>';
    return;
  }
  const max = Math.max(...items.map((i) => i.val));
  el.innerHTML =
    '<div class="bar-chart">' +
    items
      .slice(0, 12)
      .map(
        (item) => `
    <div class="bar-row">
      <div class="bar-label" title="${item.label}">${item.label}</div>
      <div class="bar-track">
        <div class="bar-fill ${colorClass}" style="width:${max > 0 ? Math.round((item.val / max) * 100) : 0}%"></div>
      </div>
      <div class="bar-val">${fmtNum(item.val)}${item.sub ? '<div style="font-size:10px;color:var(--ink3)">' + item.sub + "</div>" : ""}</div>
    </div>`,
      )
      .join("") +
    "</div>";
}

/* ══════════════════════════════ ARCHIVE ══════════════════════════════ */
function renderArchive() {
  const archives = Storage.getArchives();
  const months = Storage.getAvailableMonths();

  // Available months to archive
  const sel = $("#archive-month-sel");
  if (sel) {
    sel.innerHTML =
      '<option value="">-- Oy tanlang --</option>' +
      months
        .map((m) => {
          const [y, mo] = m.split("-");
          const names = [
            "",
            "Yanvar",
            "Fevral",
            "Mart",
            "Aprel",
            "May",
            "Iyun",
            "Iyul",
            "Avgust",
            "Sentabr",
            "Oktabr",
            "Noyabr",
            "Dekabr",
          ];
          return (
            '<option value="' +
            m +
            '">' +
            names[parseInt(mo)] +
            " " +
            y +
            "</option>"
          );
        })
        .join("");
  }

  // Archive list
  const el = $("#archive-list");
  if (archives.length === 0) {
    el.innerHTML =
      '<div class="empty"><div class="empty-icon">🗄</div><p>Hali arxiv yo\'q. Oy tugagandan so\'ng "Arxivlash" tugmasini bosing.</p></div>';
    return;
  }
  el.innerHTML = archives
    .map(
      (a) => `
    <div class="archive-card">
      <div class="archive-card-header">
        <div class="archive-month-label">🗓 ${a.label}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:11px;color:var(--ink3)">Arxivlangan: ${fmtDate(a.archivedAt)}</span>
          <button class="btn btn-sm btn-primary" onclick="showArchiveDetail('${a.id}')">📋 Ko'rish</button>
          <button class="btn btn-sm btn-red" onclick="confirmDeleteArchive('${a.id}')">🗑</button>
        </div>
      </div>
      <div class="g4" style="margin-top:12px">
        <div class="archive-stat"><div class="archive-stat-val">${fmtNum(a.summary.totalSold)}</div><div class="archive-stat-lbl">Sotilgan</div></div>
        <div class="archive-stat"><div class="archive-stat-val">${fmtMoney(a.summary.totalRevenue)}</div><div class="archive-stat-lbl">Daromad</div></div>
        <div class="archive-stat"><div class="archive-stat-val">${fmtNum(a.summary.totalProduced)}</div><div class="archive-stat-lbl">Ishlab chiqarilgan</div></div>
        <div class="archive-stat"><div class="archive-stat-val">${fmtNum(a.summary.totalTransferred)}</div><div class="archive-stat-lbl">Yuborilgan</div></div>
      </div>
    </div>`,
    )
    .join("");
}

function submitArchiveMonth() {
  const key = $("#archive-month-sel").value;
  if (!key) {
    toast("Oyni tanlang", "error");
    return;
  }
  if (
    !confirm("Bu oyning barcha yozuvlari arxivga ko'chiriladi. Davom etasizmi?")
  )
    return;
  const r = Storage.archiveMonth(key);
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ " + r.archive.label + " arxivlandi");
  renderArchive();
}

function submitArchiveCurrentMonth() {
  if (
    !confirm(
      "Joriy oyning barcha yozuvlari arxivga ko'chiriladi. Davom etasizmi?",
    )
  )
    return;
  const r = Storage.archiveCurrentMonth();
  if (!r.ok) {
    toast(r.msg, "error");
    return;
  }
  toast("✅ " + r.archive.label + " arxivlandi");
  renderArchive();
}

function showArchiveDetail(archiveId) {
  const a = Storage.getArchiveById(archiveId);
  if (!a) return;
  const products = Storage.getProducts();

  const salesRows = Object.entries(a.summary.salesByProduct)
    .map(
      ([pid, d]) =>
        "<tr><td>" +
        d.name +
        "</td><td>" +
        fmtNum(d.qty) +
        "</td><td>" +
        fmtMoney(d.revenue) +
        "</td></tr>",
    )
    .join("");

  openModal(
    modalHeader("📋 " + a.label + " — Arxiv hisoboti") +
      `
    <div class="g4 section-gap-sm">
      <div class="archive-stat-inline"><strong>${fmtNum(a.summary.totalSold)}</strong><span>Sotilgan</span></div>
      <div class="archive-stat-inline"><strong>${fmtMoney(a.summary.totalRevenue)}</strong><span>Daromad</span></div>
      <div class="archive-stat-inline"><strong>${fmtNum(a.summary.totalProduced)}</strong><span>Ishlab chiqarilgan</span></div>
      <div class="archive-stat-inline"><strong>${fmtNum(a.summary.totalTransferred)}</strong><span>Yuborilgan</span></div>
    </div>
    <div class="divider"></div>
    <div class="card-title" style="margin-bottom:10px">💰 Mahsulot bo'yicha sotuv</div>
    ${salesRows ? '<table class="data-table"><thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Daromad</th></tr></thead><tbody>' + salesRows + "</tbody></table>" : '<p style="color:var(--ink3);font-size:13px">Sotuv yo\'q</p>'}
    <div class="divider"></div>
    <div class="card-title" style="margin-bottom:10px">📦 Oy oxiri inventar holati</div>
    <div class="form-row cols-2">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--ink3);margin-bottom:8px">SEH</div>
        ${products.map((p) => '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span>' + p.icon + " " + p.name + "</span><strong>" + (a.snapshots.wsInventory[p.id] || 0) + "</strong></div>").join("")}
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--ink3);margin-bottom:8px">DO'KON</div>
        ${products.map((p) => '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span>' + p.icon + " " + p.name + "</span><strong>" + (a.snapshots.shopInventory[p.id] || 0) + "</strong></div>").join("")}
      </div>
    </div>
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Yopish</button>
    </div>`,
    true,
  );
}

function confirmDeleteArchive(id) {
  const a = Storage.getArchiveById(id);
  if (!a) return;
  if (
    !confirm(
      '"' + a.label + "\" arxivini o'chirasizmi? Bu amal qaytarib bo'lmaydi.",
    )
  )
    return;
  Storage.deleteArchive(id);
  toast("🗑 Arxiv o'chirildi");
  renderArchive();
}

/* ══════════════════════════════ RESET ══════════════════════════════ */
function confirmReset() {
  if (confirm("Barcha ma'lumotlar o'chiriladi. Davom etasizmi?")) {
    Storage.resetAll();
    toast("✅ Ma'lumotlar tozalandi");
    navigate("dashboard");
  }
}

/* ══════════════════════════════ CLOCK ══════════════════════════════ */
function updateClock() {
  const el = $("#topbar-date");
  if (el)
    el.textContent = new Date().toLocaleDateString("uz-UZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
}

/* ══════════════════════════════ INIT ══════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  Storage.seed();
  $$(".nav-item").forEach((item) =>
    item.addEventListener("click", () => navigate(item.dataset.page)),
  );
  updateClock();
  setInterval(updateClock, 60000);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  navigate("dashboard");
});
