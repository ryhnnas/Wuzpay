import { Hono } from "npm:hono";
import { User } from "../models/User.ts";
import { Ingredient } from "../models/Ingredient.ts";
import mongoose from "npm:mongoose";
import bcrypt from "npm:bcryptjs";

const seedRouter = new Hono();

// ─────────────────────────────────────────────
// HELPER: Tanggal acak dengan jam operasional
// ─────────────────────────────────────────────
const getRandomTimeForDate = (year: number, month: number, day: number) => {
  const hour = Math.floor(Math.random() * 13) + 9;   // 09:00 – 21:xx
  const min  = Math.floor(Math.random() * 60);
  const sec  = Math.floor(Math.random() * 60);
  return new Date(year, month, day, hour, min, sec);
};

// HELPER: Generate semua tanggal dari startDate sampai endDate (inclusive)
const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

// HELPER: Pilih elemen acak dari array
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// HELPER: Integer acak dalam [min, max]
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─────────────────────────────────────────────
// ROUTE: GET /seed/full-setup
// ─────────────────────────────────────────────
seedRouter.get("/full-setup", async (c) => {
  try {
    // ── 1. BERSIHKAN SEMUA KOLEKSI ──────────────────────────────────────────
    const collections = [
      "users", "categories", "products", "transactions",
      "entities", "permissions", "ingredients", "stocklogs",
      "customers", "suppliers", "discounts",
    ];
    for (const col of collections) {
      try {
        await mongoose.connection.db.collection(col).deleteMany({});
      } catch (_) { /* skip jika koleksi belum ada */ }
    }

    // ── 2. BUAT ENTITY (Toko) ───────────────────────────────────────────────
    const entityId = new mongoose.Types.ObjectId();
    await mongoose.connection.db.collection("entities").insertOne({
      _id: entityId,
      name: "WuzPay Coffee & Eatery",
      address: "Jl. Sentra Kuliner Bandung No. 404, Buah Batu",
      phone: "081234567890",
      config: { currency: "IDR", tax_rate: 0, service_charge: 0 },
    });

    // ── 3. BUAT OWNER + KASIR ───────────────────────────────────────────────
    const ownerId  = new mongoose.Types.ObjectId();
    const kasirId  = new mongoose.Types.ObjectId();
    const hashedPw = await bcrypt.hash("owner123", 10);
    const kasirPw  = await bcrypt.hash("kasir123", 10);

    await User.create([
      {
        _id: ownerId,
        name: "Owner WuzPay",
        email: "owner@wuzpay.com",
        password: hashedPw,
        role: "owner",
      },
      {
        _id: kasirId,
        name: "Kasir Nia",
        email: "kasir@wuzpay.com",
        password: kasirPw,
        role: "kasir",
      },
    ]);

    // ── 4. KATEGORI ─────────────────────────────────────────────────────────
    const categoryDefs = [
      { name: "Coffee Based",     code: "COF" },
      { name: "Non-Coffee",       code: "NCF" },
      { name: "Indomie & Noodle", code: "NOD" },
      { name: "Main Course",      code: "MCR" },
      { name: "Pastry & Snacks",  code: "SNK" },
    ];

    const categories = categoryDefs.map((cat) => ({
      id:   new mongoose.Types.ObjectId(),
      name: cat.name,
      code: cat.code,
    }));

    await mongoose.connection.db.collection("categories").insertMany(
      categories.map((cat) => ({
        _id: cat.id,
        name: cat.name,
        entity_id: entityId,
      }))
    );

    // ── 5. BAHAN BAKU (INGREDIENTS) ─────────────────────────────────────────
    const ingredientDefs = [
      // Kopi & Susu
      { name: "Espresso Shot",      unit: "shot",   qty: 500,  cost: 3000  },
      { name: "Susu Full Cream",    unit: "ml",     qty: 20000, cost: 15   },
      { name: "Gula Pasir",         unit: "gram",   qty: 10000, cost: 8    },
      { name: "Sirup Karamel",      unit: "ml",     qty: 5000,  cost: 20   },
      { name: "Sirup Hazelnut",     unit: "ml",     qty: 5000,  cost: 20   },
      { name: "Sirup Vanilla",      unit: "ml",     qty: 5000,  cost: 18   },
      { name: "Serbuk Coklat",      unit: "gram",   qty: 3000,  cost: 30   },
      { name: "Matcha Powder",      unit: "gram",   qty: 2000,  cost: 60   },
      { name: "Taro Powder",        unit: "gram",   qty: 2000,  cost: 45   },
      { name: "Red Velvet Powder",  unit: "gram",   qty: 1500,  cost: 50   },
      // Minuman
      { name: "Air Mineral",        unit: "ml",     qty: 50000, cost: 1    },
      { name: "Sirup Lychee",       unit: "ml",     qty: 3000,  cost: 25   },
      { name: "Thai Tea Premix",    unit: "gram",   qty: 3000,  cost: 35   },
      { name: "Lemon Segar",        unit: "buah",   qty: 200,   cost: 2000 },
      { name: "Strawberry Segar",   unit: "buah",   qty: 500,   cost: 1500 },
      { name: "Earl Grey Tea Bag",  unit: "pcs",    qty: 500,   cost: 1000 },
      // Mie & Noodle
      { name: "Indomie Goreng",     unit: "pcs",    qty: 300,   cost: 3500 },
      { name: "Indomie Kari",       unit: "pcs",    qty: 200,   cost: 3500 },
      { name: "Telur Ayam",         unit: "butir",  qty: 1000,  cost: 2500 },
      { name: "Daun Bawang",        unit: "gram",   qty: 2000,  cost: 5    },
      { name: "Minyak Goreng",      unit: "ml",     qty: 10000, cost: 15   },
      // Main Course
      { name: "Nasi Putih",         unit: "gram",   qty: 20000, cost: 3    },
      { name: "Ayam Fillet",        unit: "gram",   qty: 10000, cost: 40   },
      { name: "Daging Sapi Cincang",unit: "gram",   qty: 5000,  cost: 55   },
      { name: "Tepung Roti",        unit: "gram",   qty: 5000,  cost: 12   },
      { name: "Saus Teriyaki",      unit: "ml",     qty: 3000,  cost: 35   },
      { name: "Kentang",            unit: "gram",   qty: 8000,  cost: 10   },
      // Pastry & Snack
      { name: "Tepung Terigu",      unit: "gram",   qty: 8000,  cost: 8    },
      { name: "Mentega",            unit: "gram",   qty: 3000,  cost: 30   },
      { name: "Coklat Chip",        unit: "gram",   qty: 2000,  cost: 50   },
      { name: "Keju Cheddar",       unit: "gram",   qty: 3000,  cost: 40   },
      { name: "Singkong",           unit: "gram",   qty: 5000,  cost: 5    },
    ];

    const insertedIngredients = await Ingredient.insertMany(
      ingredientDefs.map((ing) => ({
        name:           ing.name,
        unit:           ing.unit,
        stock_quantity: ing.qty,
        cost_per_unit:  ing.cost,
      }))
    );

    // Map nama → dokumen ingredient
    const ingMap: Record<string, typeof insertedIngredients[0]> = {};
    for (const ing of insertedIngredients) {
      ingMap[ing.name] = ing;
    }

    // ── 6. PRODUK (50 produk, 10 per kategori) ──────────────────────────────
    // Setiap produk punya: price, cost_price (fallback), recipe, dan image_url Unsplash
    const productBase = [
      // --- Coffee Based (cat 0) ---
      {
        n: "Espresso Single",   p: 15000, c: 5000, cat: 0,
        img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot", amt: 1 },
        ],
      },
      {
        n: "Americano Iced",    p: 18000, c: 6000, cat: 0,
        img: "https://images.unsplash.com/photo-1551046710-1d956b9286d3?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot", amt: 2 },
          { ing: "Air Mineral",   amt: 200 },
        ],
      },
      {
        n: "Caffe Latte",       p: 25000, c: 10000, cat: 0,
        img: "https://images.unsplash.com/photo-1570968015849-04bb1ca6138d?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",   amt: 2 },
          { ing: "Susu Full Cream", amt: 180 },
        ],
      },
      {
        n: "Cappuccino Hot",    p: 25000, c: 10000, cat: 0,
        img: "https://images.unsplash.com/photo-1572442388796-11668a67e13d?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",   amt: 2 },
          { ing: "Susu Full Cream", amt: 120 },
        ],
      },
      {
        n: "Caramel Macchiato", p: 32000, c: 12000, cat: 0,
        img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",   amt: 2 },
          { ing: "Susu Full Cream", amt: 150 },
          { ing: "Sirup Karamel",   amt: 30 },
        ],
      },
      {
        n: "Es Kopi Susu Aren", p: 22000, c: 8000, cat: 0,
        img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",   amt: 2 },
          { ing: "Susu Full Cream", amt: 150 },
          { ing: "Gula Pasir",      amt: 20 },
        ],
      },
      {
        n: "Hazelnut Latte",    p: 30000, c: 11000, cat: 0,
        img: "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",   amt: 2 },
          { ing: "Susu Full Cream", amt: 150 },
          { ing: "Sirup Hazelnut",  amt: 30 },
        ],
      },
      {
        n: "Mochaccino",        p: 28000, c: 11000, cat: 0,
        img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",   amt: 2 },
          { ing: "Susu Full Cream", amt: 120 },
          { ing: "Serbuk Coklat",   amt: 20 },
        ],
      },
      {
        n: "Affogato Vanilla",  p: 24000, c: 9000, cat: 0,
        img: "https://images.unsplash.com/photo-1594266302093-f1f2e822987a?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot",  amt: 1 },
          { ing: "Sirup Vanilla",  amt: 20 },
        ],
      },
      {
        n: "V60 Manual Brew",   p: 25000, c: 7000, cat: 0,
        img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format",
        recipe: [
          { ing: "Espresso Shot", amt: 2 },
          { ing: "Air Mineral",   amt: 250 },
        ],
      },

      // --- Non-Coffee (cat 1) ---
      {
        n: "Matcha Latte",          p: 28000, c: 12000, cat: 1,
        img: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=500&auto=format",
        recipe: [
          { ing: "Matcha Powder",   amt: 15 },
          { ing: "Susu Full Cream", amt: 180 },
          { ing: "Gula Pasir",      amt: 15 },
        ],
      },
      {
        n: "Chocolate Signature",   p: 26000, c: 11000, cat: 1,
        img: "https://images.unsplash.com/photo-1544787210-22bb840c5d63?w=500&auto=format",
        recipe: [
          { ing: "Serbuk Coklat",   amt: 25 },
          { ing: "Susu Full Cream", amt: 200 },
        ],
      },
      {
        n: "Red Velvet Latte",      p: 28000, c: 12000, cat: 1,
        img: "https://images.unsplash.com/photo-1610450537497-6a4a7538a08a?w=500&auto=format",
        recipe: [
          { ing: "Red Velvet Powder", amt: 20 },
          { ing: "Susu Full Cream",   amt: 180 },
        ],
      },
      {
        n: "Lychee Tea",            p: 20000, c: 6000, cat: 1,
        img: "https://images.unsplash.com/photo-1582793988951-9aed55099991?w=500&auto=format",
        recipe: [
          { ing: "Sirup Lychee", amt: 40 },
          { ing: "Air Mineral",  amt: 250 },
        ],
      },
      {
        n: "Thai Tea Iced",         p: 18000, c: 5000, cat: 1,
        img: "https://images.unsplash.com/photo-1525193612562-0ec53b0e5d7c?w=500&auto=format",
        recipe: [
          { ing: "Thai Tea Premix", amt: 25 },
          { ing: "Susu Full Cream", amt: 100 },
          { ing: "Gula Pasir",      amt: 15 },
        ],
      },
      {
        n: "Lemonade Fresh",        p: 22000, c: 6000, cat: 1,
        img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format",
        recipe: [
          { ing: "Lemon Segar", amt: 2 },
          { ing: "Gula Pasir",  amt: 20 },
          { ing: "Air Mineral", amt: 250 },
        ],
      },
      {
        n: "Strawberry Milkshake",  p: 25000, c: 10000, cat: 1,
        img: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format",
        recipe: [
          { ing: "Strawberry Segar", amt: 5 },
          { ing: "Susu Full Cream",  amt: 200 },
          { ing: "Gula Pasir",       amt: 20 },
        ],
      },
      {
        n: "Taro Blast",            p: 26000, c: 11000, cat: 1,
        img: "https://images.unsplash.com/photo-1579954115545-a95591f28be0?w=500&auto=format",
        recipe: [
          { ing: "Taro Powder",     amt: 30 },
          { ing: "Susu Full Cream", amt: 180 },
        ],
      },
      {
        n: "Earl Grey Tea",         p: 18000, c: 4000, cat: 1,
        img: "https://images.unsplash.com/photo-1594631252845-29fc4586d52c?w=500&auto=format",
        recipe: [
          { ing: "Earl Grey Tea Bag", amt: 1 },
          { ing: "Air Mineral",       amt: 250 },
        ],
      },
      {
        n: "Mineral Water",         p: 8000,  c: 2000, cat: 1,
        img: "https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=500&auto=format",
        recipe: [
          { ing: "Air Mineral", amt: 600 },
        ],
      },

      // --- Indomie & Noodle (cat 2) ---
      {
        n: "Indomie Goreng Ori",    p: 12000, c: 5000, cat: 2,
        img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format",
        recipe: [
          { ing: "Indomie Goreng", amt: 1 },
          { ing: "Telur Ayam",     amt: 1 },
          { ing: "Minyak Goreng",  amt: 30 },
        ],
      },
      {
        n: "Indomie Nyemek Pedas",  p: 18000, c: 7000, cat: 2,
        img: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&auto=format",
        recipe: [
          { ing: "Indomie Goreng", amt: 1 },
          { ing: "Telur Ayam",     amt: 1 },
          { ing: "Daun Bawang",    amt: 10 },
        ],
      },
      {
        n: "Indomie Carbonara",     p: 24000, c: 12000, cat: 2,
        img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format",
        recipe: [
          { ing: "Indomie Goreng",  amt: 1 },
          { ing: "Susu Full Cream", amt: 80 },
          { ing: "Telur Ayam",      amt: 1 },
          { ing: "Keju Cheddar",    amt: 20 },
        ],
      },
      {
        n: "Mie Ayam WuzPay",       p: 22000, c: 10000, cat: 2,
        img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format",
        recipe: [
          { ing: "Ayam Fillet",  amt: 80 },
          { ing: "Daun Bawang",  amt: 10 },
          { ing: "Minyak Goreng",amt: 20 },
        ],
      },
      {
        n: "Mie Dok-Dok Jogja",     p: 20000, c: 8000, cat: 2,
        img: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format",
        recipe: [
          { ing: "Indomie Goreng", amt: 1 },
          { ing: "Telur Ayam",     amt: 1 },
          { ing: "Daun Bawang",    amt: 10 },
          { ing: "Minyak Goreng",  amt: 20 },
        ],
      },
      {
        n: "Indomie Kari Spesial",  p: 15000, c: 6000, cat: 2,
        img: "https://images.unsplash.com/photo-1594759842811-9f9a4c884cb4?w=500&auto=format",
        recipe: [
          { ing: "Indomie Kari", amt: 1 },
          { ing: "Telur Ayam",   amt: 1 },
        ],
      },
      {
        n: "Yamin Manis Gurih",     p: 22000, c: 9000, cat: 2,
        img: "https://images.unsplash.com/photo-1618413651759-4d691e84372a?w=500&auto=format",
        recipe: [
          { ing: "Ayam Fillet",  amt: 60 },
          { ing: "Gula Pasir",   amt: 15 },
          { ing: "Daun Bawang",  amt: 10 },
        ],
      },
      {
        n: "Indomie Salted Egg",    p: 25000, c: 13000, cat: 2,
        img: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&auto=format",
        recipe: [
          { ing: "Indomie Goreng", amt: 1 },
          { ing: "Telur Ayam",     amt: 2 },
          { ing: "Mentega",        amt: 15 },
        ],
      },
      {
        n: "Mie Goreng Aceh",       p: 25000, c: 11000, cat: 2,
        img: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500&auto=format",
        recipe: [
          { ing: "Indomie Goreng", amt: 1 },
          { ing: "Ayam Fillet",    amt: 50 },
          { ing: "Minyak Goreng",  amt: 30 },
        ],
      },
      {
        n: "Indomie Rebus Telur",   p: 15000, c: 6000, cat: 2,
        img: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=500&auto=format",
        recipe: [
          { ing: "Indomie Kari", amt: 1 },
          { ing: "Telur Ayam",   amt: 1 },
          { ing: "Air Mineral",  amt: 400 },
        ],
      },

      // --- Main Course (cat 3) ---
      {
        n: "Nasi Goreng Hongkong",  p: 35000, c: 15000, cat: 3,
        img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format",
        recipe: [
          { ing: "Nasi Putih",    amt: 200 },
          { ing: "Telur Ayam",    amt: 1 },
          { ing: "Minyak Goreng", amt: 30 },
          { ing: "Daun Bawang",   amt: 10 },
        ],
      },
      {
        n: "Ricebowl Teriyaki",     p: 32000, c: 14000, cat: 3,
        img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format",
        recipe: [
          { ing: "Nasi Putih",    amt: 200 },
          { ing: "Ayam Fillet",   amt: 100 },
          { ing: "Saus Teriyaki", amt: 30 },
        ],
      },
      {
        n: "Nasi Ayam Geprek",      p: 28000, c: 12000, cat: 3,
        img: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=500&auto=format",
        recipe: [
          { ing: "Nasi Putih",  amt: 200 },
          { ing: "Ayam Fillet", amt: 120 },
          { ing: "Minyak Goreng",amt: 40 },
          { ing: "Tepung Roti",  amt: 20 },
        ],
      },
      {
        n: "Steak Ayam Crispy",     p: 38000, c: 18000, cat: 3,
        img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format",
        recipe: [
          { ing: "Ayam Fillet",  amt: 150 },
          { ing: "Tepung Roti",  amt: 30 },
          { ing: "Minyak Goreng",amt: 50 },
          { ing: "Kentang",      amt: 100 },
        ],
      },
      {
        n: "Spaghetti Aglio Olio",  p: 30000, c: 12000, cat: 3,
        img: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 80 },
          { ing: "Minyak Goreng", amt: 30 },
          { ing: "Daun Bawang",   amt: 10 },
        ],
      },
      {
        n: "Beef Burger Deluxe",    p: 45000, c: 22000, cat: 3,
        img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format",
        recipe: [
          { ing: "Daging Sapi Cincang", amt: 150 },
          { ing: "Tepung Roti",         amt: 20 },
          { ing: "Mentega",             amt: 15 },
        ],
      },
      {
        n: "Fish & Chips",          p: 38000, c: 19000, cat: 3,
        img: "https://images.unsplash.com/photo-1524335617579-524982672a80?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 60 },
          { ing: "Minyak Goreng", amt: 60 },
          { ing: "Kentang",       amt: 150 },
        ],
      },
      {
        n: "Nasi Gila WuzPay",      p: 28000, c: 11000, cat: 3,
        img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format",
        recipe: [
          { ing: "Nasi Putih",    amt: 200 },
          { ing: "Ayam Fillet",   amt: 80 },
          { ing: "Telur Ayam",    amt: 1 },
          { ing: "Minyak Goreng", amt: 30 },
        ],
      },
      {
        n: "Chicken Cordon Bleu",   p: 42000, c: 21000, cat: 3,
        img: "https://images.unsplash.com/photo-1632778149975-420e0e75ee08?w=500&auto=format",
        recipe: [
          { ing: "Ayam Fillet",  amt: 150 },
          { ing: "Keju Cheddar", amt: 30 },
          { ing: "Tepung Roti",  amt: 25 },
          { ing: "Minyak Goreng",amt: 40 },
        ],
      },
      {
        n: "Ricebowl Sambal Matah", p: 32000, c: 13000, cat: 3,
        img: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500&auto=format",
        recipe: [
          { ing: "Nasi Putih",  amt: 200 },
          { ing: "Ayam Fillet", amt: 100 },
          { ing: "Lemon Segar", amt: 1 },
        ],
      },

      // --- Pastry & Snacks (cat 4) ---
      {
        n: "Croissant Almond",      p: 28000, c: 14000, cat: 4,
        img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 80 },
          { ing: "Mentega",       amt: 30 },
          { ing: "Gula Pasir",    amt: 15 },
        ],
      },
      {
        n: "Pain Au Chocolat",      p: 26000, c: 13000, cat: 4,
        img: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 80 },
          { ing: "Coklat Chip",   amt: 30 },
          { ing: "Mentega",       amt: 25 },
        ],
      },
      {
        n: "French Fries",          p: 20000, c: 8000, cat: 4,
        img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format",
        recipe: [
          { ing: "Kentang",      amt: 200 },
          { ing: "Minyak Goreng",amt: 60 },
          { ing: "Gula Pasir",   amt: 5 },
        ],
      },
      {
        n: "Cireng Bumbu Rujak",    p: 18000, c: 6000, cat: 4,
        img: "https://images.unsplash.com/photo-1505253149613-112d21d9f6a9?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 100 },
          { ing: "Minyak Goreng", amt: 40 },
        ],
      },
      {
        n: "Banana Fritters",       p: 20000, c: 7000, cat: 4,
        img: "https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 60 },
          { ing: "Minyak Goreng", amt: 40 },
          { ing: "Gula Pasir",    amt: 20 },
        ],
      },
      {
        n: "Dimsum Mix 4pcs",       p: 22000, c: 10000, cat: 4,
        img: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&auto=format",
        recipe: [
          { ing: "Ayam Fillet",   amt: 60 },
          { ing: "Tepung Terigu", amt: 40 },
          { ing: "Daun Bawang",   amt: 5 },
        ],
      },
      {
        n: "Singkong Goreng Keju",  p: 18000, c: 6000, cat: 4,
        img: "https://images.unsplash.com/photo-1596797038530-2c39bb9ed9ac?w=500&auto=format",
        recipe: [
          { ing: "Singkong",     amt: 150 },
          { ing: "Keju Cheddar", amt: 20 },
          { ing: "Minyak Goreng",amt: 40 },
        ],
      },
      {
        n: "Brownies Slice",        p: 15000, c: 7000, cat: 4,
        img: "https://images.unsplash.com/photo-1589119634773-84073a728fa0?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 50 },
          { ing: "Coklat Chip",   amt: 40 },
          { ing: "Mentega",       amt: 20 },
          { ing: "Telur Ayam",    amt: 1 },
        ],
      },
      {
        n: "Platter Snack Mix",     p: 45000, c: 20000, cat: 4,
        img: "https://images.unsplash.com/photo-1566417713940-0aa89cfd1abc?w=500&auto=format",
        recipe: [
          { ing: "Kentang",       amt: 100 },
          { ing: "Ayam Fillet",   amt: 60 },
          { ing: "Tepung Terigu", amt: 50 },
          { ing: "Minyak Goreng", amt: 60 },
        ],
      },
      {
        n: "Cinnamon Roll",         p: 24000, c: 11000, cat: 4,
        img: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=500&auto=format",
        recipe: [
          { ing: "Tepung Terigu", amt: 80 },
          { ing: "Mentega",       amt: 25 },
          { ing: "Gula Pasir",    amt: 20 },
        ],
      },
    ];

    // Insert produk ke DB
    const finalProducts = await Promise.all(
      productBase.map((p, index) => {
        const _id = new mongoose.Types.ObjectId();
        const cat = categories[p.cat];

        // Bangun array recipe dari definisi di atas
        const recipe = p.recipe
          .filter((r) => ingMap[r.ing]) // Hanya sertakan jika ingredient ada
          .map((r) => ({
            ingredient_id:  ingMap[r.ing]._id,
            amount_needed:  r.amt,
          }));

        // Hitung cost_price dari resep (fallback jika recipe kosong)
        const calculatedCost = recipe.reduce((sum, r) => {
          const ing = Object.values(ingMap).find(
            (i) => i._id.toString() === r.ingredient_id.toString()
          );
          return sum + (ing ? ing.cost_per_unit * r.amount_needed : 0);
        }, 0);

        return mongoose.connection.db.collection("products").insertOne({
          _id,
          name:           p.n,
          sku:            `WUZ-${cat.code}-${String(index + 1).padStart(3, "0")}`,
          price:          p.p,
          cost_price:     calculatedCost > 0 ? calculatedCost : p.c,
          recipe,
          category_id:    cat.id,
          entity_id:      entityId,
          image_url:      p.img,
          status:         "active",
          userId:         ownerId.toString(),
        }).then(() => ({
          ...p,
          _id,
          catName:   cat.name,
          cost_real: calculatedCost > 0 ? calculatedCost : p.c,
          recipe,
        }));
      })
    );

    // ── 7. GENERATE ~1500 TRANSAKSI (1 Mar – 8 Mei 2026) ────────────────────
    const paymentMethods = ["cash", "qris", "gopay", "transfer"] as const;

    const customerNames = [
      "Pelanggan Umum", "Budi Santoso", "Siti Rahayu", "Ahmad Fauzi",
      "Rina Kartika", "Dian Permana", "Yusuf Hakim", "Dewi Lestari",
      "Rizky Pratama", "Mega Wulandari", "Hendra Wijaya", "Ayu Safitri",
      "Fajar Nugroho", "Lila Maulida", "Tono Susanto", "Firda Amalia",
      "Eko Prasetyo", "Rini Agustina", "Andre Saputra", "Nisa Khadijah",
      "Wahyu Hidayat", "Sarah Fitria", "Dimas Kurniawan", "Putri Handayani",
      "Aldo Firmansyah", "Citra Dewi", "Bagas Purnomo", "Nadya Rahma",
      "Galih Setiawan", "Eva Anggraeni",
    ];

    // Rentang tanggal: 1 Maret 2026 – 8 Mei 2026
    const allDays = generateDateRange(
      new Date(2026, 2, 1),  // 1 Maret
      new Date(2026, 4, 8),  // 8 Mei
    );

    // Distribusikan ~1500 transaksi secara acak per hari (15–30 per hari)
    const TOTAL_TARGET = 1500;
    // Buat bobot acak per hari, lalu normalize agar total = TOTAL_TARGET
    const rawWeights = allDays.map(() => Math.random() * 15 + 15); // 15-30 base
    const weightSum = rawWeights.reduce((a, b) => a + b, 0);
    const txPerDay = rawWeights.map((w) => Math.max(5, Math.round((w / weightSum) * TOTAL_TARGET)));

    const transactions: any[] = [];
    let globalIdx = 0;

    for (let d = 0; d < allDays.length; d++) {
      const dayDate = allDays[d];
      const count = txPerDay[d];

      for (let t = 0; t < count; t++) {
        const date = getRandomTimeForDate(
          dayDate.getFullYear(),
          dayDate.getMonth(),
          dayDate.getDate(),
        );

        // 1–3 produk per transaksi
        const numItems = randInt(1, 3);
        const usedIndices = new Set<number>();
        const items: any[] = [];
        let totalRealAmount = 0;
        let totalProfit = 0;

        for (let j = 0; j < numItems; j++) {
          let idx: number;
          do { idx = Math.floor(Math.random() * finalProducts.length); }
          while (usedIndices.has(idx));
          usedIndices.add(idx);

          const prod = finalProducts[idx];
          const qty = randInt(1, 3);
          const price = prod.p;
          const cost = prod.cost_real;

          totalRealAmount += price * qty;
          totalProfit += (price - cost) * qty;

          items.push({
            product_id:    prod._id,
            name:          prod.n,
            quantity:      qty,
            price_at_sale: price,
            cost_at_sale:  cost,
            total_amount:  price * qty,
            category_name: prod.catName,
          });
        }

        // Diskon acak (10% peluang kena diskon 5–20%)
        let discountAmount = 0;
        if (Math.random() < 0.10) {
          const discPct = pick([5, 10, 15, 20]);
          discountAmount = Math.round((totalRealAmount * discPct) / 100);
        }
        const totalAmount = totalRealAmount - discountAmount;

        const method = pick(paymentMethods);
        const yy = String(date.getFullYear());
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");

        globalIdx++;
        transactions.push({
          receipt_number: `WP-${yy}${mm}${dd}-${String(globalIdx).padStart(4, "0")}`,
          userId:          ownerId.toString(),
          customer_name:   pick(customerNames),
          total_amount:    totalAmount,
          total_real_amount: totalRealAmount,
          discount_amount: discountAmount,
          profit:          totalProfit - discountAmount,
          payment_method:  method,
          amount_paid:     method === "cash"
                             ? totalAmount + pick([0, 5000, 10000, 20000, 50000])
                             : totalAmount,
          change_amount:   method === "cash"
                             ? pick([0, 5000, 10000, 20000, 50000])
                             : 0,
          items,
          status:    "completed",
          createdAt: date,
          updatedAt: date,
        });
      }
    }

    // Insert in batches untuk performa
    const BATCH = 500;
    for (let i = 0; i < transactions.length; i += BATCH) {
      await mongoose.connection.db.collection("transactions").insertMany(
        transactions.slice(i, i + BATCH)
      );
    }

    // ── 8. RINGKASAN ────────────────────────────────────────────────────────
    const totalRevenue = transactions.reduce((s, t) => s + t.total_amount, 0);
    const totalProfitAll = transactions.reduce((s, t) => s + t.profit, 0);

    return c.json({
      success: true,
      message: `🔥 MEGA SEED V6 BERHASIL! ${transactions.length} transaksi (1 Mar – 8 Mei 2026) siap pakai.`,
      summary: {
        entity:       "WuzPay Coffee & Eatery",
        users:        2,
        categories:   categories.length,
        ingredients:  insertedIngredients.length,
        products:     finalProducts.length,
        transactions: transactions.length,
        totalRevenue: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
        totalProfit:  `Rp ${totalProfitAll.toLocaleString("id-ID")}`,
        period:       "1 Maret – 8 Mei 2026",
      },
    });

  } catch (error: any) {
    console.error("SEED ERROR:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default seedRouter;