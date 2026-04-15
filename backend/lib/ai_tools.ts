import { Transaction } from "../models/Transaction.ts";
import { Product } from "../models/Product.ts";
import { Ingredient } from "../models/Ingredient.ts";
import { Category } from "../models/Category.ts";

// ==================== TOOL DEFINITIONS (untuk Gemini) ====================
// Format: Google Gemini Function Calling schema
// https://ai.google.dev/gemini-api/docs/function-calling

export const TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: "get_sales_summary",
        description: "Ambil ringkasan penjualan (omzet, jumlah transaksi, profit) untuk periode tertentu. Gunakan untuk pertanyaan tentang penjualan, omzet, revenue, pendapatan, penghasilan. Bisa pakai period preset ATAU custom date range.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["today", "week", "month", "custom"],
              description: "Periode data: today (hari ini), week (7 hari terakhir), month (30 hari terakhir), custom (gunakan start_date & end_date)"
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal format YYYY-MM-DD (wajib jika period=custom). Contoh: 2026-04-01"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom). Contoh: 2026-04-30"
            }
          },
          required: ["period"]
        }
      },
      {
        name: "get_daily_breakdown",
        description: "Ambil rincian penjualan per hari (revenue dan jumlah transaksi). Gunakan jika user ingin melihat tren harian, perbandingan antar hari, atau grafik penjualan.",
        parameters: {
          type: "OBJECT",
          properties: {
            days: {
              type: "INTEGER",
              description: "Jumlah hari ke belakang yang ingin ditampilkan (default 7)"
            }
          },
          required: ["days"]
        }
      },
      {
        name: "get_top_products",
        description: "Ambil daftar produk berdasarkan revenue atau quantity terjual. Bisa untuk produk TERLARIS (desc) maupun PALING SEDIKIT terjual (asc). Gunakan untuk pertanyaan tentang produk laris, best seller, paling laku, paling sedikit terjual, kurang diminati.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode data: week (7 hari), month (30 hari), custom (gunakan start_date & end_date)"
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal format YYYY-MM-DD (wajib jika period=custom)"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom)"
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah produk yang ditampilkan (default 10, max 20)"
            },
            sort_by: {
              type: "STRING",
              enum: ["revenue", "quantity"],
              description: "Urutkan berdasarkan revenue atau jumlah terjual"
            },
            sort_order: {
              type: "STRING",
              enum: ["desc", "asc"],
              description: "Urutan: desc (terbanyak/terlaris, default), asc (paling sedikit/kurang laku)"
            }
          },
          required: ["period"]
        }
      },
      {
        name: "get_low_stock_ingredients",
        description: "Ambil daftar bahan baku (ingredient) yang stoknya rendah atau hampir habis. Gunakan untuk pertanyaan tentang stok, bahan baku kritis, perlu restock, atau ketersediaan bahan.",
        parameters: {
          type: "OBJECT",
          properties: {
            threshold: {
              type: "INTEGER",
              description: "Batas stok dianggap rendah (default 10)"
            }
          }
        }
      },
      {
        name: "get_product_list",
        description: "Ambil daftar produk (menu/item yang dijual) beserta harga, kategori, dan resep bahan baku. Gunakan untuk pertanyaan tentang daftar produk, harga menu, produk apa saja, atau cari produk tertentu.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: {
              type: "STRING",
              description: "Filter berdasarkan nama kategori (opsional). Kosongkan untuk semua produk."
            },
            search: {
              type: "STRING",
              description: "Kata kunci pencarian nama produk (opsional)"
            }
          }
        }
      },
      {
        name: "get_ingredient_list",
        description: "Ambil daftar semua bahan baku (ingredients) beserta stok, unit, dan harga modal per unit. Gunakan untuk pertanyaan tentang inventaris bahan, modal bahan baku, daftar ingredient.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "get_category_list",
        description: "Ambil daftar semua kategori produk. Gunakan jika user bertanya tentang kategori, jenis produk, atau klasifikasi menu.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      },
      {
        name: "get_transaction_detail",
        description: "Ambil detail satu transaksi berdasarkan nomor receipt/struk. Gunakan ketika user bertanya tentang transaksi spesifik, nota tertentu.",
        parameters: {
          type: "OBJECT",
          properties: {
            receipt_number: {
              type: "STRING",
              description: "Nomor receipt/struk transaksi"
            }
          },
          required: ["receipt_number"]
        }
      },
      {
        name: "get_profit_report",
        description: "Ambil laporan profit/keuntungan bersih. Gunakan untuk pertanyaan tentang profit, laba, keuntungan, margin.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode: week (7 hari), month (30 hari), custom (gunakan start_date & end_date)"
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal format YYYY-MM-DD (wajib jika period=custom)"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom)"
            }
          },
          required: ["period"]
        }
      },
      {
        name: "get_payment_method_stats",
        description: "Ambil statistik metode pembayaran (cash, QRIS, gopay, transfer). Gunakan untuk pertanyaan tentang pembayaran, QRIS, cash, transfer, metode bayar.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode: week (7 hari), month (30 hari), custom (gunakan start_date & end_date)"
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal format YYYY-MM-DD (wajib jika period=custom)"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom)"
            }
          },
          required: ["period"]
        }
      },
      {
        name: "compare_periods",
        description: "Bandingkan metrik bisnis antara dua periode dan hitung perubahan absolut + persentase. Gunakan untuk pertanyaan seperti 'bulan ini vs bulan lalu' atau 'minggu ini dibanding minggu lalu'.",
        parameters: {
          type: "OBJECT",
          properties: {
            metric: {
              type: "STRING",
              enum: ["revenue", "profit", "transactions", "avg_transaction"],
              description: "Metrik utama yang akan dibandingkan"
            },
            current_period: {
              type: "STRING",
              enum: ["today", "week", "month", "custom"],
              description: "Periode utama yang dianalisis"
            },
            current_start_date: {
              type: "STRING",
              description: "Tanggal awal current_period jika custom (YYYY-MM-DD)"
            },
            current_end_date: {
              type: "STRING",
              description: "Tanggal akhir current_period jika custom (YYYY-MM-DD)"
            },
            compare_with: {
              type: "STRING",
              enum: ["previous_period", "same_period_last_week", "same_period_last_month", "custom"],
              description: "Cara memilih periode pembanding"
            },
            compare_start_date: {
              type: "STRING",
              description: "Tanggal awal periode pembanding jika compare_with=custom (YYYY-MM-DD)"
            },
            compare_end_date: {
              type: "STRING",
              description: "Tanggal akhir periode pembanding jika compare_with=custom (YYYY-MM-DD)"
            }
          },
          required: ["metric", "current_period", "compare_with"]
        }
      },
      {
        name: "search_transactions",
        description: "Cari daftar transaksi dengan filter fleksibel: tanggal, metode pembayaran, customer, item produk, dan rentang nominal. Gunakan ketika user tidak punya nomor struk spesifik.",
        parameters: {
          type: "OBJECT",
          properties: {
            start_date: {
              type: "STRING",
              description: "Tanggal awal pencarian (YYYY-MM-DD)"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir pencarian (YYYY-MM-DD)"
            },
            payment_method: {
              type: "STRING",
              enum: ["cash", "qris", "gopay", "transfer"],
              description: "Filter metode pembayaran (opsional)"
            },
            customer_name: {
              type: "STRING",
              description: "Filter nama customer (opsional, partial match)"
            },
            product_name: {
              type: "STRING",
              description: "Filter transaksi yang memuat nama produk tertentu (opsional)"
            },
            min_amount: {
              type: "NUMBER",
              description: "Nominal transaksi minimum (opsional)"
            },
            max_amount: {
              type: "NUMBER",
              description: "Nominal transaksi maksimum (opsional)"
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah maksimal hasil (default 20, max 50)"
            }
          }
        }
      },
      {
        name: "get_customer_stats",
        description: "Ambil statistik pelanggan: total pelanggan unik, pelanggan paling sering transaksi, dan pelanggan dengan spending tertinggi.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode data pelanggan"
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)"
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah top customer yang ditampilkan (default 10, max 20)"
            }
          },
          required: ["period"]
        }
      },
      {
        name: "get_discount_analysis",
        description: "Analisis diskon penjualan: total diskon, rasio diskon terhadap omzet, dan transaksi dengan diskon terbesar.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode analisis diskon"
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)"
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)"
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah transaksi diskon terbesar yang ditampilkan (default 10, max 20)"
            }
          },
          required: ["period"]
        }
      },
      {
        name: "get_hourly_sales",
        description: "Ambil pola penjualan per jam (jam sibuk/ramai). Gunakan untuk pertanyaan tentang jam ramai, jam sibuk, peak hours, kapan paling rame.",
        parameters: {
          type: "OBJECT",
          properties: {
            days: {
              type: "INTEGER",
              description: "Jumlah hari data yang dianalisis (default 30)"
            }
          }
        }
      }
    ]
  }
];

