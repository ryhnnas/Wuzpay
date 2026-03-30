import { Hono } from "npm:hono";
import { User } from "../models/User.ts";
import mongoose from "npm:mongoose";
import bcrypt from "npm:bcryptjs";

const seedRouter = new Hono();

// Helper Tanggal Random Maret 2026
const getRandomMarchDate = () => {
  const day = Math.floor(Math.random() * 30) + 1;
  const hour = Math.floor(Math.random() * 12) + 10; 
  return new Date(2026, 2, day, hour, Math.floor(Math.random() * 60), 0);
};

seedRouter.get("/full-setup", async (c) => {
  try {
    // 1. BERSIHKAN SEMUA DATA
    const collections = ['users', 'categories', 'products', 'transactions', 'entities', 'permissions'];
    for (const col of collections) {
      await mongoose.connection.db.collection(col).deleteMany({});
    }

    // 2. BUAT ENTITY
    const entityId = new mongoose.Types.ObjectId();
    await mongoose.connection.db.collection("entities").insertOne({
      _id: entityId,
      name: "WuzPay Coffee & Eatery",
      address: "Sentra Kuliner Bandung No. 404",
      config: { currency: "IDR" }
    });

    // 3. BUAT OWNER
    const ownerId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      _id: ownerId,
      name: "Owner WuzPay",
      email: "admin@wuzpay.com",
      password: hashedPassword,
      role: "owner",
      entity_id: entityId
    });

    // 4. BUAT 5 KATEGORI
    const categories = [
      { name: "Coffee Based", id: new mongoose.Types.ObjectId(), code: "COF" },
      { name: "Non-Coffee", id: new mongoose.Types.ObjectId(), code: "NCF" },
      { name: "Indomie & Noodle", id: new mongoose.Types.ObjectId(), code: "NOD" },
      { name: "Main Course", id: new mongoose.Types.ObjectId(), code: "MCR" },
      { name: "Pastry & Snacks", id: new mongoose.Types.ObjectId(), code: "SNK" },
    ];

    await mongoose.connection.db.collection("categories").insertMany(
      categories.map(cat => ({ _id: cat.id, name: cat.name, entity_id: entityId }))
    );

    // 5. BUAT 50 PRODUK (10 PER KATEGORI)
    const productBase = [
      // Kategori 1: Coffee Based
      { n: "Espresso Single", p: 15000, c: 5000, cat: 0, img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500" },
      { n: "Americano Iced", p: 18000, c: 6000, cat: 0, img: "https://images.unsplash.com/photo-1551046710-1d956b9286d3?w=500" },
      { n: "Caffe Latte", p: 25000, c: 10000, cat: 0, img: "https://images.unsplash.com/photo-1570968015849-04bb1ca6138d?w=500" },
      { n: "Cappuccino Hot", p: 25000, c: 10000, cat: 0, img: "https://images.unsplash.com/photo-1572442388796-11668a67e13d?w=500" },
      { n: "Caramel Macchiato", p: 32000, c: 12000, cat: 0, img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500" },
      { n: "Es Kopi Susu Aren", p: 22000, c: 8000, cat: 0, img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500" },
      { n: "Hazelnut Latte", p: 30000, c: 11000, cat: 0, img: "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=500" },
      { n: "Mochaccino", p: 28000, c: 11000, cat: 0, img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500" },
      { n: "Affogato Vanilla", p: 24000, c: 9000, cat: 0, img: "https://images.unsplash.com/photo-1594266302093-f1f2e822987a?w=500" },
      { n: "V60 Manual Brew", p: 25000, c: 7000, cat: 0, img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500" },

      // Kategori 2: Non-Coffee
      { n: "Matcha Latte", p: 28000, c: 12000, cat: 1, img: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=500" },
      { n: "Chocolate Signature", p: 26000, c: 11000, cat: 1, img: "https://images.unsplash.com/photo-1544787210-22bb840c5d63?w=500" },
      { n: "Red Velvet Latte", p: 28000, c: 12000, cat: 1, img: "https://images.unsplash.com/photo-1610450537497-6a4a7538a08a?w=500" },
      { n: "Lychee Tea", p: 20000, c: 6000, cat: 1, img: "https://images.unsplash.com/photo-1582793988951-9aed55099991?w=500" },
      { n: "Thai Tea Iced", p: 18000, c: 5000, cat: 1, img: "https://images.unsplash.com/photo-1525193612562-0ec53b0e5d7c?w=500" },
      { n: "Lemonade Fresh", p: 22000, c: 6000, cat: 1, img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500" },
      { n: "Strawberry Milkshake", p: 25000, c: 10000, cat: 1, img: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500" },
      { n: "Taro Blast", p: 26000, c: 11000, cat: 1, img: "https://images.unsplash.com/photo-1579954115545-a95591f28be0?w=500" },
      { n: "Earl Grey Tea", p: 18000, c: 4000, cat: 1, img: "https://images.unsplash.com/photo-1594631252845-29fc4586d52c?w=500" },
      { n: "Mineral Water", p: 8000, c: 2000, cat: 1, img: "https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=500" },

      // Kategori 3: Indomie & Noodle
      { n: "Indomie Goreng Ori", p: 12000, c: 5000, cat: 2, img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500" },
      { n: "Indomie Nyemek Pedas", p: 18000, c: 7000, cat: 2, img: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500" },
      { n: "Indomie Carbonara", p: 24000, c: 12000, cat: 2, img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500" },
      { n: "Mie Ayam WuzPay", p: 22000, c: 10000, cat: 2, img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500" },
      { n: "Mie Dok-Dok Jogja", p: 20000, c: 8000, cat: 2, img: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500" },
      { n: "Indomie Kari Spesial", p: 15000, c: 6000, cat: 2, img: "https://images.unsplash.com/photo-1594759842811-9f9a4c884cb4?w=500" },
      { n: "Yamin Manis Gurih", p: 22000, c: 9000, cat: 2, img: "https://images.unsplash.com/photo-1618413651759-4d691e84372a?w=500" },
      { n: "Indomie Salted Egg", p: 25000, c: 13000, cat: 2, img: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=500" },
      { n: "Mie Goreng Aceh", p: 25000, c: 11000, cat: 2, img: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500" },
      { n: "Indomie Rebus Telur", p: 15000, c: 6000, cat: 2, img: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=500" },

      // Kategori 4: Main Course
      { n: "Nasi Goreng Hongkong", p: 35000, c: 15000, cat: 3, img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500" },
      { n: "Ricebowl Teriyaki", p: 32000, c: 14000, cat: 3, img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500" },
      { n: "Nasi Ayam Geprek", p: 28000, c: 12000, cat: 3, img: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=500" },
      { n: "Steak Ayam Crispy", p: 38000, c: 18000, cat: 3, img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500" },
      { n: "Spaghetti Aglio Olio", p: 30000, c: 12000, cat: 3, img: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500" },
      { n: "Beef Burger Deluxe", p: 45000, c: 22000, cat: 3, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
      { n: "Fish & Chips", p: 38000, c: 19000, cat: 3, img: "https://images.unsplash.com/photo-1524335617579-524982672a80?w=500" },
      { n: "Nasi Gila WuzPay", p: 28000, c: 11000, cat: 3, img: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500" },
      { n: "Chicken Cordon Bleu", p: 42000, c: 21000, cat: 3, img: "https://images.unsplash.com/photo-1632778149975-420e0e75ee08?w=500" },
      { n: "Ricebowl Sambal Matah", p: 32000, c: 13000, cat: 3, img: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500" },

      // Kategori 5: Pastry & Snacks
      { n: "Croissant Almond", p: 28000, c: 14000, cat: 4, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500" },
      { n: "Pain Au Chocolat", p: 26000, c: 13000, cat: 4, img: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=500" },
      { n: "French Fries", p: 20000, c: 8000, cat: 4, img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500" },
      { n: "Cireng Bumbu Rujak", p: 18000, c: 6000, cat: 4, img: "https://images.unsplash.com/photo-1505253149613-112d21d9f6a9?w=500" },
      { n: "Banana Fritters", p: 20000, c: 7000, cat: 4, img: "https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=500" },
      { n: "Dimsum Mix 4pcs", p: 22000, c: 10000, cat: 4, img: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500" },
      { n: "Singkong Goreng Keju", p: 18000, c: 6000, cat: 4, img: "https://images.unsplash.com/photo-1596797038530-2c39bb9ed9ac?w=500" },
      { n: "Brownies Slice", p: 15000, c: 7000, cat: 4, img: "https://images.unsplash.com/photo-1589119634773-84073a728fa0?w=500" },
      { n: "Platter Snack Mix", p: 45000, c: 20000, cat: 4, img: "https://images.unsplash.com/photo-1566417713940-0aa89cfd1abc?w=500" },
      { n: "Cinnamon Roll", p: 24000, c: 11000, cat: 4, img: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=500" },
    ];

    const finalProducts = await Promise.all(
      productBase.map((p, index) => {
        const _id = new mongoose.Types.ObjectId();
        const cat = categories[p.cat];
        return mongoose.connection.db.collection("products").insertOne({
          _id, 
          name: p.n, 
          sku: `WUZ-${cat.code}-${String(index + 1).padStart(3, '0')}`, // SKU OTOMATIS
          price: p.p, 
          cost_price: p.c, 
          category_id: cat.id, 
          entity_id: entityId, 
          stock_quantity: 99, 
          image_url: p.img,
          status: "active"
        }).then(() => ({ ...p, _id, catName: cat.name }));
      })
    );

    // 6. GENERATE 500 TRANSAKSI ACAK
    const transactions = [];
    const paymentMethods = ['cash', 'qris', 'gopay', 'transfer'];

    for (let i = 0; i < 500; i++) {
      const randomProduct = finalProducts[Math.floor(Math.random() * finalProducts.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const priceAtSale = randomProduct.p;
      const costAtSale = randomProduct.c;
      const subtotal = priceAtSale * qty;
      const profitPerItem = (priceAtSale - costAtSale) * qty;
      const date = getRandomMarchDate();
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      transactions.push({
        receipt_number: `WP-202603${String(date.getDate()).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
        userId: ownerId.toString(),
        customer_name: "Pelanggan WuzPay",
        total_amount: subtotal,
        total_real_amount: subtotal,
        discount_amount: 0,
        profit: profitPerItem,
        payment_method: method,
        amount_paid: method === 'cash' ? subtotal + 10000 : subtotal,
        change_amount: method === 'cash' ? 10000 : 0,
        items: [{
          product_id: randomProduct._id,
          name: randomProduct.n,
          quantity: qty,
          price_at_sale: priceAtSale,
          cost_at_sale: costAtSale,
          total_amount: subtotal,
          category_name: randomProduct.catName
        }],
        status: "completed",
        createdAt: date,
        updatedAt: date
      });
    }

    await mongoose.connection.db.collection("transactions").insertMany(transactions);

    return c.json({
      success: true,
      message: "🔥 MEGA SEED V4 BERHASIL! 50 Produk & 500 Transaksi Maret Siap.",
      summary: { products: finalProducts.length, transactions: transactions.length }
    });

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default seedRouter;