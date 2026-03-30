// Type definitions untuk POS System - Seblak Mledak v2 (Database Synced) FULL VERSION

export type UserRole = 'kasir' | 'admin' | 'manager' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  image_url?: string; 
  category_id?: string; 
  cost: number; 
  price: number; 
  stock_quantity: number; 
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_info?: string; 
  created_at?: string;
}

export interface Discount {
  id: string;
  name: string;
  description?: string;
  value_type: 'percentage' | 'fixed'; 
  value: number; 
  scope: 'item' | 'transaction' | 'category';
  start_date?: string; 
  end_date?: string;
  is_active: boolean; 
  created_at?: string;
}

export interface CartItem {
  id: string; 
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export type OrderType = 'dine-in' | 'takeaway';
export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface Transaction {
  id: string;
  user_id?: string;
  customer_id?: string;
  total_amount: number; 
  payment_method: PaymentMethod;
  status: string;
  created_at: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number; 
}

export interface CashDrawer {
  id: string;
  user_id?: string;
  start_time?: string;
  end_time?: string;
  starting_cash: number;
  ending_cash?: number;
  status?: string;
}

// ==================== EXPENSES & QRIS (RE-ADDED) ====================

export interface Expense {
  id: string;
  date: string | Date;
  category: string;
  description: string;
  amount: number;
  supplier?: string;
  receiptImage?: string;
  createdBy: string;
}

export interface QRISTransaction {
  id: string;
  issuerRef: string;
  date: string | Date;
  type: 'store' | 'dynamic';
  buyerRef: string;
  amount: number;
  mdr: number;
  netAmount: number;
  transactionId?: string;
}

// ==================== DASHBOARD & REPORTS (RE-ADDED) ====================

export interface DashboardMetrics {
  totalSales: number;
  totalTransactions: number;
  totalProfit: number;
  avgTransaction: number;
}

export interface SalesReport {
  date: string;
  transactions: number;
  revenue: number; // total_amount di dashboard
  profit: number;
  avgTransaction: number;
}

export interface ProductSalesReport {
  product: Product;
  quantitySold: number;
  revenue: number;
  profit: number;
  percentage: number;
}

// ==================== AI ====================

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'trend';
  title: string;
  description: string;
  date: string;
  action?: string;
}