// ==================== HELPER: Date Ranges ====================
function getDateRange(period: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Custom date range: parse YYYY-MM-DD
  if (period === 'custom' && startDate && endDate) {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    return {
      start: new Date(sy, sm - 1, sd),
      end: new Date(ey, em - 1, ed + 1), // +1 hari supaya inclusive
    };
  }

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'week':
      return { start: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000), end: todayEnd };
    case 'month':
    default:
      return { start: new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000), end: todayEnd };
  }
}

const formatRp = (v: number) => `Rp ${Math.round(v).toLocaleString('id-ID')}`;

async function aggregateSummaryByDateRange(start: Date, end: Date) {
  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total_amount" },
        profit: { $sum: "$profit" },
        transaction_count: { $sum: 1 },
      }
    }
  ]);

  const summary = result[0] || { revenue: 0, profit: 0, transaction_count: 0 };
  const avgTransaction = summary.transaction_count > 0
    ? summary.revenue / summary.transaction_count
    : 0;

  return {
    revenue: summary.revenue,
    profit: summary.profit,
    transactions: summary.transaction_count,
    avg_transaction: avgTransaction,
  };
}

// ==================== TOOL EXECUTORS ====================

async function exec_get_sales_summary(args: any) {
  const { start, end } = getDateRange(args.period || 'today', args.start_date, args.end_date);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: "$total_amount" },
        total_gross: { $sum: "$total_real_amount" },
        total_profit: { $sum: "$profit" },
        total_discount: { $sum: "$discount_amount" },
        transaction_count: { $sum: 1 },
        avg_transaction: { $avg: "$total_amount" },
      }
    }
  ]);

  const data = result[0] || { total_revenue: 0, total_gross: 0, total_profit: 0, total_discount: 0, transaction_count: 0, avg_transaction: 0 };
  
  return {
    period: args.period,
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
    total_revenue: data.total_revenue,
    total_revenue_formatted: formatRp(data.total_revenue),
    total_gross_revenue: data.total_gross,
    total_profit: data.total_profit,
    total_profit_formatted: formatRp(data.total_profit),
    total_discount: data.total_discount,
    transaction_count: data.transaction_count,
    avg_transaction_value: Math.round(data.avg_transaction || 0),
    avg_transaction_formatted: formatRp(data.avg_transaction || 0),
  };
}

