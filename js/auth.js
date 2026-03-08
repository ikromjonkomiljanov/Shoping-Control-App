/**
 * AUTH.JS — BiznesApp v4
 * Authentication & role management
 * Backend-ready: replace _get/_set with API calls later
 */

var Auth = (function () {

  var KEYS = {
    SESSION:  'smb4_session',
    ADMIN:    'smb4_admin',
    GROUPS:   'smb3_groups'   // shared with Storage
  };

  var DEFAULT_ADMIN_PASSWORD = 'admin123';

  // ── Internal helpers ─────────────────────────────────────────
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // ── Seed default admin password if not set ───────────────────
  function seedAdmin() {
    if (!_get(KEYS.ADMIN)) {
      _set(KEYS.ADMIN, { password: DEFAULT_ADMIN_PASSWORD });
    }
  }

  // ── Session ──────────────────────────────────────────────────
  // session schema: { role: 'admin'|'worker', groupId: null|'g1', groupName: null|'A Guruh', loginAt: ISO }

  function getSession() {
    return _get(KEYS.SESSION);
  }

  function isLoggedIn() {
    var s = getSession();
    return !!(s && s.role);
  }

  function getRole() {
    var s = getSession();
    return s ? s.role : null;
  }

  function isAdmin() { return getRole() === 'admin'; }
  function isWorker() { return getRole() === 'worker'; }

  function getWorkerGroup() {
    var s = getSession();
    if (s && s.role === 'worker') return { id: s.groupId, name: s.groupName };
    return null;
  }

  // ── Login ─────────────────────────────────────────────────────
  // Returns { ok: true } or { ok: false, msg: '...' }

  function loginAdmin(password) {
    var admin = _get(KEYS.ADMIN);
    if (!admin) seedAdmin();
    admin = _get(KEYS.ADMIN);
    if (password !== admin.password) {
      return { ok: false, msg: 'Parol noto\'g\'ri!' };
    }
    _set(KEYS.SESSION, {
      role: 'admin',
      groupId: null,
      groupName: null,
      loginAt: new Date().toISOString()
    });
    return { ok: true };
  }

  function loginWorker(groupName, password) {
    var groups = _get(KEYS.GROUPS) || [];
    var group = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].name.toLowerCase().trim() === groupName.toLowerCase().trim()) {
        group = groups[i];
        break;
      }
    }
    if (!group) {
      return { ok: false, msg: 'Bunday guruh topilmadi: "' + groupName + '"' };
    }
    if (!group.password) {
      return { ok: false, msg: 'Bu guruhga parol belgilanmagan. Admin bilan bog\'laning.' };
    }
    if (group.password !== password) {
      return { ok: false, msg: 'Guruh paroli noto\'g\'ri!' };
    }
    _set(KEYS.SESSION, {
      role: 'worker',
      groupId: group.id,
      groupName: group.name,
      loginAt: new Date().toISOString()
    });
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(KEYS.SESSION);
  }

  // ── Change admin password ─────────────────────────────────────
  function changeAdminPassword(oldPass, newPass) {
    var admin = _get(KEYS.ADMIN);
    if (!admin || admin.password !== oldPass) {
      return { ok: false, msg: 'Joriy parol noto\'g\'ri.' };
    }
    if (!newPass || newPass.length < 4) {
      return { ok: false, msg: 'Yangi parol kamida 4 ta belgi bo\'lishi kerak.' };
    }
    admin.password = newPass;
    _set(KEYS.ADMIN, admin);
    return { ok: true };
  }

  // ── Set / update group password (admin only) ──────────────────
  function setGroupPassword(groupId, password) {
    var groups = _get(KEYS.GROUPS) || [];
    var idx = -1;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === groupId) { idx = i; break; }
    }
    if (idx === -1) return { ok: false, msg: 'Guruh topilmadi.' };
    if (!password || password.length < 3) {
      return { ok: false, msg: 'Parol kamida 3 ta belgi bo\'lishi kerak.' };
    }
    groups[idx].password = password;
    _set(KEYS.GROUPS, groups);
    return { ok: true };
  }

  // ── Guard: redirect if not logged in or wrong role ────────────
  function requireAdmin() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (!isAdmin())    { window.location.href = 'worker.html'; return false; }
    return true;
  }

  function requireWorker() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (!isWorker())   { window.location.href = 'admin.html'; return false; }
    return true;
  }

  function requireLogin() {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return false; }
    return true;
  }

  // ── Permission check (use before sensitive ops) ───────────────
  function can(action) {
    var role = getRole();
    var adminActions = [
      'sell', 'transfer', 'editSale', 'deleteSale',
      'viewReports', 'viewShopInventory', 'viewFinancials',
      'manageProducts', 'manageGroups', 'archive', 'resetAll',
      'setGroupPassword', 'changeAdminPassword'
    ];
    var workerActions = [
      'produce', 'viewTasks', 'viewWorkshop', 'viewMaterials', 'addMaterial'
    ];
    if (role === 'admin') return true;
    if (role === 'worker') return workerActions.indexOf(action) !== -1;
    return false;
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    seedAdmin: seedAdmin,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    getRole: getRole,
    isAdmin: isAdmin,
    isWorker: isWorker,
    getWorkerGroup: getWorkerGroup,
    loginAdmin: loginAdmin,
    loginWorker: loginWorker,
    logout: logout,
    changeAdminPassword: changeAdminPassword,
    setGroupPassword: setGroupPassword,
    requireAdmin: requireAdmin,
    requireWorker: requireWorker,
    requireLogin: requireLogin,
    can: can
  };

})();
