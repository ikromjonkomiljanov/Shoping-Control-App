// server.js — BiznesApp Backend Entry Point
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const bcrypt   = require('bcrypt');

const { connectDB }            = require('./config/db');
const { Admin, syncDB }        = require('./models');

const app  = express();
const PORT = process.env.PORT || 5503;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://127.0.0.1:5503',
    'http://localhost:5503',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
  ],
  credentials: true
}));
app.use(express.json());

// ── Frontend fayllarni serve qilish ───────────────────────────
// Backend va Frontend bitta serverda ishlaydi
// /api — backend
// / — frontend fayllar
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/groups',    require('./routes/groups'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/logs',      require('./routes/logs'));

// ── Catch-all: SPA uchun (barcha / → index.html) ─────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Server ishga tushirish ─────────────────────────────────────
async function startServer() {
  // 1. DB ga ulan
  await connectDB();

  // 2. Jadvallarni sync qil
  await syncDB();

  // 3. Admin bormi tekshir, yo'q bo'lsa yaratib qo'y
  const admin = await Admin.findByPk(1);
  if (!admin) {
    const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(defaultPass, 10);
    await Admin.create({ id: 1, passwordHash: hash });
    console.log(`✅ Admin yaratildi. Standart parol: ${defaultPass}`);
    console.log('⚠️  Tizimga kirgandan so\'ng parolni o\'zgartiring!');
  }

  // 4. Server start
  app.listen(PORT, () => {
    console.log('');
    console.log('════════════════════════════════════════');
    console.log(`🚀 BiznesApp server ishga tushdi!`);
    console.log(`   http://localhost:${PORT}`);
    console.log('════════════════════════════════════════');
  });
}

startServer().catch(err => {
  console.error('❌ Server ishga tushmadi:', err.message);
  process.exit(1);
});