async function exec_get_daily_breakdown(args: any) {
  const days = Math.min(args.days || 7, 90);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const startDate = new Date(todayStart.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate, $lt: todayEnd } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Jakarta" } },
        revenue: { $sum: "$total_amount" },
        profit: { $sum: "$profit" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    days_requested: days,
    breakdown: result.map((d: any) => ({
      date: d._id,
      revenue: d.revenue,
      revenue_formatted: formatRp(d.revenue),
      profit: d.profit,
      transaction_count: d.count,
    }))
  };
}

async function exec_get_top_products(args: any) {
  const { start, end } = getDateRange(args.period || 'month', args.start_date, args.end_date);
  const limit = Math.min(args.limit || 10, 20);
  const sortField = args.sort_by === 'quantity' ? 'qty' : 'rev';
  const sortDir = args.sort_order === 'asc' ? 1 : -1;

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        qty: { $sum: "$items.quantity" },
        rev: { $sum: "$items.total_amount" },
        profit: { $sum: { $subtract: ["$items.total_amount", { $multiply: ["$items.quantity", "$items.cost_at_sale"] }] } },
        category: { $first: "$items.category_name" }
      }
    },
    { $sort: { [sortField]: sortDir } },
    { $limit: limit }
  ]);

  return {
    period: args.period,
    sorted_by: args.sort_by || 'revenue',
    sort_order: args.sort_order || 'desc',
    products: result.map((p: any, i: number) => ({
      rank: i + 1,
      name: p._id,
      category: p.category || 'Umum',
      quantity_sold: p.qty,
      revenue: p.rev,
      revenue_formatted: formatRp(p.rev),
      profit: Math.round(p.profit),
      profit_formatted: formatRp(p.profit),
    }))
  };
}

