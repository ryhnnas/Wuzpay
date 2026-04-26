
import { Transaction } from "../../models/Transaction.ts";
import { Product } from "../../models/Product.ts";
import { Ingredient } from "../../models/Ingredient.ts";
import { Category } from "../../models/Category.ts";

import { getDateRange, getGlobalTimezone } from "./utils/dateRange.ts";
import { formatRp } from "./utils/formatters.ts";
import { getCache, setCache } from "./utils/cache.ts";
import { logger } from "./utils/logger.ts";
import { validateDateRange, validateLimit, validateNumber } from "./utils/validation.ts";
import * as Types from "./types.ts";

// Helper for aggregate queries
async function aggregateSummaryByDateRange(start: Date, end: Date) {
  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total_amount" },
        profit: { $sum: "$profit" },
        transaction_count: { $sum: 1 },
      },
    },
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

async function exec_get_sales_summary(args: Types.SalesSummaryArgs) {
  validateDateRange(args.period, args.start_date, args.end_date);
  const { start, end } = getDateRange(
    args.period || "today",
    args.start_date,
    args.end_date,
  );

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
      },
    },
  ]);

  const data = result[0] ||
    {
      total_revenue: 0,
      total_gross: 0,
      total_profit: 0,
      total_discount: 0,
      transaction_count: 0,
      avg_transaction: 0,
    };

  return {
    period: args.period,
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
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

async function exec_get_daily_breakdown(args: Types.DailyBreakdownArgs) {
  const days = validateLimit(args.days, 7, 90);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const startDate = new Date(todayStart.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate, $lt: todayEnd } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: getGlobalTimezone(),
          },
        },
        revenue: { $sum: "$total_amount" },
        profit: { $sum: "$profit" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    days_requested: days,
    breakdown: result.map((d: any) => ({
      date: d._id,
      revenue: d.revenue,
      revenue_formatted: formatRp(d.revenue),
      profit: d.profit,
      transaction_count: d.count,
    })),
  };
}

async function exec_get_top_products(args: Types.TopProductsArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );
  const limit = validateLimit(args.limit, 10, 20);
  const sortField = args.sort_by === "quantity" ? "qty" : "rev";
  const sortDir = args.sort_order === "asc" ? 1 : -1;

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        qty: { $sum: "$items.quantity" },
        rev: { $sum: "$items.total_amount" },
        profit: {
          $sum: {
            $subtract: ["$items.total_amount", {
              $multiply: ["$items.quantity", "$items.cost_at_sale"],
            }],
          },
        },
        category: { $first: "$items.category_name" },
      },
    },
    { $sort: { [sortField]: sortDir } },
    { $limit: limit },
  ]);

  return {
    period: args.period,
    sorted_by: args.sort_by || "revenue",
    sort_order: args.sort_order || "desc",
    products: result.map((p: any, i: number) => ({
      rank: i + 1,
      name: p._id,
      category: p.category || "Umum",
      quantity_sold: p.qty,
      revenue: p.rev,
      revenue_formatted: formatRp(p.rev),
      profit: Math.round(p.profit),
      profit_formatted: formatRp(p.profit),
    })),
  };
}

async function exec_get_low_stock_ingredients(args: Types.LowStockIngredientsArgs) {
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
      status: i.stock_quantity <= 0
        ? "HABIS"
        : i.stock_quantity < threshold / 2
        ? "KRITIS"
        : "RENDAH",
    })),
  };
}

