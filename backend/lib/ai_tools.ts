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