async function exec_get_low_stock_ingredients(args: any) {
  const threshold = args.threshold || 10;

  const result = await Ingredient.find({ stock_quantity: { $lt: threshold } })
    .sort({ stock_quantity: 1 })
    .limit(20);

  return {
    threshold,
    count: result.length,
    ingredients: result.map((i: any) => ({
      name: i.name,
      unit: i.unit,
      stock_remaining: i.stock_quantity,
      cost_per_unit: i.cost_per_unit,
      cost_per_unit_formatted: formatRp(i.cost_per_unit),
      status: i.stock_quantity <= 0 ? 'HABIS' : i.stock_quantity < threshold / 2 ? 'KRITIS' : 'RENDAH',
    }))
  };
}

async function exec_get_product_list(args: any) {
  const query: any = {};
  
  if (args.search) {
    query.name = { $regex: args.search, $options: 'i' };
  }

  let products = await Product.find(query)
    .populate('category_id', 'name')
    .populate('recipe.ingredient_id', 'name unit stock_quantity')
    .limit(50);

  // Filter by category name if specified
  if (args.category) {
    products = products.filter((p: any) => {
      const catName = (p.category_id as any)?.name || '';
      return catName.toLowerCase().includes(args.category.toLowerCase());
    });
  }

  return {
    count: products.length,
    products: products.map((p: any) => ({
      name: p.name,
      price: p.price,
      price_formatted: formatRp(p.price),
      category: (p.category_id as any)?.name || 'Umum',
      recipe: p.recipe?.map((r: any) => ({
        ingredient: (r.ingredient_id as any)?.name || 'Unknown',
        amount_needed: r.amount_needed,
        unit: (r.ingredient_id as any)?.unit || '',
        stock_available: (r.ingredient_id as any)?.stock_quantity || 0,
      })) || [],
    }))
  };
}

async function exec_get_ingredient_list() {
  const ingredients = await Ingredient.find().sort({ name: 1 });

  return {
    count: ingredients.length,
    ingredients: ingredients.map((i: any) => ({
      name: i.name,
      unit: i.unit,
      stock_quantity: i.stock_quantity,
      cost_per_unit: i.cost_per_unit,
      cost_per_unit_formatted: formatRp(i.cost_per_unit),
    }))
  };
}

async function exec_get_category_list() {
  const categories = await Category.find().sort({ name: 1 });

  return {
    count: categories.length,
    categories: categories.map((c: any) => ({
      name: c.name,
      description: c.description || '',
    }))
  };
}

async function exec_get_transaction_detail(args: any) {
  const tx = await Transaction.findOne({ receipt_number: args.receipt_number });

  if (!tx) {
    return { error: `Transaksi dengan nomor ${args.receipt_number} tidak ditemukan.` };
  }

  return {
    receipt_number: tx.receipt_number,
    date: (tx as any).createdAt,
    customer: tx.customer_name,
    payment_method: tx.payment_method,
    total_amount: tx.total_amount,
    total_amount_formatted: formatRp(tx.total_amount),
    total_real_amount: tx.total_real_amount,
    discount: tx.discount_amount,
    profit: tx.profit,
    amount_paid: tx.amount_paid,
    change: tx.change_amount,
    items: tx.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price_at_sale,
      total: item.total_amount,
    }))
  };
}