async function exec_get_product_list(args: Types.ProductListArgs) {
  const cacheKey = `product_list:${args.category || ""}:${args.search || ""}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const query: any = {};

  if (args.search) {
    query.name = { $regex: args.search, $options: "i" };
  }

  let products = await Product.find(query)
    .populate("category_id", "name")
    .populate("recipe.ingredient_id", "name unit stock_quantity")
    .limit(50)
    .lean();

  // Filter by category name if specified
  if (args.category) {
    products = products.filter((p: any) => {
      const catName = (p.category_id as any)?.name || "";
      return catName.toLowerCase().includes(args.category!.toLowerCase());
    });
  }

  const result = {
    count: products.length,
    products: products.map((p: any) => ({
      name: p.name,
      price: p.price,
      price_formatted: formatRp(p.price),
      category: (p.category_id as any)?.name || "Umum",
      recipe: p.recipe?.map((r: any) => ({
        ingredient: (r.ingredient_id as any)?.name || "Unknown",
        amount_needed: r.amount_needed,
        unit: (r.ingredient_id as any)?.unit || "",
        stock_available: (r.ingredient_id as any)?.stock_quantity || 0,
      })) || [],
    })),
  };

  setCache(cacheKey, result);
  return result;
}

async function exec_get_ingredient_list(args?: Types.IngredientListArgs) {
  const cacheKey = "ingredient_list";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const ingredients = await Ingredient.find().sort({ name: 1 }).lean();

  const result = {
    count: ingredients.length,
    ingredients: ingredients.map((i: any) => ({
      name: i.name,
      unit: i.unit,
      stock_quantity: i.stock_quantity,
      cost_per_unit: i.cost_per_unit,
      cost_per_unit_formatted: formatRp(i.cost_per_unit),
    })),
  };

  setCache(cacheKey, result);
  return result;
}

async function exec_get_category_list(args?: Types.CategoryListArgs) {
  const cacheKey = "category_list";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const categories = await Category.find().sort({ name: 1 }).lean();

  const result = {
    count: categories.length,
    categories: categories.map((c: any) => ({
      name: c.name,
      description: c.description || "",
    })),
  };

  setCache(cacheKey, result);
  return result;
}

async function exec_get_transaction_detail(args: Types.TransactionDetailArgs) {
  const tx = await Transaction.findOne({ receipt_number: args.receipt_number })
    .lean();

  if (!tx) {
    return {
      error: `Transaksi dengan nomor ${args.receipt_number} tidak ditemukan.`,
    };
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
    })),
  };
}

async function exec_get_profit_report(args: Types.ProfitReportArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: "$total_amount" },
        total_gross: { $sum: "$total_real_amount" },
        total_profit: { $sum: "$profit" },
        total_discount: { $sum: "$discount_amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const data = result[0] ||
    {
      total_revenue: 0,
      total_gross: 0,
      total_profit: 0,
      total_discount: 0,
      count: 0,
    };
  const margin = data.total_revenue > 0
    ? (data.total_profit / data.total_revenue * 100)
    : 0;

  // Profit per produk
  const productProfit = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        revenue: { $sum: "$items.total_amount" },
        cost: {
          $sum: { $multiply: ["$items.quantity", "$items.cost_at_sale"] },
        },
        profit: {
          $sum: {
            $subtract: ["$items.total_amount", {
              $multiply: ["$items.quantity", "$items.cost_at_sale"],
            }],
          },
        },
        qty: { $sum: "$items.quantity" },
      },
    },
    { $sort: { profit: -1 } },
    { $limit: 10 },
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
    })),
  };
}

async function exec_get_payment_method_stats(args: Types.PaymentMethodStatsArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: "$payment_method",
        total: { $sum: "$total_amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = result.reduce((sum: number, r: any) => sum + r.total, 0);

  return {
    period: args.period,
    methods: result.map((r: any) => ({
      method: r._id || "unknown",
      total: r.total,
      total_formatted: formatRp(r.total),
      transaction_count: r.count,
      percentage: grandTotal > 0
        ? Math.round(r.total / grandTotal * 1000) / 10
        : 0,
    })),
  };
}

async function exec_get_hourly_sales(args: Types.HourlySalesArgs) {
  const days = validateLimit(args.days, 30, 90);
  const now = new Date();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const startDate = new Date(todayEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate, $lt: todayEnd } } },
    {
      $group: {
        _id: { $hour: { date: "$createdAt", timezone: getGlobalTimezone() } },
        revenue: { $sum: "$total_amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Sortir untuk cari jam tersibuk
  const sorted = [...result].sort((a: any, b: any) => b.count - a.count);
  const peakHours = sorted.slice(0, 3).map((h: any) =>
    `${h._id.toString().padStart(2, "0")}:00`
  );

  return {
    analyzed_days: days,
    peak_hours: peakHours,
    hourly_data: result.map((h: any) => ({
      hour: `${h._id.toString().padStart(2, "0")}:00`,
      revenue: h.revenue,
      revenue_formatted: formatRp(h.revenue),
      transaction_count: h.count,
      avg_per_day: Math.round(h.count / days * 10) / 10,
    })),
  };
}

async function exec_compare_periods(args: Types.ComparePeriodsArgs) {
  validateDateRange(args.current_period, args.current_start_date, args.current_end_date);
  if (args.compare_with === "custom") validateDateRange("custom", args.compare_start_date, args.compare_end_date);
  const currentRange = getDateRange(
    args.current_period || "month",
    args.current_start_date,
    args.current_end_date,
  );

  let compareRange: { start: Date; end: Date };
  if (
    args.compare_with === "custom" && args.compare_start_date &&
    args.compare_end_date
  ) {
    compareRange = getDateRange(
      "custom",
      args.compare_start_date,
      args.compare_end_date,
    );
  } else {
    const spanMs = currentRange.end.getTime() - currentRange.start.getTime();
    if (args.compare_with === "same_period_last_week") {
      compareRange = {
        start: new Date(
          currentRange.start.getTime() - (7 * 24 * 60 * 60 * 1000),
        ),
        end: new Date(currentRange.end.getTime() - (7 * 24 * 60 * 60 * 1000)),
      };
    } else if (args.compare_with === "same_period_last_month") {
      compareRange = {
        start: new Date(
          currentRange.start.getTime() - (30 * 24 * 60 * 60 * 1000),
        ),
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
  const currentValue = Number(
    currentSummary[metric as keyof typeof currentSummary] || 0,
  );
  const compareValue = Number(
    compareSummary[metric as keyof typeof compareSummary] || 0,
  );
  const diff = currentValue - compareValue;
  const percentChange = compareValue === 0
    ? (currentValue > 0 ? 100 : 0)
    : (diff / compareValue) * 100;

  return {
    metric,
    current_period: {
      start_date: currentRange.start.toISOString().split("T")[0],
      end_date:
        new Date(currentRange.end.getTime() - 1).toISOString().split("T")[0],
      ...currentSummary,
    },
    compare_period: {
      start_date: compareRange.start.toISOString().split("T")[0],
      end_date:
        new Date(compareRange.end.getTime() - 1).toISOString().split("T")[0],
      ...compareSummary,
    },
    comparison: {
      current_value: currentValue,
      compare_value: compareValue,
      difference: diff,
      difference_formatted: metric === "transactions"
        ? `${Math.round(diff)}`
        : formatRp(diff),
      percent_change: Math.round(percentChange * 10) / 10,
      trend: diff > 0 ? "naik" : diff < 0 ? "turun" : "stagnan",
    },
  };
}

async function exec_search_transactions(args: Types.SearchTransactionsArgs) {
  const query: any = {};
  const limit = validateLimit(args.limit, 20, 50);

  if (args.start_date || args.end_date) {
    const start = args.start_date
      ? new Date(args.start_date)
      : new Date("1970-01-01");
    const end = args.end_date ? new Date(args.end_date) : new Date();
    end.setDate(end.getDate() + 1);
    query.createdAt = { $gte: start, $lt: end };
  }
  if (args.payment_method) query.payment_method = args.payment_method;
  if (args.customer_name) {
    query.customer_name = { $regex: args.customer_name, $options: "i" };
  }
  if (args.min_amount !== undefined || args.max_amount !== undefined) {
    query.total_amount = {};
    if (args.min_amount !== undefined) {
      query.total_amount.$gte = Number(args.min_amount);
    }
    if (args.max_amount !== undefined) {
      query.total_amount.$lte = Number(args.max_amount);
    }
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

async function exec_get_customer_stats(args: Types.CustomerStatsArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );
  const limit = validateLimit(args.limit, 10, 20);

  const stats = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $ifNull: ["$customer_name", "Pelanggan Umum"] },
        transaction_count: { $sum: 1 },
        total_spending: { $sum: "$total_amount" },
        total_profit: { $sum: "$profit" },
      },
    },
    {
      $sort: args.sort_by === "frequency"
        ? { transaction_count: -1 }
        : { total_spending: -1 },
    },
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

async function exec_get_discount_analysis(args: Types.DiscountAnalysisArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );
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
              $cond: [{ $gt: ["$discount_amount", 0] }, 1, 0],
            },
          },
          total_discount: { $sum: "$discount_amount" },
          total_revenue: { $sum: "$total_amount" },
          total_gross: { $sum: "$total_real_amount" },
          total_profit: { $sum: "$profit" },
        },
      },
    ]),
    Transaction.find({
      createdAt: { $gte: start, $lt: end },
      discount_amount: { $gt: 0 },
    })
      .sort({ discount_amount: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const summary = summaryRows[0] || {
    transaction_count: 0,
    discounted_transactions: 0,
    total_discount: 0,
    total_revenue: 0,
    total_gross: 0,
    total_profit: 0,
  };

  const discountRate = summary.total_gross > 0
    ? (summary.total_discount / summary.total_gross) * 100
    : 0;
  const discountCoverage = summary.transaction_count > 0
    ? (summary.discounted_transactions / summary.transaction_count) * 100
    : 0;

  return {
    period: args.period,
    summary: {
      transaction_count: summary.transaction_count,
      discounted_transactions: summary.discounted_transactions,
      discounted_transaction_rate_percent: Math.round(discountCoverage * 10) /
        10,
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

async function exec_get_market_basket_analysis(args: Types.MarketBasketAnalysisArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );
  const target = args.target_product;
  const limit = Math.min(Number(args.limit || 10), 20);

  const result = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lt: end },
        "items.name": { $regex: new RegExp(target, "i") },
        status: "completed",
      },
    },
    { $unwind: "$items" },
    { $match: { "items.name": { $not: { $regex: new RegExp(target, "i") } } } },
    {
      $group: {
        _id: "$items.name",
        frequency: { $sum: 1 },
        total_quantity: { $sum: "$items.quantity" },
        total_revenue: { $sum: "$items.total_amount" },
      },
    },
    { $sort: { frequency: -1 } },
    { $limit: limit },
  ]);

  return {
    target_product: target,
    period: args.period,
    analysis: result.map((r: any) => ({
      product_name: r._id,
      bought_together_count: r.frequency,
      total_quantity_sold_together: r.total_quantity,
      revenue_generated_together: r.total_revenue,
      revenue_generated_together_formatted: formatRp(r.total_revenue),
    })),
  };
}

async function exec_predict_stock_depletion(args: Types.PredictStockDepletionArgs) {
  const daysHistory = validateLimit(args.days_history, 30, 90);
  const now = new Date();
  const startDate = new Date(now.getTime() - daysHistory * 24 * 60 * 60 * 1000);

  let matchQuery: any = { createdAt: { $gte: startDate }, status: "completed" };

  const dailyHistory = await Transaction.aggregate([
    { $match: matchQuery },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product_id",
        foreignField: "_id",
        as: "product_info",
      },
    },
    { $unwind: "$product_info" },
    { $unwind: "$product_info.recipe" },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: getGlobalTimezone() } },
          ingredient_id: "$product_info.recipe.ingredient_id"
        },
        daily_used: {
          $sum: {
            $multiply: [ "$items.quantity", "$product_info.recipe.amount_needed" ]
          }
        }
      }
    },
    { $sort: { "_id.date": 1 } }
  ]);

  // Kelompokkan data per ingredient
  const seriesMap = new Map<string, number[]>();
  dailyHistory.forEach((r: any) => {
    const id = r._id.ingredient_id.toString();
    if (!seriesMap.has(id)) seriesMap.set(id, []);
    seriesMap.get(id)!.push(r.daily_used);
  });

  let ingredientQuery: any = {};
  if (args.ingredient_name) {
    ingredientQuery.name = { $regex: new RegExp(args.ingredient_name, "i") };
  }
  const ingredients = await Ingredient.find(ingredientQuery).lean();

  const ALPHA = 0.3; // Smoothing factor
  const predictions = ingredients.map((ing: any) => {
    const series = seriesMap.get(ing._id.toString()) || [];
    let ema = 0;
    let confidence = "Low";

    if (series.length > 0) {
      ema = series[0];
      for (let i = 1; i < series.length; i++) {
        ema = ALPHA * series[i] + (1 - ALPHA) * ema;
      }
      if (series.length > 10) confidence = "High";
      else if (series.length > 3) confidence = "Medium";
    }

    let daysRemaining = -1;
    let depletionDate = null;

    if (ema > 0 && ing.stock_quantity > 0) {
      daysRemaining = ing.stock_quantity / ema;
      depletionDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else if (ing.stock_quantity <= 0) {
      daysRemaining = 0;
      depletionDate = now.toISOString().split("T")[0];
      confidence = "High"; // Sudah habis, sangat yakin
    }

    return {
      ingredient_name: ing.name,
      current_stock: ing.stock_quantity,
      unit: ing.unit,
      forecasted_daily_usage: Math.round(ema * 100) / 100,
      days_remaining: daysRemaining === -1 ? "N/A" : Math.round(daysRemaining),
      estimated_depletion_date: depletionDate || "Not enough data/No usage",
      confidence_level: confidence
    };
  });

  return {
    days_analyzed: daysHistory,
    predictions: predictions.sort((a: any, b: any) => {
      if (typeof a.days_remaining === "string") return 1;
      if (typeof b.days_remaining === "string") return -1;
      return a.days_remaining - b.days_remaining;
    }),
  };
}

async function exec_get_churned_customers(args: Types.ChurnedCustomersArgs) {
  const minSpending = Number(args.min_spending || 100000);
  const daysInactive = Number(args.days_inactive || 30);
  const limit = validateLimit(args.limit, 20, 50);

  const result = await Transaction.aggregate([
    {
      $match: { customer_name: { $ne: "Pelanggan Umum" }, status: "completed" },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$customer_name",
        dates: { $push: "$createdAt" },
        last_transaction_date: { $max: "$createdAt" },
        total_spending: { $sum: "$total_amount" },
        transaction_count: { $sum: 1 },
      },
    },
    {
      $match: {
        total_spending: { $gte: minSpending },
      },
    },
    { $sort: { total_spending: -1 } },
  ]);

  const churned = [];
  const nowTime = new Date().getTime();

  for (const c of result) {
    const daysSinceLast = Math.floor((nowTime - new Date(c.last_transaction_date).getTime()) / 86400000);

    if (c.transaction_count < 2) {
      if (daysSinceLast >= daysInactive) {
        churned.push({ ...c, days_since_last: daysSinceLast, avg_cycle: 0, threshold_used: daysInactive });
      }
      continue;
    }

    let totalDiff = 0;
    for (let i = 1; i < c.dates.length; i++) {
      totalDiff += (new Date(c.dates[i]).getTime() - new Date(c.dates[i - 1]).getTime());
    }
    const avgCycleDays = Math.round((totalDiff / (c.dates.length - 1)) / 86400000);
    const thresholdDays = Math.max(daysInactive, Math.round(avgCycleDays * 1.5));

    if (daysSinceLast >= thresholdDays) {
      churned.push({ ...c, days_since_last: daysSinceLast, avg_cycle: avgCycleDays, threshold_used: thresholdDays });
    }
  }

  const finalChurned = churned.slice(0, limit);

  return {
    criteria: {
      min_spending: minSpending,
      base_days_inactive: daysInactive,
      note: "Threshold aktif disesuaikan per pelanggan berdasarkan rata-rata siklus pembelian (avg cycle * 1.5)"
    },
    churned_count: finalChurned.length,
    customers: finalChurned.map((c: any) => ({
      customer_name: c._id,
      last_transaction_date: new Date(c.last_transaction_date).toISOString().split("T")[0],
      days_since_last_transaction: c.days_since_last,
      avg_buying_cycle_days: c.avg_cycle,
      churn_threshold_days: c.threshold_used,
      total_spending: c.total_spending,
      total_spending_formatted: formatRp(c.total_spending),
      transaction_count: c.transaction_count,
    })),
  };
}

async function exec_get_void_refund_stats(args: Types.VoidRefundStatsArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );

  const result = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lt: end },
        status: { $in: ["void", "refund"] },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        total_amount: { $sum: "$total_amount" },
      },
    },
  ]);

  const recentTransactions = await Transaction.find({
    createdAt: { $gte: start, $lt: end },
    status: { $in: ["void", "refund"] },
  }).sort({ createdAt: -1 }).limit(10).lean();

  const summary = result.reduce((acc: any, curr: any) => {
    acc[curr._id] = {
      count: curr.count,
      total_amount: curr.total_amount,
      total_amount_formatted: formatRp(curr.total_amount),
    };
    return acc;
  }, {
    void: { count: 0, total_amount: 0 },
    refund: { count: 0, total_amount: 0 },
  });

  return {
    period: args.period,
    summary,
    recent_transactions: recentTransactions.map((tx: any) => ({
      receipt_number: tx.receipt_number,
      date: tx.createdAt,
      status: tx.status,
      customer: tx.customer_name,
      amount: tx.total_amount,
      amount_formatted: formatRp(tx.total_amount),
    })),
  };
}

async function exec_get_comprehensive_report(args: Types.ComprehensiveReportArgs) {
  const { start, end } = getDateRange(
    args.period || "month",
    args.start_date,
    args.end_date,
  );

  const report = await Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: "completed" } },
    {
      $facet: {
        financial_summary: [
          {
            $group: {
              _id: null,
              total_revenue: { $sum: "$total_amount" },
              total_profit: { $sum: "$profit" },
              total_discount: { $sum: "$discount_amount" },
              transaction_count: { $sum: 1 },
              avg_basket_size: { $avg: "$total_amount" },
            },
          },
        ],
        top_products: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product_id",
              name: { $first: "$items.name" },
              quantity: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.total_amount" },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product_details",
            },
          },
          {
            $project: {
              name: 1,
              quantity: 1,
              revenue: 1,
              base_price: { $arrayElemAt: ["$product_details.price", 0] },
            },
          },
        ],
        payment_distribution: [
          {
            $group: {
              _id: "$payment_method",
              count: { $sum: 1 },
              amount: { $sum: "$total_amount" },
            },
          },
        ],
      },
    },
  ]);

  const data = report[0];
  const summary = data.financial_summary[0] ||
    {
      total_revenue: 0,
      total_profit: 0,
      total_discount: 0,
      transaction_count: 0,
      avg_basket_size: 0,
    };

  return {
    period: args.period,
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
    financial_summary: {
      total_revenue: summary.total_revenue,
      total_revenue_formatted: formatRp(summary.total_revenue),
      total_profit: summary.total_profit,
      total_profit_formatted: formatRp(summary.total_profit),
      total_discount: summary.total_discount,
      transaction_count: summary.transaction_count,
      avg_basket_size: Math.round(summary.avg_basket_size),
      avg_basket_size_formatted: formatRp(summary.avg_basket_size),
    },
    top_products: data.top_products.map((p: any) => ({
      name: p.name,
      quantity_sold: p.quantity,
      revenue: p.revenue,
      revenue_formatted: formatRp(p.revenue),
      current_base_price: p.base_price,
      current_base_price_formatted: p.base_price
        ? formatRp(p.base_price)
        : "N/A",
    })),
    payment_distribution: data.payment_distribution.map((pd: any) => ({
      method: pd._id,
      transaction_count: pd.count,
      total_amount: pd.amount,
      total_amount_formatted: formatRp(pd.amount),
    })),
  };
}

async function exec_get_sales_forecast(args: Types.SalesForecastArgs) {
  const predictDays = validateLimit(args.days_to_predict, 7, 30);
  const historyDays = validateLimit(args.history_days, 30, 90);
  
  const now = new Date();
  const startDate = new Date(now.getTime() - historyDays * 24 * 60 * 60 * 1000);

  const dailyHistory = await Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate }, status: "completed" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: getGlobalTimezone() } },
        revenue: { $sum: "$total_amount" }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  const series = dailyHistory.map((d: any) => d.revenue);
  
  if (series.length < 3) {
    throw new Types.ToolError("Data riwayat terlalu sedikit untuk melakukan prediksi (minimal 3 hari)", 400);
  }

  // Double Exponential Smoothing (Trend)
  const ALPHA = 0.3;
  const BETA = 0.2;
  
  let level = series[0];
  let trend = series[1] - series[0];

  for (let i = 1; i < series.length; i++) {
    const prevLevel = level;
    level = ALPHA * series[i] + (1 - ALPHA) * (level + trend);
    trend = BETA * (level - prevLevel) + (1 - BETA) * trend;
  }

  const forecast = [];
  let totalForecast = 0;
  for (let i = 1; i <= predictDays; i++) {
    let f = level + i * trend;
    if (f < 0) f = 0; // prevent negative revenue
    forecast.push({
      day_from_now: i,
      forecasted_revenue: Math.round(f),
      forecasted_revenue_formatted: formatRp(f)
    });
    totalForecast += f;
  }

  return {
    days_to_predict: predictDays,
    history_days: historyDays,
    total_forecasted_revenue: Math.round(totalForecast),
    total_forecasted_revenue_formatted: formatRp(totalForecast),
    daily_forecast: forecast,
    confidence_level: series.length > 14 ? "High" : "Medium",
    trend_direction: trend > 0 ? "Naik" : "Turun"
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
  get_market_basket_analysis: exec_get_market_basket_analysis,
  predict_stock_depletion: exec_predict_stock_depletion,
  get_churned_customers: exec_get_churned_customers,
  get_void_refund_stats: exec_get_void_refund_stats,
  get_comprehensive_report: exec_get_comprehensive_report,
  get_sales_forecast: exec_get_sales_forecast,
};

/**
 * Eksekusi tool berdasarkan nama dan argumen dari Function Call
 */
export async function executeTool(
  name: string,
  args: Record<string, any> | null,
): Promise<any> {
  const safeArgs = args || {};
  const executor = EXECUTORS[name];
  if (!executor) {
    return { error: `Tool "${name}" tidak dikenali.`, code: 404 };
  }

  const startTime = performance.now();
  try {
    logger.info(`[AI Tool] Executing: ${name}(${JSON.stringify(safeArgs)})`);
    const result = await executor(safeArgs);
    const durationMs = Math.round(performance.now() - startTime);
    logger.info(
      `[AI Tool] ${name} returned ${JSON.stringify(result).length} chars in ${durationMs}ms`,
      { trace: { tool: name, durationMs } }
    );
    return result;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error(`[AI Tool] Error executing ${name} after ${durationMs}ms:`, err);
    
    if (err instanceof Types.ToolError) {
      return { error: err.message, code: err.statusCode };
    }
    return { error: `Gagal mengambil data: ${err.message}`, code: 500 };
  }
}

