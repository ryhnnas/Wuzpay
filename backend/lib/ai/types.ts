export class ToolError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ToolError";
    this.statusCode = statusCode;
  }
}

export type Period = 'today' | 'week' | 'month' | 'custom';

export interface SalesSummaryArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
}

export interface DailyBreakdownArgs {
  days?: number;
}

export interface TopProductsArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
  limit?: number;
  sort_by?: 'revenue' | 'quantity';
  sort_order?: 'desc' | 'asc';
}

export interface LowStockIngredientsArgs {
  threshold?: number;
}

export interface ProductListArgs {
  category?: string;
  search?: string;
}

export interface IngredientListArgs {}

export interface CategoryListArgs {}

export interface TransactionDetailArgs {
  receipt_number: string;
}

export interface ProfitReportArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
}

export interface PaymentMethodStatsArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
}

export interface ComparePeriodsArgs {
  metric: 'revenue' | 'profit' | 'transactions' | 'avg_transaction';
  current_period: Period;
  current_start_date?: string;
  current_end_date?: string;
  compare_with: 'previous_period' | 'same_period_last_week' | 'same_period_last_month' | 'custom';
  compare_start_date?: string;
  compare_end_date?: string;
}

export interface SearchTransactionsArgs {
  start_date?: string;
  end_date?: string;
  payment_method?: 'cash' | 'qris' | 'gopay' | 'transfer';
  customer_name?: string;
  product_name?: string;
  min_amount?: number;
  max_amount?: number;
  limit?: number;
}

export interface CustomerStatsArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
  limit?: number;
  sort_by?: 'spending' | 'frequency';
}

export interface DiscountAnalysisArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface HourlySalesArgs {
  days?: number;
}

export interface MarketBasketAnalysisArgs {
  target_product: string;
  period?: Period;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface PredictStockDepletionArgs {
  days_history?: number;
  ingredient_name?: string;
}

export interface ChurnedCustomersArgs {
  min_spending?: number;
  days_inactive?: number;
  limit?: number;
}

export interface VoidRefundStatsArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
}

export interface ComprehensiveReportArgs {
  period?: Period;
  start_date?: string;
  end_date?: string;
}

export interface SalesForecastArgs {
  days_to_predict?: number;
  history_days?: number;
}
