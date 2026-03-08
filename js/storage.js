/**
 * STORAGE MODULE v4
 * — Edit & delete for all entities
 * — Monthly archive system
 * — Sale log fix (pricePerUnit + totalPrice)
 * — Group passwords (for worker login)
 * — Backend-ready: all ops wrapped in functions
 */
var Storage = (function () {
  var KEYS = {
    PRODUCTS:  'smb3_products',
    GROUPS:    'smb3_groups',
    TASKS:     'smb3_tasks',
    WS_INV:    'smb3_ws_inventory',
    SHOP_INV:  'smb3_shop_inventory',
    MAT_INV:   'smb3_mat_inventory',
    LOGS:      'smb3_logs',
    ARCHIVES:  'smb3_archives',
  };

  var DEFAULT_PRODUCTS = [
    { id:'p1', name:"Kastyum/Shim", icon:'👔', unit:'dona' },
    { id:'p2', name:"Futbolka",     icon:'👕', unit:'dona' },
    { id:'p3', name:"Ko'ylak",      icon:'👗', unit:'dona' },
    { id:'p4', name:"Kepka",        icon:'🧢', unit:'dona' },
    { id:'p5', name:"Poyabzal",     icon:'👟', unit:'juft' },
  ];

  var DEFAULT_MATERIALS = [
    { id:'m1', name:'Material (mato)', icon:'🧵', unit:'metr' },
    { id:'m2', name:'Ip',              icon:'🪡', unit:'dona' },
    { id:'m3', name:'Ichki gazlama',   icon:'🧶', unit:'metr' },
    { id:'m4', name:'Tashqi gazlama',  icon:'🪢', unit:'metr' },
  ];

  var DEFAULT_GROUPS = [
    { id:'g1', name:'A Guruh', color:'#2563eb', password:'guruh1', createdAt: new Date().toISOString() },
    { id:'g2', name:'B Guruh', color:'#059669', password:'guruh2', createdAt: new Date().toISOString() },
    { id:'g3', name:'C Guruh', color:'#d97706', password:'guruh3', createdAt: new Date().toISOString() },
  ];

  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function seed() {
    if (!_get(KEYS.PRODUCTS))  _set(KEYS.PRODUCTS,  DEFAULT_PRODUCTS);
    if (!_get(KEYS.GROUPS))    _set(KEYS.GROUPS,    DEFAULT_GROUPS);
    if (!_get(KEYS.TASKS))     _set(KEYS.TASKS,     []);
    if (!_get(KEYS.WS_INV))    _set(KEYS.WS_INV,    {});
    if (!_get(KEYS.SHOP_INV))  _set(KEYS.SHOP_INV,  {});
    if (!_get(KEYS.MAT_INV)) {
      const inv = {};
      DEFAULT_MATERIALS.forEach(m => inv[m.id] = 0);
      _set(KEYS.MAT_INV, inv);
    }
    if (!_get(KEYS.LOGS))     _set(KEYS.LOGS,     []);
    if (!_get(KEYS.ARCHIVES)) _set(KEYS.ARCHIVES, []);
  }

  /* ── Products ─────────────────────────────────────────────────────────── */
  function getProducts()      { return _get(KEYS.PRODUCTS) || []; }
  function getProductById(id) { return getProducts().find(p => p.id === id) || null; }
  function getMaterials()     { return DEFAULT_MATERIALS; }
  function getMaterialById(id){ return DEFAULT_MATERIALS.find(m => m.id === id) || null; }

  function createProduct(name, icon, unit) {
    const list = getProducts();
    if (list.find(p => p.name.toLowerCase() === name.toLowerCase()))
      return { ok:false, msg:'Bu nomli mahsulot allaqachon mavjud.' };
    const p = { id:'p'+Date.now(), name:name.trim(), icon:icon||'📦', unit:unit||'dona' };
    list.push(p);
    _set(KEYS.PRODUCTS, list);
    return { ok:true, product:p };
  }

  function updateProduct(id, name, icon, unit) {
    const list = getProducts();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return { ok:false, msg:'Topilmadi.' };
    if (list.find(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))
      return { ok:false, msg:'Bu nomli mahsulot allaqachon mavjud.' };
    list[idx] = { ...list[idx], name:name.trim(), icon:icon||list[idx].icon, unit:unit||list[idx].unit };
    _set(KEYS.PRODUCTS, list);
    return { ok:true };
  }

  function deleteProduct(id) {
    if (getTasks().find(t => t.productId === id && t.status === 'active'))
      return { ok:false, msg:'Bu mahsulot faol topshiriqda ishlatilmoqda.' };
    _set(KEYS.PRODUCTS, getProducts().filter(p => p.id !== id));
    return { ok:true };
  }

  /* ── Groups ───────────────────────────────────────────────────────────── */
  function getGroups()      { return _get(KEYS.GROUPS) || []; }
  function getGroupById(id) { return getGroups().find(g => g.id === id) || null; }

  function createGroup(name, color) {
    const list = getGroups();
    if (list.find(g => g.name.toLowerCase() === name.toLowerCase()))
      return { ok:false, msg:'Bu nomli guruh allaqachon mavjud.' };
    const g = { id:'g'+Date.now(), name:name.trim(), color:color||'#2563eb', createdAt:new Date().toISOString() };
    list.push(g);
    _set(KEYS.GROUPS, list);
    return { ok:true, group:g };
  }

  function updateGroup(id, name, color) {
    const list = getGroups();
    const idx = list.findIndex(g => g.id === id);
    if (idx === -1) return { ok:false, msg:'Topilmadi.' };
    if (list.find(g => g.id !== id && g.name.toLowerCase() === name.toLowerCase()))
      return { ok:false, msg:'Bu nomli guruh allaqachon mavjud.' };
    list[idx] = { ...list[idx], name:name.trim(), color:color||list[idx].color };
    _set(KEYS.GROUPS, list);
    return { ok:true };
  }

  function deleteGroup(id) {
    if (getTasks().find(t => t.groupId === id && t.status === 'active'))
      return { ok:false, msg:'Bu guruhda faol topshiriqlar bor. Avval topshiriqlarni o\'chiring.' };
    _set(KEYS.GROUPS, getGroups().filter(g => g.id !== id));
    return { ok:true };
  }

  /* ── Tasks ────────────────────────────────────────────────────────────── */
  function getTasks()      { return _get(KEYS.TASKS) || []; }
  function getTaskById(id) { return getTasks().find(t => t.id === id) || null; }

  function createTask(groupId, productId, quantity, deadline, pricePerItem, note) {
    const tasks = getTasks();
    const t = {
      id: 'task'+Date.now(),
      groupId, productId,
      quantity: parseInt(quantity),
      produced: 0,
      deadline: deadline || '',
      pricePerItem: parseFloat(pricePerItem) || 0,
      note: note || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    tasks.push(t);
    _set(KEYS.TASKS, tasks);
    return { ok:true, task:t };
  }

  function updateTask(id, fields) {
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return { ok:false, msg:'Topilmadi.' };
    if (fields.quantity !== undefined) {
      const nq = parseInt(fields.quantity);
      if (nq < tasks[idx].produced)
        return { ok:false, msg:`Miqdor ${tasks[idx].produced} tadan kam bo'lishi mumkin emas.` };
      tasks[idx].quantity = nq;
      tasks[idx].status = nq <= tasks[idx].produced ? 'completed' : 'active';
    }
    if (fields.deadline     !== undefined) tasks[idx].deadline     = fields.deadline;
    if (fields.pricePerItem !== undefined) tasks[idx].pricePerItem = parseFloat(fields.pricePerItem) || 0;
    if (fields.note         !== undefined) tasks[idx].note         = fields.note;
    _set(KEYS.TASKS, tasks);
    return { ok:true };
  }

  function deleteTask(id) {
    const task = getTaskById(id);
    if (!task) return { ok:false, msg:'Topilmadi.' };
    if (task.produced > 0)
      return { ok:false, msg:`${task.produced} ta allaqachon ishlab chiqarilgan. O'chirib bo'lmaydi.` };
    _set(KEYS.TASKS, getTasks().filter(t => t.id !== id));
    return { ok:true };
  }

  function recordProduction(taskId, qty) {
    const tasks = getTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return { ok:false, msg:'Topshiriq topilmadi.' };
    const task = tasks[idx];
    qty = parseInt(qty);
    if (qty <= 0) return { ok:false, msg:'Musbat son kiriting.' };
    const remaining = task.quantity - task.produced;
    if (qty > remaining) return { ok:false, msg:`Faqat ${remaining} ta qolgan.` };

    tasks[idx].produced += qty;
    if (tasks[idx].produced >= tasks[idx].quantity) tasks[idx].status = 'completed';
    _set(KEYS.TASKS, tasks);

    const inv = _get(KEYS.WS_INV) || {};
    inv[task.productId] = (inv[task.productId] || 0) + qty;
    _set(KEYS.WS_INV, inv);

    const prod = getProductById(task.productId);
    const grp  = getGroupById(task.groupId);
    addLog({
      type: 'production',
      productId: task.productId,
      productName: prod ? prod.name : '?',
      quantity: qty,
      source: grp ? grp.name : 'Seh',
      destination: 'Seh inventar',
      pricePerUnit: task.pricePerItem,
      totalPrice: task.pricePerItem * qty,
      note: 'Topshiriq #' + taskId.slice(-6),
    });

    return { ok:true, task:tasks[idx] };
  }

  /* ── Inventory ────────────────────────────────────────────────────────── */
  function getWsInventory()   { return _get(KEYS.WS_INV)   || {}; }
  function getShopInventory() { return _get(KEYS.SHOP_INV) || {}; }
  function getMatInventory()  { return _get(KEYS.MAT_INV)  || {}; }

  function setWsInventoryQty(productId, qty) {
    const inv = getWsInventory();
    inv[productId] = Math.max(0, parseInt(qty) || 0);
    _set(KEYS.WS_INV, inv);
    return { ok:true };
  }

  function setShopInventoryQty(productId, qty) {
    const inv = getShopInventory();
    inv[productId] = Math.max(0, parseInt(qty) || 0);
    _set(KEYS.SHOP_INV, inv);
    return { ok:true };
  }

  function addMaterial(matId, qty) {
    qty = parseInt(qty);
    if (qty <= 0) return { ok:false, msg:'Musbat son kiriting.' };
    const inv = getMatInventory();
    inv[matId] = (inv[matId] || 0) + qty;
    _set(KEYS.MAT_INV, inv);
    const mat = getMaterialById(matId);
    addLog({ type:'material_add', productId:matId, productName:mat?mat.name:'?',
             quantity:qty, source:'Tashqaridan', destination:'Seh material',
             pricePerUnit:0, totalPrice:0, note:'' });
    return { ok:true };
  }

  function setMatInventoryQty(matId, qty) {
    const inv = getMatInventory();
    inv[matId] = Math.max(0, parseInt(qty) || 0);
    _set(KEYS.MAT_INV, inv);
    return { ok:true };
  }

  /* ── Transfer ─────────────────────────────────────────────────────────── */
  function transferToShop(productId, qty) {
    qty = parseInt(qty);
    if (qty <= 0) return { ok:false, msg:'Musbat son kiriting.' };
    const wsInv = getWsInventory();
    const available = wsInv[productId] || 0;
    if (qty > available)
      return { ok:false, msg:'Sehda faqat ' + available + ' ta mavjud.' };

    wsInv[productId] = available - qty;
    _set(KEYS.WS_INV, wsInv);
    const shopInv = getShopInventory();
    shopInv[productId] = (shopInv[productId] || 0) + qty;
    _set(KEYS.SHOP_INV, shopInv);

    const prod = getProductById(productId);
    addLog({ type:'transfer', productId, productName:prod?prod.name:'?',
             quantity:qty, source:'Seh', destination:"Do'kon",
             pricePerUnit:0, totalPrice:0, note:'' });
    return { ok:true };
  }

  /* ── Sales ────────────────────────────────────────────────────────────── */
  function sellProduct(productId, qty, pricePerUnit, note) {
    qty = parseInt(qty);
    pricePerUnit = parseFloat(pricePerUnit) || 0;
    if (qty <= 0) return { ok:false, msg:'Musbat son kiriting.' };
    const shopInv = getShopInventory();
    const available = shopInv[productId] || 0;
    if (qty > available)
      return { ok:false, msg:"Do'konda faqat " + available + ' ta mavjud.' };

    shopInv[productId] = available - qty;
    _set(KEYS.SHOP_INV, shopInv);

    const prod = getProductById(productId);
    addLog({ type:'sale', productId, productName:prod?prod.name:'?',
             quantity:qty, source:"Do'kon", destination:'Mijoz',
             pricePerUnit, totalPrice: pricePerUnit * qty, note:note||'' });
    return { ok:true };
  }

  function editSaleLog(logId, newQty, newPricePerUnit, newNote) {
    const logs = getLogs();
    const idx = logs.findIndex(l => l.id === logId);
    if (idx === -1) return { ok:false, msg:'Yozuv topilmadi.' };
    const log = logs[idx];
    if (log.type !== 'sale') return { ok:false, msg:'Faqat sotuv yozuvlarini tahrirlash mumkin.' };

    newQty = parseInt(newQty);
    newPricePerUnit = parseFloat(newPricePerUnit) || 0;
    const diff = newQty - log.quantity;
    const shopInv = getShopInventory();
    const currentQty = shopInv[log.productId] || 0;
    const newShopQty = currentQty - diff;
    if (newShopQty < 0)
      return { ok:false, msg:"Do'kon inventarida yetarli mahsulot yo'q (" + currentQty + ' ta mavjud).' };

    shopInv[log.productId] = newShopQty;
    _set(KEYS.SHOP_INV, shopInv);

    logs[idx] = { ...logs[idx], quantity:newQty, pricePerUnit:newPricePerUnit,
                  totalPrice:newQty*newPricePerUnit, note:newNote||logs[idx].note,
                  editedAt:new Date().toISOString() };
    _set(KEYS.LOGS, logs);
    return { ok:true };
  }

  function deleteSaleLog(logId) {
    const logs = getLogs();
    const idx = logs.findIndex(l => l.id === logId);
    if (idx === -1) return { ok:false, msg:'Yozuv topilmadi.' };
    const log = logs[idx];
    if (log.type !== 'sale') return { ok:false, msg:"Faqat sotuv yozuvlarini o'chirish mumkin." };
    const shopInv = getShopInventory();
    shopInv[log.productId] = (shopInv[log.productId] || 0) + log.quantity;
    _set(KEYS.SHOP_INV, shopInv);
    _set(KEYS.LOGS, logs.filter(l => l.id !== logId));
    return { ok:true };
  }

  /* ── Logs ─────────────────────────────────────────────────────────────── */
  function getLogs()           { return _get(KEYS.LOGS) || []; }
  function getRecentLogs(n)    { return getLogs().slice(0, n||25); }
  function getLogsByType(type) { return getLogs().filter(l => l.type === type); }
  function getLogById(id)      { return getLogs().find(l => l.id === id) || null; }

  function addLog(entry) {
    const logs = getLogs();
    logs.unshift({ id:'log'+Date.now()+Math.random().toString(36).slice(2,6),
                   date:new Date().toISOString(), editedAt:null, ...entry });
    _set(KEYS.LOGS, logs);
  }

  function getLogsFiltered({ type, productId, from, to } = {}) {
    let logs = getLogs();
    if (type)      logs = logs.filter(l => l.type === type);
    if (productId) logs = logs.filter(l => l.productId === productId);
    if (from)      logs = logs.filter(l => l.date >= from);
    if (to)        logs = logs.filter(l => l.date <= to);
    return logs;
  }

  /* ── Archive ──────────────────────────────────────────────────────────── */
  function getArchives() { return _get(KEYS.ARCHIVES) || []; }

  function _monthLabel(key) {
    const [y, m] = key.split('-');
    const names = ['','Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
    return names[parseInt(m)] + ' ' + y;
  }

  function _buildArchive(monthKey, logs) {
    const ml = logs.filter(l => l.date.startsWith(monthKey));
    const sl = ml.filter(l => l.type === 'sale');
    const pl = ml.filter(l => l.type === 'production');
    const tl = ml.filter(l => l.type === 'transfer');
    const totalSold      = sl.reduce((s,l)=>s+l.quantity,0);
    const totalRevenue   = sl.reduce((s,l)=>s+(l.totalPrice||0),0);
    const totalProduced  = pl.reduce((s,l)=>s+l.quantity,0);
    const totalTransferred = tl.reduce((s,l)=>s+l.quantity,0);
    const salesByProduct = {};
    sl.forEach(l => {
      if (!salesByProduct[l.productId]) salesByProduct[l.productId]={name:l.productName,qty:0,revenue:0};
      salesByProduct[l.productId].qty     += l.quantity;
      salesByProduct[l.productId].revenue += (l.totalPrice||0);
    });
    return {
      id: 'arch'+Date.now(),
      monthKey, label:_monthLabel(monthKey),
      archivedAt: new Date().toISOString(),
      snapshots: { wsInventory:{...getWsInventory()}, shopInventory:{...getShopInventory()} },
      summary: { totalSold, totalRevenue, totalProduced, totalTransferred, salesByProduct },
      logs: ml,
    };
  }

  function archiveMonth(monthKey) {
    const archives = getArchives();
    if (archives.find(a => a.monthKey === monthKey))
      return { ok:false, msg:_monthLabel(monthKey)+' oyi allaqachon arxivlangan.' };
    const logs = getLogs();
    const ml = logs.filter(l => l.date.startsWith(monthKey));
    if (ml.length === 0) return { ok:false, msg:'Bu oyda hech qanday yozuv topilmadi.' };
    const archive = _buildArchive(monthKey, logs);
    archives.unshift(archive);
    _set(KEYS.ARCHIVES, archives);
    _set(KEYS.LOGS, logs.filter(l => !l.date.startsWith(monthKey)));
    return { ok:true, archive };
  }

  function archiveCurrentMonth() {
    const now = new Date();
    const key = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    return archiveMonth(key);
  }

  function getArchiveById(id)  { return getArchives().find(a => a.id === id) || null; }
  function deleteArchive(id)   { _set(KEYS.ARCHIVES, getArchives().filter(a => a.id !== id)); return { ok:true }; }

  function getAvailableMonths() {
    const archived = new Set(getArchives().map(a => a.monthKey));
    const months = new Set(getLogs().map(l => l.date.slice(0,7)));
    return [...months].filter(m => !archived.has(m)).sort().reverse();
  }

  /* ── Reports ──────────────────────────────────────────────────────────── */
  function getReportSummary() {
    const logs  = getLogs();
    const today = new Date().toDateString();

    const sum = (type) => logs.filter(l=>l.type===type).reduce((s,l)=>s+l.quantity,0);
    const sumToday = (type) => logs.filter(l=>l.type===type&&new Date(l.date).toDateString()===today).reduce((s,l)=>s+l.quantity,0);
    const revenue = logs.filter(l=>l.type==='sale').reduce((s,l)=>s+(l.totalPrice||0),0);
    const todayRevenue = logs.filter(l=>l.type==='sale'&&new Date(l.date).toDateString()===today).reduce((s,l)=>s+(l.totalPrice||0),0);

    const salesByProduct = {};
    logs.filter(l=>l.type==='sale').forEach(l=>{
      if (!salesByProduct[l.productName]) salesByProduct[l.productName]={qty:0,revenue:0};
      salesByProduct[l.productName].qty     += l.quantity;
      salesByProduct[l.productName].revenue += (l.totalPrice||0);
    });

    const prodByProduct = {};
    logs.filter(l=>l.type==='production').forEach(l=>{
      prodByProduct[l.productName]=(prodByProduct[l.productName]||0)+l.quantity;
    });

    const monthly = {};
    logs.filter(l=>l.type==='sale').forEach(l=>{
      const m = l.date.slice(0,7);
      if (!monthly[m]) monthly[m]={qty:0,revenue:0};
      monthly[m].qty     += l.quantity;
      monthly[m].revenue += (l.totalPrice||0);
    });

    return { sum, sumToday, revenue, todayRevenue, salesByProduct, prodByProduct, monthly };
  }

  /* ── Reset ────────────────────────────────────────────────────────────── */
  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    seed();
  }

  return {
    seed, resetAll,
    getProducts, getProductById, getMaterials, getMaterialById,
    createProduct, updateProduct, deleteProduct,
    getGroups, getGroupById, createGroup, updateGroup, deleteGroup,
    getTasks, getTaskById, createTask, updateTask, deleteTask, recordProduction,
    getWsInventory, getShopInventory, getMatInventory,
    setWsInventoryQty, setShopInventoryQty, setMatInventoryQty, addMaterial,
    transferToShop, sellProduct, editSaleLog, deleteSaleLog,
    getLogs, getRecentLogs, getLogsByType, getLogById, addLog, getLogsFiltered,
    getArchives, archiveMonth, archiveCurrentMonth, getArchiveById,
    deleteArchive, getAvailableMonths,
    getReportSummary,
  };
})();