async function exec_get_profit_report(args: any) {
  const { start, end } = getDateRange(args.period || 'month', args.start_date, args.end_date);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: "$total_amount" },
        total_gross: { $sum: "$total_real_amount" },
        total_profit: { $sum: "$profit" },
        total_discount: { $sum: "$discount_amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  const data = result[0] || { total_revenue: 0, total_gross: 0, total_profit: 0, total_discount: 0, count: 0 };
  const margin = data.total_revenue > 0 ? (data.total_profit / data.total_revenue * 100) : 0;

  // Profit per produk
  const productProfit = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        revenue: { $sum: "$items.total_amount" },
        cost: { $sum: { $multiply: ["$items.quantity", "$items.cost_at_sale"] } },
        profit: { $sum: { $subtract: ["$items.total_amount", { $multiply: ["$items.quantity", "$items.cost_at_sale"] }] } },
        qty: { $sum: "$items.quantity" }
      }
    },
    { $sort: { profit: -1 } },
    { $limit: 10 }
  ]);

  return {
    period: args.period,
    summary: {
      total_revenue: data.total_revenue,
      total_revenue_formatted: formatRp(data.total_revenue),
      total_profit: data.total_profit,
      total_profit_formatted: formatRp(data.total_profit),
      total_discount: data.total_discount,
      profit_margin_percent: Math.round(margin * 10) / 10,
      transaction_count: data.count,
    },
    top_profit_products: productProfit.map((p: any) => ({
      name: p._id,
      revenue: p.revenue,
      cost: Math.round(p.cost),
      profit: Math.round(p.profit),
      profit_formatted: formatRp(p.profit),
      quantity_sold: p.qty,
    }))
  };
}

