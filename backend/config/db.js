// config/db.js — PostgreSQL ulanish (Sequelize ORM)
// Sequelize — SQL yozmasdan JS obyektlari bilan ishlash imkonini beradi

const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "shop_control",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "ikromboy2009",
  logging: false, // true qilsangiz — barcha SQL konsolga chiqadi
  pool: {
    max: 5, // maksimal ulanishlar soni
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Ulanishni tekshirish funksiyasi
async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL ulanish muvaffaqiyatli");
  } catch (err) {
    console.error("❌ PostgreSQL ulanish xatosi:", err.message);
    process.exit(1);
  }
}

module.exports = { sequelize, connectDB };
