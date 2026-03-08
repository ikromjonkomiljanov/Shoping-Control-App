# BiznesApp — Full-Stack O'rnatish Qo'llanmasi

## Nima o'zgardi

| Avval | Endi |
|-------|------|
| localStorage (faqat bir brauzer) | PostgreSQL (istalgan joydan) |
| Sahfa yopilsa ma'lumot yo'qolishi mumkin | Ma'lumot serverda — doimiy |
| Bir kishi ishlatadi | Ko'p foydalanuvchi bir vaqtda |
| Login = localStorage token | Login = JWT token (xavfsiz) |

**Natija (ko'rinish) — 1 piksel ham o'zgarmadi.**

---

## O'rnatish — Qadam-qadam

### 1. PostgreSQL o'rnatish

**Windows:**
1. https://www.postgresql.org/download/windows/ dan yuklab olish
2. O'rnatish paytida parol belgilang (eslab qoling!)
3. pgAdmin 4 ham birga o'rnatiladi — vizual interfeys

**Mac:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux:**
```bash
sudo apt install postgresql
sudo systemctl start postgresql
```

---

### 2. Database yaratish

**pgAdmin 4 orqali:**
1. pgAdmin 4 ni oching
2. Servers → PostgreSQL → o'ng klik → Connect
3. Databases → o'ng klik → Create → Database
4. Name: `shop_control` → Save

**Yoki terminal orqali:**
```bash
psql -U postgres
CREATE DATABASE shop_control;
\q
```

---

### 3. Loyihani sozlash

```bash
cd shop-control/backend

# Kerakli paketlarni o'rnatish
npm install

# .env faylni yaratish
cp .env.example .env
```

`.env` faylni oching va to'ldiring:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shop_control
DB_USER=postgres
DB_PASS=SIZNING_POSTGRESQL_PAROLINGIZ
JWT_SECRET=kamida_32_ta_belgidan_iborat_maxfiy_kalit_123456789
```

---

### 4. Serverni ishga tushirish

```bash
# backend papkasida
npm start
```

Muvaffaqiyatli bo'lsa:
```
✅ PostgreSQL ulanish muvaffaqiyatli
✅ Jadvallar tayyor
✅ Admin yaratildi. Standart parol: admin123
🚀 BiznesApp server ishga tushdi!
   http://localhost:5503
```

---

### 5. Brauzerda ochish

http://localhost:5503 → Login sahifasi

**Admin:** parol `admin123`

⚠️ Birinchi kirishda parolni o'zgartiring!

---

## Papka tuzilmasi

```
shop-control/
├── backend/
│   ├── server.js          ← Asosiy server (npm start)
│   ├── package.json
│   ├── .env               ← Sizning DB va JWT sozlamalaringiz
│   ├── config/
│   │   └── db.js          ← PostgreSQL ulanish
│   ├── models/
│   │   └── index.js       ← Barcha jadvallar (Sequelize)
│   ├── routes/
│   │   ├── auth.js        ← /api/auth/...
│   │   ├── products.js    ← /api/products/...
│   │   ├── groups.js      ← /api/groups/...
│   │   ├── tasks.js       ← /api/tasks/...
│   │   ├── inventory.js   ← /api/inventory/...
│   │   └── logs.js        ← /api/logs/...
│   └── middleware/
│       └── auth.js        ← JWT tekshirish
│
└── frontend/
    ├── index.html          ← Kirish (login.html ga redirect)
    ├── login.html          ← Login sahifasi
    ├── admin.html          ← Admin panel (O'ZGARMADI)
    ├── worker.html         ← Ishchi panel (O'ZGARMADI)
    ├── js/
    │   ├── auth.js         ← localStorage → JWT (o'zgardi)
    │   ├── storage.js      ← localStorage → API (o'zgardi)
    │   ├── admin.js        ← O'ZGARMADI
    │   └── worker.js       ← O'ZGARMADI
    └── styles/
        └── styles.css      ← O'ZGARMADI
```

---

## Agar xato chiqsa

### "Cannot connect to database"
- PostgreSQL ishlaypti? `services.msc` (Windows) yoki `brew services list` (Mac)
- `.env` dagi parol to'g'rimi?
- `shop_control` database yaratilganmi?

### "Port 5503 is already in use"
```bash
# Windows
netstat -ano | findstr :5503
taskkill /PID <PID_RAQAM> /F

# Mac/Linux
lsof -ti:5503 | xargs kill
```

### Jadvallarni ko'rish (pgAdmin)
1. pgAdmin → shop_control database
2. Schemas → public → Tables
3. Jadvalga o'ng klik → View/Edit Data

---

## Development rejimi (auto-restart)

```bash
npm install -g nodemon   # yoki: npx nodemon server.js
npm run dev
```

---

## Savol bo'lsa
Xato xabarini to'liq copy qilib yuboring.