async function exec_get_payment_method_stats(args: any) {
  const { start, end } = getDateRange(args.period || 'month', args.start_date, args.end_date);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: "$payment_method",
        total: { $sum: "$total_amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const grandTotal = result.reduce((sum: number, r: any) => sum + r.total, 0);

  return {
    period: args.period,
    methods: result.map((r: any) => ({
      method: r._id || 'unknown',
      total: r.total,
      total_formatted: formatRp(r.total),
      transaction_count: r.count,
      percentage: grandTotal > 0 ? Math.round(r.total / grandTotal * 1000) / 10 : 0,
    }))
  };
}

async function exec_get_hourly_sales(args: any) {
  const days = Math.min(args.days || 30, 90);
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startDate = new Date(todayEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate, $lt: todayEnd } } },
    {
      $group: {
        _id: { $hour: { date: "$createdAt", timezone: "Asia/Jakarta" } },
        revenue: { $sum: "$total_amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Sortir untuk cari jam tersibuk
  const sorted = [...result].sort((a: any, b: any) => b.count - a.count);
  const peakHours = sorted.slice(0, 3).map((h: any) => `${h._id.toString().padStart(2, '0')}:00`);

  return {
    analyzed_days: days,
    peak_hours: peakHours,
    hourly_data: result.map((h: any) => ({
      hour: `${h._id.toString().padStart(2, '0')}:00`,
      revenue: h.revenue,
      revenue_formatted: formatRp(h.revenue),
      transaction_count: h.count,
      avg_per_day: Math.round(h.count / days * 10) / 10,
    }))
  };
}

async function exec_compare_periods(args: any) {
  const currentRange = getDateRange(
    args.current_period || "month",
    args.current_start_date,
    args.current_end_date
  );

  let compareRange: { start: Date; end: Date };
  if (args.compare_with === "custom" && args.compare_start_date && args.compare_end_date) {
    compareRange = getDateRange("custom", args.compare_start_date, args.compare_end_date);
  } else {
    const spanMs = currentRange.end.getTime() - currentRange.start.getTime();
    if (args.compare_with === "same_period_last_week") {
      compareRange = {
        start: new Date(currentRange.start.getTime() - (7 * 24 * 60 * 60 * 1000)),
        end: new Date(currentRange.end.getTime() - (7 * 24 * 60 * 60 * 1000)),
      };
    } else if (args.compare_with === "same_period_last_month") {
      compareRange = {
        start: new Date(currentRange.start.getTime() - (30 * 24 * 60 * 60 * 1000)),
        end: new Date(currentRange.end.getTime() - (30 * 24 * 60 * 60 * 1000)),
      };
    } else {
      compareRange = {
        start: new Date(currentRange.start.getTime() - spanMs),
        end: new Date(currentRange.start.getTime()),
      };
    }
  }

  const [currentSummary, compareSummary] = await Promise.all([
    aggregateSummaryByDateRange(currentRange.start, currentRange.end),
    aggregateSummaryByDateRange(compareRange.start, compareRange.end),
  ]);

  const metric = args.metric || "revenue";
  const currentValue = Number(currentSummary[metric as keyof typeof currentSummary] || 0);
  const compareValue = Number(compareSummary[metric as keyof typeof compareSummary] || 0);
  const diff = currentValue - compareValue;
  const percentChange = compareValue === 0 ? (currentValue > 0 ? 100 : 0) : (diff / compareValue) * 100;

  return {
    metric,
    current_period: {
      start_date: currentRange.start.toISOString().split("T")[0],
      end_date: new Date(currentRange.end.getTime() - 1).toISOString().split("T")[0],
      ...currentSummary,
    },
    compare_period: {
      start_date: compareRange.start.toISOString().split("T")[0],
      end_date: new Date(compareRange.end.getTime() - 1).toISOString().split("T")[0],
      ...compareSummary,
    },
    comparison: {
      current_value: currentValue,
      compare_value: compareValue,
      difference: diff,
      difference_formatted: metric === "transactions" ? `${Math.round(diff)}` : formatRp(diff),
      percent_change: Math.round(percentChange * 10) / 10,
      trend: diff > 0 ? "naik" : diff < 0 ? "turun" : "stagnan",
    }
  };
}

async function exec_search_transactions(args: any) {
  const query: any = {};
  const limit = Math.min(Number(args.limit || 20), 50);

  if (args.start_date || args.end_date) {
    const start = args.start_date ? new Date(args.start_date) : new Date("1970-01-01");
    const end = args.end_date ? new Date(args.end_date) : new Date();
    end.setDate(end.getDate() + 1);
    query.createdAt = { $gte: start, $lt: end };
  }
  if (args.payment_method) query.payment_method = args.payment_method;
  if (args.customer_name) query.customer_name = { $regex: args.customer_name, $options: "i" };
  if (args.min_amount !== undefined || args.max_amount !== undefined) {
    query.total_amount = {};
    if (args.min_amount !== undefined) query.total_amount.$gte = Number(args.min_amount);
    if (args.max_amount !== undefined) query.total_amount.$lte = Number(args.max_amount);
  }
  if (args.product_name) {
    query["items.name"] = { $regex: args.product_name, $options: "i" };
  }

  const rows = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return {
    filters_applied: {
      start_date: args.start_date || null,
      end_date: args.end_date || null,
      payment_method: args.payment_method || null,
      customer_name: args.customer_name || null,
      product_name: args.product_name || null,
      min_amount: args.min_amount ?? null,
      max_amount: args.max_amount ?? null,
    },
    count: rows.length,
    transactions: rows.map((tx: any) => ({
      receipt_number: tx.receipt_number,
      date: tx.createdAt,
      customer_name: tx.customer_name,
      payment_method: tx.payment_method,
      total_amount: tx.total_amount,
      total_amount_formatted: formatRp(tx.total_amount),
      discount_amount: tx.discount_amount,
      item_count: Array.isArray(tx.items) ? tx.items.length : 0,
    })),
  };
}

async function exec_get_customer_stats(args: any) {
  const { start, end } = getDateRange(args.period || "month", args.start_date, args.end_date);
  const limit = Math.min(Number(args.limit || 10), 20);

  const stats = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $ifNull: ["$customer_name", "Pelanggan Umum"] },
        transaction_count: { $sum: 1 },
        total_spending: { $sum: "$total_amount" },
        total_profit: { $sum: "$profit" },
      }
    },
    { $sort: { total_spending: -1 } }
  ]);

  return {
    period: args.period,
    unique_customers: stats.length,
    top_by_spending: stats.slice(0, limit).map((row: any, idx: number) => ({
      rank: idx + 1,
      customer_name: row._id,
      transaction_count: row.transaction_count,
      total_spending: row.total_spending,
      total_spending_formatted: formatRp(row.total_spending),
      total_profit: row.total_profit,
      total_profit_formatted: formatRp(row.total_profit),
    })),
    top_by_frequency: [...stats]
      .sort((a: any, b: any) => b.transaction_count - a.transaction_count)
      .slice(0, limit)
      .map((row: any, idx: number) => ({
        rank: idx + 1,
        customer_name: row._id,
        transaction_count: row.transaction_count,
        total_spending: row.total_spending,
        total_spending_formatted: formatRp(row.total_spending),
      })),
  };
}

