// models/index.js — Barcha modellar + bog'liqliklar
// Sequelize modeli = PostgreSQL jadval

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// ═══════════════════════════════════════════════════════════════
// ADMIN (faqat bitta bo'ladi)
// ═══════════════════════════════════════════════════════════════
const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      // bcrypt bilan shifrlangan parol saqlanadi — hech qachon oddiy matn emas
    },
  },
  { tableName: "admins", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// GROUP — Ishchilar guruhi
// ═══════════════════════════════════════════════════════════════
const Group = sequelize.define(
  "Group",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // avtomatik unique ID: "a3f7b2c1-..."
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: "#2563eb",
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { tableName: "groups", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// PRODUCT — Mahsulot turlari
// ═══════════════════════════════════════════════════════════════
const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    icon: {
      type: DataTypes.STRING(10),
      defaultValue: "📦",
    },
    unit: {
      type: DataTypes.STRING(20),
      defaultValue: "dona",
    },
  },
  { tableName: "products", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// TASK — Guruhga berilgan topshiriq
// ═══════════════════════════════════════════════════════════════
const Task = sequelize.define(
  "Task",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // groupId va productId — foreign key (pastda bog'lanadi)
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    produced: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    deadline: {
      type: DataTypes.DATEONLY, // "2024-12-31" format
      allowNull: true,
    },
    pricePerItem: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    note: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    status: {
      type: DataTypes.ENUM("active", "completed"),
      defaultValue: "active",
    },
  },
  { tableName: "tasks", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// INVENTORY — Seh va Do'kon inventari
// ═══════════════════════════════════════════════════════════════
const Inventory = sequelize.define(
  "Inventory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID, // UUID ham, 'mat-1' ham sig'adi
      allowNull: true,
    },
    // productId — foreign key
    location: {
      type: DataTypes.ENUM("workshop", "shop", "material"),
      allowNull: false,
      // workshop = seh, shop = do'kon, material = xom ashyo
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  { tableName: "inventory", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// LOG — Barcha harakatlar tarixi
// ═══════════════════════════════════════════════════════════════
const Log = sequelize.define(
  "Log",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("production", "transfer", "sale", "material_add"),
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true, // Material logi uchun null bo'lishi mumkin
    },
    productName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      // Snapshot — log yozilganda mahsulot nomini saqlaymiz
      // Keyinchalik mahsulot o'chirilsa ham log saqlanib qoladi
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: "",
    },
    destination: {
      type: DataTypes.STRING(100),
      defaultValue: "",
    },
    pricePerUnit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    note: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: "logs", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// ARCHIVE — Oylik arxiv
// ═══════════════════════════════════════════════════════════════
const Archive = sequelize.define(
  "Archive",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    monthKey: {
      type: DataTypes.STRING(7), // "2024-03" format
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    // JSON maydonlar — arxiv paytidagi snapshot ma'lumotlar
    summary: {
      type: DataTypes.JSONB, // JSONB — PostgreSQL da indekslanadigan JSON
      allowNull: false,
    },
    snapshots: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    logs: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  { tableName: "archives", timestamps: true },
);

// ═══════════════════════════════════════════════════════════════
// BOG'LIQLIKLAR (Associations)
// ═══════════════════════════════════════════════════════════════
// Task → Group (ko'p Task bitta Groupga tegishli)
Task.belongsTo(Group, { foreignKey: "groupId", as: "group" });
Group.hasMany(Task, { foreignKey: "groupId", as: "tasks" });

// Task → Product
Task.belongsTo(Product, { foreignKey: "productId", as: "product" });
Product.hasMany(Task, { foreignKey: "productId", as: "tasks" });

// Inventory → Product
Inventory.belongsTo(Product, { foreignKey: "productId", as: "product" });
Product.hasMany(Inventory, { foreignKey: "productId", as: "inventory" });

// ═══════════════════════════════════════════════════════════════
// SYNC — Jadvallarni yaratish (agar mavjud bo'lmasa)
// ═══════════════════════════════════════════════════════════════
async function syncDB() {
  // alter: true — mavjud jadvalga yangi ustun qo'shsa ham ishlaveradi
  // force: true — faqat development uchun, hamma ma'lumotni o'chiradi!
  await sequelize.sync({ alter: true });
  console.log("✅ Jadvallar tayyor");
}

module.exports = {
  Admin,
  Group,
  Product,
  Task,
  Inventory,
  Log,
  Archive,
  syncDB,
};
