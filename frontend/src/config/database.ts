// Database Configuration
// Supabase Backend Integration

import { projectId, publicAnonKey } from '/utils/supabase/info';

// Supabase Configuration
export const SUPABASE_URL = `https://${projectId}.supabase.co`;
export const SUPABASE_ANON_KEY = publicAnonKey;

// API Endpoints - Supabase Edge Function Server
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    signup: `${API_BASE_URL}/api/auth/signup`,
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    getCurrentUser: `${API_BASE_URL}/api/auth/user`,
    getUsers: `${API_BASE_URL}/api/auth/users`,
    createUser: `${API_BASE_URL}/api/auth/users`,
    deleteUser: (id: string) => `${API_BASE_URL}/api/auth/users/${id}`,
  },
  
  // Products
  products: {
    getAll: `${API_BASE_URL}/api/products`,
    getById: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    create: `${API_BASE_URL}/api/products`,
    update: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    bulkUpdate: `${API_BASE_URL}/api/products/bulk-update`,
    importExcel: `${API_BASE_URL}/api/products/import`,
    exportExcel: `${API_BASE_URL}/api/products/export`,
    addStock: (id: string) => `${API_BASE_URL}/api/products/${id}/add-stock`,
    getStockLogs: `${API_BASE_URL}/api/products/stock/logs`,
  },
  
  // Categories
  categories: {
    getAll: `${API_BASE_URL}/api/categories`,
    create: `${API_BASE_URL}/api/categories`,
    update: (id: string) => `${API_BASE_URL}/api/categories/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/categories/${id}`,
  },
  
  // Transactions
  transactions: {
    getAll: `${API_BASE_URL}/api/transactions`,
    getById: (id: string) => `${API_BASE_URL}/api/transactions/${id}`,
    create: `${API_BASE_URL}/api/transactions`,
    getSummary: `${API_BASE_URL}/api/transactions/summary`,
    update: (id: string) => `${API_BASE_URL}/api/transactions/${id}`,
  },
  
  // Customers
  customers: {
    getAll: `${API_BASE_URL}/api/customers`,
    create: `${API_BASE_URL}/api/customers`,
    update: (id: string) => `${API_BASE_URL}/api/customers/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/customers/${id}`,
    importExcel: `${API_BASE_URL}/api/customers/import`,
    exportExcel: `${API_BASE_URL}/api/customers/export`,
  },
  
  // Suppliers
  suppliers: {
    getAll: `${API_BASE_URL}/api/suppliers`,
    create: `${API_BASE_URL}/api/suppliers`,
    update: (id: string) => `${API_BASE_URL}/api/suppliers/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/suppliers/${id}`,
  },
  
  // Discounts
  discounts: {
    getAll: `${API_BASE_URL}/api/discounts`,
    create: `${API_BASE_URL}/api/discounts`,
    update: (id: string) => `${API_BASE_URL}/api/discounts/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/discounts/${id}`,
  },
  
  // Cash Drawer
  cashDrawer: {
    getAll: `${API_BASE_URL}/api/cash-drawer`,
    create: `${API_BASE_URL}/api/cash-drawer`,
    update: (id: string) => `${API_BASE_URL}/api/cash-drawer/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/cash-drawer/${id}`,
  },
  
  // Reports
  reports: {
    sales: `${API_BASE_URL}/api/reports/sales`,
    products: `${API_BASE_URL}/api/reports/products`,
    categories: `${API_BASE_URL}/api/reports/categories`,
    paymentMethods: `${API_BASE_URL}/api/reports/payment-methods`,
    expenses: `${API_BASE_URL}/api/reports/expenses`,
    qris: `${API_BASE_URL}/api/reports/qris`,
  },

  // Tambahkan ini: Laporan Advanced (Analitik)
  analytics: {
    qris: `${API_BASE_URL}/api/analytics/reports/qris`,
    productSales: `${API_BASE_URL}/api/analytics/reports/product-sales`,
    categorySales: `${API_BASE_URL}/api/analytics/reports/category-sales`,
  },
  
  // AI
  ai: {
    chat: `${API_BASE_URL}/api/ai/chat`,
    insights: `${API_BASE_URL}/api/ai/insights`,
    processReceipt: `${API_BASE_URL}/api/ai/process-receipt`,
  },

  // Pending Orders
  pendingOrders: {
    base: `${API_BASE_URL}/api/pending-orders`,
    getById: (id: string) => `${API_BASE_URL}/api/pending-orders/${id}`,
  },

  receipt_settings: {
    base: `${API_BASE_URL}/api/settings/receipt`,
  },

  // Permissions
  permissions: {
    base: `${API_BASE_URL}/api/permissions`,
    update: (role: string) => `${API_BASE_URL}/api/permissions/${role}`,
  },
};

// Add Gemini API Key Configuration
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "your-default-gemini-api-key";
