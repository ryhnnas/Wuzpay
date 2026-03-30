import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const transactions = new Hono();

// ==================== GET ALL TRANSACTIONS ====================
transactions.get("/", async (c) => {
  const authHeader = c.req.header("Authorization") || null;
  const sessionId = c.req.header("X-Session-ID") || null;
  
  const { error: authError } = await verifyAuth(authHeader, sessionId);
  if (authError) return c.json({ error: authError }, 401);

  const db = getSupabase();
  
  // Ambil query param dari URL (startDate & endDate)
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  let query = db
    .from('transactions')
    .select('*, items:transaction_items(*)') // Ambil transaksi + itemnya
    .order('created_at', { ascending: false });

  // Filter Tanggal di level Database (Biar kenceng!)
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  // JURUS ANTI-LIMIT 1000:
  // Kita set range yang besar, misal dari data ke-0 sampai ke-5000
  const { data, error } = await query.range(0, 5000); 

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// ==================== CREATE TRANSACTION (With Stock Update) ====================
// transactions.ts
transactions.post("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization") || null;
    const sessionId = c.req.header("X-Session-ID") || null;

    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    const body = await c.req.json();
    const now = new Date();

    // ==========================================
    // 1️⃣ GENERATE RECEIPT & SEQUENCE
    // ==========================================
    const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
    const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "");
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    const receiptNumber = `NEX-${datePart}-${timePart}-${randomPart}`;

    const { data: nextSeq } = await db.rpc("get_next_sequence");
    const finalSequence = nextSeq || 1;

    // ==========================================
    // 2️⃣ HITUNG SUBTOAL & DISKON AWAL
    // ==========================================
    const subtotal = parseFloat(body.subtotal || body.total_real_amount || body.total_amount || 0);
    const discountPercent = parseFloat(body.discount_percent || 0);
    let discountAmount = parseFloat(body.discount_amount || 0);

    // Hitung diskon kalau inputnya persen
    if (!discountAmount && discountPercent > 0) {
      discountAmount = subtotal * (discountPercent / 100);
    }

    if (discountAmount > subtotal) {
      return c.json({ error: "Diskon melebihi subtotal" }, 400);
    }

    const totalAmount = subtotal - discountAmount;

    // ==========================================
    // 3️⃣ PROSES ITEMS + HITUNG PROFIT
    // ==========================================
    let totalGrossProfit = 0;
    const processedItems: any[] = [];

    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        const productId = item.product_id || item.id;

        const { data: prod } = await db
          .from("products")
          .select("id, name, cost, sku, price, categories(name)")
          .eq("id", productId)
          .maybeSingle();

        if (prod) {
          const price = parseFloat(item.price_at_sale || item.price || prod.price) || 0;
          const cost = parseFloat(prod.cost) || 0;
          const qty = parseInt(item.quantity) || 0;
          const itemSubTotal = qty * price;

          // Tambahkan ke Profit Kotor
          totalGrossProfit += (price - cost) * qty;

          processedItems.push({
            product_id: prod.id,
            quantity: qty,
            price_at_sale: Number(price.toFixed(2)),
            cost_at_sale: Number(cost.toFixed(2)),
            product_name: prod.name,
            product_code: prod.sku || "",
            category_name: (prod as any).categories?.name || "Umum",
            total_amount: Number(itemSubTotal.toFixed(2)),
            transaction_time: now.toISOString(),
            cashier_name: user?.name || user?.email || "Admin",
            payment_type: body.payment_method === "cash" ? "tunai" : "non-tunai",
            payment_method: body.payment_method || "cash",
            customer_name: body.customer_name || "Pelanggan Umum"
          });
        }
      }
    }

    // ==========================================
    // 4️⃣ HITUNG PROFIT NETO
    // ==========================================
    const netProfit = totalGrossProfit - discountAmount;

    // Pembayaran
    const amountPaid = parseFloat(body.paid_amount || body.amount_paid) || totalAmount;
    const changeAmount = amountPaid - totalAmount;

    const discountName = body.discount_name || null;
    const tableNumber = body.table_number || "-";

    // ==========================================
    // 5️⃣ INSERT TRANSAKSI UTAMA
    // ==========================================
    const { data: newTransaction, error: transError } = await db
      .from("transactions")
      .insert({
        user_id: user.id,
        customer_name: body.customer_name || "Pelanggan Umum",
        total_amount: Number(totalAmount.toFixed(2)),       // Setelah diskon
        total_real_amount: Number(subtotal.toFixed(2)),      // Sebelum diskon
        discount_amount: Number(discountAmount.toFixed(2)),
        discount_name: discountName,
        table_number: tableNumber,
        profit: Number(netProfit.toFixed(2)),                // PROFIT NETO
        payment_method: body.payment_method || "cash",
        payment_type: body.payment_method === "cash" ? "tunai" : "non-tunai",
        amount_paid: Number(amountPaid.toFixed(2)),
        change_amount: Number((changeAmount > 0 ? changeAmount : 0).toFixed(2)),
        receipt_number: receiptNumber,
        cashier_name: user?.name || user?.email || "Admin",
        status: "completed",
        transaction_sequence: finalSequence,
        created_at: now.toISOString()
      })
      .select()
      .single();

    if (transError || !newTransaction) {
      throw new Error("Gagal simpan transaksi: " + transError?.message);
    }

    // ==========================================
    // 6️⃣ INSERT ITEMS + UPDATE STOK
    // ==========================================
    if (processedItems.length > 0) {
      const itemsWithId = processedItems.map(item => ({
        ...item,
        transaction_id: newTransaction.id
      }));

      await db.from("transaction_items").insert(itemsWithId);

      for (const item of itemsWithId) {
        const { data: p } = await db
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (p) {
          await db
            .from("products")
            .update({ stock_quantity: (p.stock_quantity || 0) - item.quantity })
            .eq("id", item.product_id);
        }
      }
    }

    return c.json({
      success: true,
      transaction: newTransaction
    });

  } catch (error: any) {
    console.error("POST TRANSACTION ERROR:", error.message);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== SUMMARY ENDPOINT ====================
transactions.get("/summary", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const { data, error: fetchError } = await db.from('transactions').select('total_amount');
    if (fetchError) throw fetchError;

    const totalRevenue = data.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
    
    return c.json({
      totalTransactions: data.length,
      totalRevenue: totalRevenue,
      avgTransaction: data.length > 0 ? totalRevenue / data.length : 0
    });
  } catch (error) {
    console.error('Summary error:', error);
    return c.json({ error: 'Failed to get summary' }, 500);
  }
});

