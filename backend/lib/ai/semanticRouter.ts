
import { TOOL_DECLARATIONS } from "./toolDeclarations.ts";

// ==================== SEMANTIC ROUTER ====================
const INVENTORY_TOOLS = ["get_low_stock_ingredients", "predict_stock_depletion", "get_ingredient_list"];
const SALES_TOOLS = ["get_sales_summary", "get_daily_breakdown", "get_hourly_sales", "compare_periods", "get_profit_report", "get_sales_forecast"];
const PRODUCT_TOOLS = ["get_top_products", "get_product_list", "get_category_list", "get_market_basket_analysis"];
const CUSTOMER_TOOLS = ["get_customer_stats", "get_churned_customers"];
const AUDIT_TOOLS = ["get_transaction_detail", "search_transactions", "get_void_refund_stats", "get_discount_analysis", "get_payment_method_stats"];

export function getRelevantTools(userQuery: string): any[] {
  const query = userQuery.toLowerCase();
  const selectedToolNames = new Set<string>();

  if (query.match(/stok|bahan|habis|kritis|inventory|restock/)) {
    INVENTORY_TOOLS.forEach(t => selectedToolNames.add(t));
  }
  if (query.match(/jual|omzet|pendapatan|revenue|laba|profit|hari ini|minggu ini|bulan ini|tren/)) {
    SALES_TOOLS.forEach(t => selectedToolNames.add(t));
  }
  if (query.match(/produk|menu|laris|best seller|kategori|bundling/)) {
    PRODUCT_TOOLS.forEach(t => selectedToolNames.add(t));
  }
  if (query.match(/pelanggan|customer|member|loyal|churn/)) {
    CUSTOMER_TOOLS.forEach(t => selectedToolNames.add(t));
  }
  if (query.match(/struk|nota|transaksi|void|refund|diskon|promo|qris|cash|gopay|transfer|pembayaran/)) {
    AUDIT_TOOLS.forEach(t => selectedToolNames.add(t));
  }

  // Fallback for general reports or unrecognized broad queries
  if (selectedToolNames.size === 0 || query.match(/laporan|report|lengkap|overview|ringkasan/)) {
    selectedToolNames.add("get_comprehensive_report");
    SALES_TOOLS.forEach(t => selectedToolNames.add(t));
  }

  const allTools = (TOOL_DECLARATIONS[0] as any).functionDeclarations;
  return allTools.filter((fn: any) => selectedToolNames.has(fn.name));
}