async function exec_get_discount_analysis(args: any) {
  const { start, end } = getDateRange(args.period || "month", args.start_date, args.end_date);
  const limit = Math.min(Number(args.limit || 10), 20);

  const [summaryRows, topDiscountRows] = await Promise.all([
    Transaction.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: null,
          transaction_count: { $sum: 1 },
          discounted_transactions: {
            $sum: {
              $cond: [{ $gt: ["$discount_amount", 0] }, 1, 0]
            }
          },
          total_discount: { $sum: "$discount_amount" },
          total_revenue: { $sum: "$total_amount" },
          total_gross: { $sum: "$total_real_amount" },
          total_profit: { $sum: "$profit" },
        }
      }
    ]),
    Transaction.find({
      createdAt: { $gte: start, $lt: end },
      discount_amount: { $gt: 0 },
    })
      .sort({ discount_amount: -1, createdAt: -1 })
      .limit(limit)
      .lean()
  ]);

  const summary = summaryRows[0] || {
    transaction_count: 0,
    discounted_transactions: 0,
    total_discount: 0,
    total_revenue: 0,
    total_gross: 0,
    total_profit: 0,
  };

  const discountRate = summary.total_gross > 0 ? (summary.total_discount / summary.total_gross) * 100 : 0;
  const discountCoverage = summary.transaction_count > 0
    ? (summary.discounted_transactions / summary.transaction_count) * 100
    : 0;

  return {
    period: args.period,
    summary: {
      transaction_count: summary.transaction_count,
      discounted_transactions: summary.discounted_transactions,
      discounted_transaction_rate_percent: Math.round(discountCoverage * 10) / 10,
      total_discount: summary.total_discount,
      total_discount_formatted: formatRp(summary.total_discount),
      total_revenue: summary.total_revenue,
      total_revenue_formatted: formatRp(summary.total_revenue),
      total_profit: summary.total_profit,
      total_profit_formatted: formatRp(summary.total_profit),
      discount_rate_percent: Math.round(discountRate * 10) / 10,
    },
    largest_discount_transactions: topDiscountRows.map((tx: any) => ({
      receipt_number: tx.receipt_number,
      date: tx.createdAt,
      customer_name: tx.customer_name,
      payment_method: tx.payment_method,
      discount_amount: tx.discount_amount,
      discount_amount_formatted: formatRp(tx.discount_amount),
      total_amount: tx.total_amount,
      total_amount_formatted: formatRp(tx.total_amount),
    })),
  };
}

// ==================== EXECUTOR REGISTRY ====================
const EXECUTORS: Record<string, (args: any) => Promise<any>> = {
  get_sales_summary: exec_get_sales_summary,
  get_daily_breakdown: exec_get_daily_breakdown,
  get_top_products: exec_get_top_products,
  get_low_stock_ingredients: exec_get_low_stock_ingredients,
  get_product_list: exec_get_product_list,
  get_ingredient_list: exec_get_ingredient_list,
  get_category_list: exec_get_category_list,
  get_transaction_detail: exec_get_transaction_detail,
  get_profit_report: exec_get_profit_report,
  get_payment_method_stats: exec_get_payment_method_stats,
  compare_periods: exec_compare_periods,
  search_transactions: exec_search_transactions,
  get_customer_stats: exec_get_customer_stats,
  get_discount_analysis: exec_get_discount_analysis,
  get_hourly_sales: exec_get_hourly_sales,
};

/**
 * Eksekusi tool berdasarkan nama dan argumen dari Gemini Function Call
 */
export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  const executor = EXECUTORS[name];
  if (!executor) {
    return { error: `Tool "${name}" tidak dikenali.` };
  }

  try {
    console.log(`[AI Tool] Executing: ${name}(${JSON.stringify(args)})`);
    const result = await executor(args);
    console.log(`[AI Tool] ${name} returned ${JSON.stringify(result).length} chars`);
    return result;
  } catch (err: any) {
    console.error(`[AI Tool] Error executing ${name}:`, err);
    return { error: `Gagal mengambil data: ${err.message}` };
  }
}
