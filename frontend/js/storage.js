/**
 * STORAGE.JS — BiznesApp v4 (Full-Stack versiya)
 *
 * O'ZGARGAN: localStorage._get/_set → XHR (sync) → REST API
 * O'ZGARMAGAN: Public API — barcha funksiya nomlari va qaytarish formati
 * admin.js va worker.js da HECH NARSA o'zgarmaydi
 *
 * Nima uchun sync XHR?
 * admin.js sinxron (callback yo'q, Promise yo'q) yozilgan.
 * Uni o'zgartirmaslik uchun XHR sync rejimida ishlatamiz.
 * (Haqiqiy production da async/await bilan yozish kerak — bu oraliq qadam)
 */

var Storage = (function () {

  // ── HTTP yordamchi funksiyalar ─────────────────────────────
  function _req(method, url, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, false); // false = SYNC
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Auth token qo'shamiz
    var headers = Auth.getAuthHeader();
    Object.keys(headers).forEach(function(k) {
      xhr.setRequestHeader(k, headers[k]);
    });

    xhr.send(body ? JSON.stringify(body) : null);

    try {
      var res = JSON.parse(xhr.responseText);
      return res;
    } catch(e) {
      return { ok: false, msg: 'Server javob bermadi.', data: null };
    }
  }

  function _get(url)              { return _req('GET',    url, null); }
  function _post(url, body)       { return _req('POST',   url, body); }
  function _put(url, body)        { return _req('PUT',    url, body); }
  function _delete(url)           { return _req('DELETE', url, null); }

  // Materiallar — backend ga bormaydi, lokal
  var MATERIALS = [
    { id: 'mat-1', name: 'Mato',           icon: '🧵', unit: 'metr' },
    { id: 'mat-2', name: 'Ip',             icon: '🪡', unit: 'dona' },
    { id: 'mat-3', name: 'Ichki gazlama',  icon: '🧶', unit: 'metr' },
    { id: 'mat-4', name: 'Tashqi gazlama', icon: '🪢', unit: 'metr' },
  ];

  // ── Seed (backend qiladi, bu yerda bo'sh) ─────────────────
  function seed() { /* Backend server.js da qiladi */ }
  function resetAll() {
    if (confirm('BARCHA ma\'lumotlar o\'chadi! Backend DB tozalanadi!')) {
      alert('resetAll funksiyasi backend orqali ishlamaydi. DB ni pgAdmin dan tozalang.');
    }
  }

  // ══════════════════════════════════════════════════════════
  // PRODUCTS
  // ══════════════════════════════════════════════════════════
  function getProducts() {
    var res = _get('/api/products');
    return res.data || [];
  }
  function getProductById(id) {
    var list = getProducts();
    return list.find(function(p){ return p.id === id; }) || null;
  }
  function getMaterials()      { return MATERIALS; }
  function getMaterialById(id) { return MATERIALS.find(function(m){ return m.id === id; }) || null; }

  function createProduct(name, icon, unit) {
    return _post('/api/products', { name, icon, unit });
  }
  function updateProduct(id, name, icon, unit) {
    return _put('/api/products/' + id, { name, icon, unit });
  }
  function deleteProduct(id) {
    return _delete('/api/products/' + id);
  }

  // ══════════════════════════════════════════════════════════
  // GROUPS
  // ══════════════════════════════════════════════════════════
  function getGroups() {
    var res = _get('/api/groups');
    return res.data || [];
  }
  function getGroupById(id) {
    var list = getGroups();
    return list.find(function(g){ return g.id === id; }) || null;
  }
  function createGroup(name, color, password) {
    return _post('/api/groups', { name, color, password });
  }
  function updateGroup(id, name, color) {
    return _put('/api/groups/' + id, { name, color });
  }
  function deleteGroup(id) {
    return _delete('/api/groups/' + id);
  }

  // ══════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════
  function getTasks() {
    var res = _get('/api/tasks');
    if (!res.data) return [];
    // admin.js kutgan formatga moslashtir
    return res.data.map(function(t) {
      return {
        id:           t.id,
        groupId:      t.groupId,
        productId:    t.productId,
        quantity:     t.quantity,
        produced:     t.produced,
        deadline:     t.deadline || '',
        pricePerItem: parseFloat(t.pricePerItem) || 0,
        note:         t.note || '',
        status:       t.status,
        createdAt:    t.createdAt
      };
    });
  }
  function getTaskById(id) {
    var list = getTasks();
    return list.find(function(t){ return t.id === id; }) || null;
  }
  function createTask(groupId, productId, quantity, deadline, pricePerItem, note) {
    return _post('/api/tasks', { groupId, productId, quantity, deadline, pricePerItem, note });
  }
  function updateTask(id, fields) {
    return _put('/api/tasks/' + id, fields);
  }
  function deleteTask(id) {
    return _delete('/api/tasks/' + id);
  }
  function recordProduction(taskId, qty) {
    return _post('/api/tasks/' + taskId + '/produce', { qty: parseInt(qty) });
  }

  // ══════════════════════════════════════════════════════════
  // INVENTORY
  // ══════════════════════════════════════════════════════════
  function _buildInvObj(items) {
    // admin.js { productId: quantity } formatini kutadi
    var obj = {};
    (items || []).forEach(function(i){ obj[i.productId] = i.quantity; });
    return obj;
  }

  function getWsInventory() {
    var res = _get('/api/inventory/workshop');
    return _buildInvObj(res.data);
  }
  function getShopInventory() {
    var res = _get('/api/inventory/shop');
    return _buildInvObj(res.data);
  }
  function getMatInventory() {
    var res = _get('/api/inventory/materials');
    var obj = {};
    (res.data || []).forEach(function(m){ obj[m.id] = m.quantity; });
    return obj;
  }

  function setWsInventoryQty(productId, qty) {
    return _put('/api/inventory/adjust', { productId, location: 'workshop', quantity: qty });
  }
  function setShopInventoryQty(productId, qty) {
    return _put('/api/inventory/adjust', { productId, location: 'shop', quantity: qty });
  }
  function setMatInventoryQty(matId, qty) {
    return _put('/api/inventory/adjust', { productId: matId, location: 'material', quantity: qty });
  }
  function addMaterial(matId, qty) {
    return _post('/api/inventory/add-material', { matId, qty });
  }

  // ══════════════════════════════════════════════════════════
  // TRANSFER & SELL
  // ══════════════════════════════════════════════════════════
  function transferToShop(productId, qty) {
    return _post('/api/inventory/transfer', { productId, qty });
  }
  function sellProduct(productId, qty, pricePerUnit, note) {
    return _post('/api/inventory/sell', { productId, qty, pricePerUnit, note });
  }

  // ══════════════════════════════════════════════════════════
  // LOGS
  // ══════════════════════════════════════════════════════════
  function _normLogs(data) {
    return (data || []).map(function(l) {
      return {
        id:          l.id,
        type:        l.type,
        productId:   l.productId,
        productName: l.productName,
        quantity:    l.quantity,
        source:      l.source || '',
        destination: l.destination || '',
        pricePerUnit: parseFloat(l.pricePerUnit) || 0,
        totalPrice:   parseFloat(l.totalPrice)   || 0,
        note:        l.note || '',
        date:        l.createdAt,
        editedAt:    l.editedAt || null
      };
    });
  }

  function getLogs() {
    var res = _get('/api/logs');
    return _normLogs(res.data);
  }
  function getRecentLogs(n) {
    var res = _get('/api/logs?limit=' + (n || 25));
    return _normLogs(res.data);
  }
  function getLogsByType(type) {
    var res = _get('/api/logs?type=' + type);
    return _normLogs(res.data);
  }
  function getLogById(id) {
    var all = getLogs();
    return all.find(function(l){ return l.id === id; }) || null;
  }
  function addLog() { /* Backend o'zi qiladi */ }

  function editSaleLog(logId, newQty, newPricePerUnit, newNote) {
    return _put('/api/logs/' + logId, { qty: newQty, pricePerUnit: newPricePerUnit, note: newNote });
  }
  function deleteSaleLog(logId) {
    return _delete('/api/logs/' + logId);
  }
  function getLogsFiltered(opts) {
    opts = opts || {};
    var params = [];
    if (opts.type)      params.push('type='      + opts.type);
    if (opts.productId) params.push('productId=' + opts.productId);
    if (opts.from)      params.push('from='      + opts.from);
    if (opts.to)        params.push('to='        + opts.to);
    var url = '/api/logs' + (params.length ? '?' + params.join('&') : '');
    var res = _get(url);
    return _normLogs(res.data);
  }

  // ══════════════════════════════════════════════════════════
  // ARCHIVE
  // ══════════════════════════════════════════════════════════
  function getArchives() {
    var res = _get('/api/logs/archive');
    return res.data || [];
  }
  function archiveMonth(monthKey) {
    return _post('/api/logs/archive', { monthKey });
  }
  function archiveCurrentMonth() {
    var now  = new Date();
    var key  = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    return archiveMonth(key);
  }
  function getArchiveById(id) {
    var list = getArchives();
    return list.find(function(a){ return a.id === id; }) || null;
  }
  function deleteArchive(id) {
    return _delete('/api/logs/archive/' + id);
  }
  function getAvailableMonths() {
    var archived = new Set((getArchives()).map(function(a){ return a.monthKey; }));
    var logs = getLogs();
    var months = new Set(logs.map(function(l){ return (l.date || '').slice(0,7); }).filter(Boolean));
    return Array.from(months).filter(function(m){ return !archived.has(m); }).sort().reverse();
  }

  // ══════════════════════════════════════════════════════════
  // REPORTS
  // ══════════════════════════════════════════════════════════
  function getReportSummary() {
    var res = _get('/api/logs/reports/summary');
    var d   = res.data || {};
    return {
      sum: function(type) {
        if (type === 'production') return d.totalProduced    || 0;
        if (type === 'transfer')   return d.totalTransferred || 0;
        if (type === 'sale')       return d.totalSold        || 0;
        return 0;
      },
      sumToday: function(type) {
        if (type === 'sale')       return d.todaySold     || 0;
        if (type === 'production') return d.todayProduced || 0;
        return 0;
      },
      revenue:         d.totalRevenue   || 0,
      todayRevenue:    d.todayRevenue   || 0,
      salesByProduct:  d.salesByProduct || {},
      prodByProduct:   d.prodByProduct  || {},
      monthly:         d.monthly        || {}
    };
  }

  return {
    seed, resetAll,
    getProducts, getProductById, getMaterials, getMaterialById,
    createProduct, updateProduct, deleteProduct,
    getGroups, getGroupById, createGroup, updateGroup, deleteGroup,
    getTasks, getTaskById, createTask, updateTask, deleteTask, recordProduction,
    getWsInventory, getShopInventory, getMatInventory,
    setWsInventoryQty, setShopInventoryQty, setMatInventoryQty, addMaterial,
    transferToShop, sellProduct,
    getLogs, getRecentLogs, getLogsByType, getLogById, addLog,
    editSaleLog, deleteSaleLog, getLogsFiltered,
    getArchives, archiveMonth, archiveCurrentMonth,
    getArchiveById, deleteArchive, getAvailableMonths,
    getReportSummary
  };

})();