// ==================== GET TRANSACTION BY ID (With Items) ====================
transactions.get("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getSupabase();

    // 1. Ambil data transaksi induk
    const { data: transaction, error: transError } = await db
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (transError || !transaction) {
      return c.json({ error: 'Transaksi tidak ditemukan' }, 404);
    }

    // 2. Ambil data items (detail belanjaan) untuk struk ini
    const { data: items, error: itemsError } = await db
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', id);

    if (itemsError) throw itemsError;

    // 3. Gabungkan dan kirim balik
    return c.json({ ...transaction, items: items || [] });
  } catch (error) {
    console.error('Fetch transaction detail error:', error);
    return c.json({ error: 'Failed to fetch transaction detail' }, 500);
  }
});

// ==================== UPDATE TRANSACTION (Edit Struk) ====================
transactions.put("/:id", async (c) => {
  try {
    const id = c.req.param('id'); 
    const db = getSupabase();
    const body = await c.req.json();
    const now = new Date().toISOString();

    // 1. AMBIL DATA LAMA (Untuk mengembalikan stok)
    const { data: oldItems } = await db
      .from('transaction_items')
      .select('product_id, quantity')
      .eq('transaction_id', id);

    // 2. REVERSE STOK (Kembalikan stok lama ke gudang)
    if (oldItems) {
      for (const item of oldItems) {
        const { data: p } = await db.from("products").select("stock_quantity").eq("id", item.product_id).single();
        if (p) {
          await db.from("products").update({ stock_quantity: (p.stock_quantity || 0) + item.quantity }).eq("id", item.product_id);
        }
      }
    }

    // 3. HITUNG ULANG PROFIT BERDASARKAN ITEMS BARU
    let newGrossProfit = 0;
    const processedItems: any[] = [];

    for (const item of body.items) {
      const { data: prod } = await db.from("products").select("id, cost, price").eq("id", item.product_id).maybeSingle();
      if (prod) {
        const price = parseFloat(item.price_at_sale || prod.price);
        const cost = parseFloat(prod.cost || 0);
        const qty = parseInt(item.quantity);
        
        newGrossProfit += (price - cost) * qty;
        
        processedItems.push({
          transaction_id: id,
          product_id: prod.id,
          quantity: qty,
          price_at_sale: price,
          cost_at_sale: cost,
          product_name: prod.name,
          product_code: prod.sku || "",
          category_name: (prod as any).categories?.name || "Umum",
          total_amount: qty * price,
          // Sertakan info waktu dan kasir dari body atau data awal
          transaction_time: now,
          cashier_name: body.cashier_name || "Admin", 
          payment_method: body.payment_method || "cash"
        });
      }
    }

    // 4. UPDATE TRANSAKSI UTAMA (Total & Profit)
    // Asumsi: Profit Neto = Gross Profit - Discount (jika ada diskon di struknya)
    // Kamu bisa ambil discount_amount dari body jika dikirim dari UI
    const discountAmount = body.discount_amount || 0;
    const finalNetProfit = newGrossProfit - discountAmount;

    const { error: transError } = await db
      .from('transactions')
      .update({ 
        total_amount: Number(body.total_amount.toFixed(2)),
        profit: Number(finalNetProfit.toFixed(2)), // PROFIT SEKARANG UPDATE!
      })
      .eq('id', id);

    if (transError) throw transError;

    // 5. HAPUS & INSERT ITEMS BARU + POTONG STOK LAGI
    await db.from('transaction_items').delete().eq('transaction_id', id);
    await db.from('transaction_items').insert(processedItems);

    for (const item of processedItems) {
      const { data: p } = await db.from("products").select("stock_quantity").eq("id", item.product_id).single();
      if (p) {
        await db.from("products").update({ stock_quantity: (p.stock_quantity || 0) - item.quantity }).eq("id", item.product_id);
      }
    }

    return c.json({ success: true, message: "Transaksi, Stok, & Profit Berhasil Diperbarui!" });

  } catch (error: any) {
    console.error("UPDATE ERROR:", error.message);
    return c.json({ error: error.message }, 500);
  }
});

export default transactions;