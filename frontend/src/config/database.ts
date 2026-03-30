// WuzPay Database Configuration
// Customized for Local MongoDB & Hono Backend

// API Base URL - Mengambil dari .env (Localhost:5000)
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    signup: `/api/auth/register`,
    login: `/api/auth/login`,
    logout: `/api/auth/logout`,
    getCurrentUser: `/api/auth/me`,
    getUsers: `/api/auth/users`,
    createUser: `/api/auth/register`,
    deleteUser: (id: string) => `/api/auth/users/${id}`,
  },
  
  // Products
  products: {
    getAll: `/api/products`,
    getById: (id: string) => `/api/products/${id}`,
    create: `/api/products`,
    update: (id: string) => `/api/products/${id}`,
    delete: (id: string) => `/api/products/${id}`,
    addStock: (id: string) => `/api/products/${id}/stock`,
    getStockLogs: `/api/products/stock/logs`,
  },
  
  // Categories
  categories: {
    getAll: `/api/categories`,
    create: `/api/categories`,
    update: (id: string) => `/api/categories/${id}`,
    delete: (id: string) => `/api/categories/${id}`,
  },
  
  // Transactions
  transactions: {
    getAll: `/api/transactions`,
    getById: (id: string) => `/api/transactions/${id}`,
    create: `/api/transactions`,
    getSummary: `/api/transactions/summary`,
  },
  
  // Customers & Suppliers (Entities)
  customers: {
    getAll: `/api/entities/customers`,
    create: `/api/entities/customers`,
    update: (id: string) => `/api/entities/customers/${id}`,
    delete: (id: string) => `/api/entities/customers/${id}`,
  },
  suppliers: {
    getAll: `/api/entities/suppliers`,
    create: `/api/entities/suppliers`,
    update: (id: string) => `/api/entities/suppliers/${id}`,
    delete: (id: string) => `/api/entities/suppliers/${id}`,
  },
  
  // Discounts
  discounts: {
    getAll: `/api/entities/discounts`,
    create: `/api/entities/discounts`,
    update: (id: string) => `/api/entities/discounts/${id}`,
    delete: (id: string) => `/api/entities/discounts/${id}`,
  },
  
  // Cash Drawer
  cashDrawer: {
    getAll: `/api/cash-drawer`,
    create: `/api/cash-drawer`,
    update: (id: string) => `/api/cash-drawer/${id}`,
    delete: (id: string) => `/api/cash-drawer/${id}`,
  },
  
  // AI
  ai: {
    chat: `/api/ai/chat`,
    insights: `/api/ai/insights`,
  },

  // Pending Orders
  pendingOrders: {
    base: `/api/pending-orders`,
    getById: (id: string) => `/api/pending-orders/${id}`,
  },

  // Settings & Receipt
  receipt_settings: {
    base: `/api/receipt-settings`,
  },

  // Permissions
  permissions: {
    base: `/api/permissions`,
    update: (role: string) => `/api/permissions/${role}`,
  },
};

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;