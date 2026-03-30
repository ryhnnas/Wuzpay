export type UserRole = 'kasir' | 'admin' | 'manager' | 'owner';

export interface User {
  id: string;      // ID untuk UI
  _id?: string;    // ID asli MongoDB
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  password?: string; // Hanya digunakan saat create/update
}

export interface Category {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  _id?: string;
  sku: string;
  name: string;
  description?: string;
  image_url?: string; 
  category_id?: any;  // Kita pakai any karena MongoDB mengirimkan Objek Kategori lengkap (Populate)
  cost: number; 
  price: number; 
  stock_quantity: number; 
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  office_address?: string;
  contact_info?: string; 
  created_at?: string;
}

export interface Discount {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  value_type: 'percentage' | 'fixed'; 
  value: number; 
  scope: 'global' | 'category' | 'product';
  product_id?: string;
  category_id?: string;
  start_date?: string; 
  end_date?: string;
  is_active: boolean; 
  created_at?: string;
}

export interface CartItem {
  id: string; // Ini biasanya memegang ID Produk
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
  cost_at_sale?: number; // Penting untuk hitung profit nanti
}

export type OrderType = 'dine-in' | 'takeaway';
export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type OrderStatus = 'open' | 'closed' | 'cancelled';

export interface Transaction {
  id: string;
  _id?: string;
  user_id?: any;     // Populated User Object
  customer_id?: any; // Populated Customer Object atau String Name
  customer_name?: string;
  total_amount: number; 
  subtotal: number;
  discount_amount: number;
  discount_name?: string;
  payment_method: PaymentMethod;
  paid_amount: number;
  change_amount: number;
  status: string;
  created_at: string;
  items: TransactionItem[];
}

export interface TransactionItem {
  _id?: string;
  product_id: any;    // Bisa string ID atau Populated Product
  name: string;       // Nama produk saat transaksi (snapshot)
  quantity: number;
  price_at_sale: number; 
  cost_at_sale: number;
  total_amount: number;
}

export interface CashDrawer {
  id: string;
  _id?: string;
  user_id?: any;
  staffname: string;
  start_time: string;
  end_time?: string;
  starting_cash: number;
  ending_cash?: number;
  status: 'open' | 'closed';
  notes?: string;
}

// ==================== RECEIPT & SETTINGS ====================

export interface ReceiptSettings {
  id?: string;
  _id?: string;
  store_name: string;
  address: string;
  footer_text: string;
  logo_url?: string;
  show_logo: boolean;
  paper_size: '58mm' | '80mm';
  auto_print: boolean;
  max_chars: number;
  font_family: string;
  font_size: number;
  margin_h: number;
  margin_b: number;
}

// ==================== PENDING ORDER ====================

export interface PendingOrder {
  id: string;
  _id?: string;
  customer_name: string;
  items: any[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  createdAt?: string;
}

// ==================== AI & ANALYTICS ====================

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
  action?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalTransactions: number;
  totalProfit: number;
  totalDiscount: number;
}