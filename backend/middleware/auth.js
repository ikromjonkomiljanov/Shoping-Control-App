// middleware/auth.js — JWT token tekshirish
// Bu funksiya har bir himoyalangan route dan OLDIN ishlaydi

const jwt = require('jsonwebtoken');

// ── Token yaratish (login da ishlatiladi) ──────────────────────
function signToken(payload) {
  // payload = { role: 'admin' } yoki { role: 'worker', groupId: '...', groupName: '...' }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '12h'   // 12 soat — keyin qayta login kerak
  });
}

// ── Token tekshirish middleware ────────────────────────────────
function requireAuth(req, res, next) {
  // Token header da keladi: "Authorization: Bearer eyJhbGci..."
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, msg: 'Token topilmadi. Qayta kiring.' });
  }

  const token = header.slice(7); // "Bearer " ni olib tashlaymiz
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { role, groupId, groupName, iat, exp }
    next();               // keyingi middleware/route ga o'tamiz
  } catch (err) {
    return res.status(401).json({ ok: false, msg: 'Token muddati o\'tgan. Qayta kiring.' });
  }
}

// ── Faqat admin ───────────────────────────────────────────────
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, msg: 'Bu amal faqat admin uchun.' });
    }
    next();
  });
}

// ── Admin yoki worker ─────────────────────────────────────────
function requireWorker(req, res, next) {
  requireAuth(req, res, () => {
    if (!['admin', 'worker'].includes(req.user.role)) {
      return res.status(403).json({ ok: false, msg: 'Kirish taqiqlangan.' });
    }
    next();
  });
}

module.exports = { signToken, requireAuth, requireAdmin, requireWorker };
