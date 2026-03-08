/**
 * AUTH.JS — BiznesApp v4 (Full-Stack versiya)
 *
 * O'ZGARGAN: localStorage → JWT token (sessionStorage da saqlanadi)
 * O'ZGARMAGAN: Public API — loginAdmin(), loginWorker(), isAdmin(), isWorker()...
 * admin.js va worker.js da HECH NARSA o'zgarmaydi
 */

var Auth = (function () {

  // JWT token sessionStorage da saqlanadi
  // localStorage dan farqi: brauzer yopilsa o'chadi (xavfsizroq)
  var TOKEN_KEY = 'smb_token';
  var USER_KEY  = 'smb_user';  // { role, groupId, groupName } — token decode

  // ── Token boshqaruv ──────────────────────────────────────────
  function _saveSession(token, userData) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
  }
  function _clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
  function _getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  function _getUser() {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch(e) { return null; }
  }

  // ── Public: barcha sahifalardan chaqiriladigan API ───────────
  function seedAdmin() { /* Backend boshlanishda qiladi */ }
  function getSession()     { return _getUser(); }
  function isLoggedIn()     { return !!(_getToken() && _getUser()); }
  function getRole()        { var u = _getUser(); return u ? u.role : null; }
  function isAdmin()        { return getRole() === 'admin'; }
  function isWorker()       { return getRole() === 'worker'; }
  function getWorkerGroup() {
    var u = _getUser();
    return (u && u.role === 'worker') ? { id: u.groupId, name: u.groupName } : null;
  }

  // ── Har bir API so'rovda ishlatiladi ─────────────────────────
  // admin.js va worker.js fetch() chaqirmaydi — Storage orqali ishlaydi
  // Lekin Storage.js ichida bu funksiya ishlatiladi
  function getAuthHeader() {
    var token = _getToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  // ── Login ─────────────────────────────────────────────────────
  function loginAdmin(password) {
    // async/await ishlatmaymiz — oldindagi kod bilan mos
    // Buning o'rniga XMLHttpRequest sync ishlatamiz
    // (Haqiqiy loyihada Promise ishlatiladi, lekin admin.js o'zgarmaydi deb)
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/auth/login', false); // false = sync
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ role: 'admin', password: password }));

    try {
      var res = JSON.parse(xhr.responseText);
      if (!res.ok) return { ok: false, msg: res.msg };
      _saveSession(res.token, { role: 'admin' });
      return { ok: true };
    } catch(e) {
      return { ok: false, msg: 'Server bilan aloqa yo\'q.' };
    }
  }

  function loginWorker(groupName, password) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/auth/login', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ role: 'worker', groupName: groupName, password: password }));

    try {
      var res = JSON.parse(xhr.responseText);
      if (!res.ok) return { ok: false, msg: res.msg };
      _saveSession(res.token, { role: 'worker', groupId: res.groupId, groupName: res.groupName });
      return { ok: true };
    } catch(e) {
      return { ok: false, msg: 'Server bilan aloqa yo\'q.' };
    }
  }

  function logout() {
    _clearSession();
    window.location.href = 'login.html';
  }

  // ── Parol o'zgartirish ────────────────────────────────────────
  function changeAdminPassword(oldPass, newPass) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/auth/change-admin-password', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + _getToken());
    xhr.send(JSON.stringify({ oldPassword: oldPass, newPassword: newPass }));
    try {
      var res = JSON.parse(xhr.responseText);
      return res.ok ? { ok: true } : { ok: false, msg: res.msg };
    } catch(e) {
      return { ok: false, msg: 'Server xatosi.' };
    }
  }

  function setGroupPassword(groupId, password) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/auth/set-group-password', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + _getToken());
    xhr.send(JSON.stringify({ groupId: groupId, password: password }));
    try {
      var res = JSON.parse(xhr.responseText);
      return res.ok ? { ok: true } : { ok: false, msg: res.msg };
    } catch(e) {
      return { ok: false, msg: 'Server xatosi.' };
    }
  }

  // ── Guard funksiyalar ─────────────────────────────────────────
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
  function can(action) {
    var role = getRole();
    var workerActions = ['produce', 'viewTasks', 'viewWorkshop', 'viewMaterials', 'addMaterial'];
    if (role === 'admin') return true;
    if (role === 'worker') return workerActions.indexOf(action) !== -1;
    return false;
  }

  return {
    seedAdmin, getSession, isLoggedIn, getRole, isAdmin, isWorker, getWorkerGroup,
    loginAdmin, loginWorker, logout,
    changeAdminPassword, setGroupPassword,
    requireAdmin, requireWorker, requireLogin, can,
    getAuthHeader // Storage.js ishlatadi
  };

})();
