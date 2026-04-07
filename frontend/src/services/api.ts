import { Product, Category, Customer, Supplier, Transaction, Discount, CashDrawer, User } from '@/types';

// Ambil Base URL dari .env atau fallback ke localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ==================== ENDPOINT CONFIGURATION ====================
const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/register',
    getUsers: '/api/auth/users',
    getCurrentUser: '/api/auth/me',
    createUser: '/api/auth/register',
    deleteUser: (id: string) => `/api/auth/users/${id}`,
  },
  products: {
    getAll: '/api/products',
    getById: (id: string) => `/api/products/${id}`,
    create: '/api/products',
    update: (id: string) => `/api/products/${id}`,
    delete: (id: string) => `/api/products/${id}`,
    addStock: (id: string) => `/api/products/${id}/add-stock`,
    bulkAddStock: '/api/products/bulk-add-stock',
    getStockLogs: '/api/products/stock/logs',
    importExcel: '/api/products/import',
    exportExcel: '/api/products/export',
  },
  categories: {
    getAll: '/api/categories',
    create: '/api/categories',
    update: (id: string) => `/api/categories/${id}`,
    delete: (id: string) => `/api/categories/${id}`,
  },
  transactions: {
    getAll: '/api/transactions',
    getById: (id: string) => `/api/transactions/${id}`,
    create: '/api/transactions',
    update: (id: string) => `/api/transactions/${id}/items`,
    summary: '/api/transactions/summary',
  },
  entities: {
    customers: {
      base: '/api/entities/customers',
      byId: (id: string) => `/api/entities/customers/${id}`,
    },
    suppliers: {
      base: '/api/entities/suppliers',
      byId: (id: string) => `/api/entities/suppliers/${id}`,
    },
    discounts: {
      base: '/api/entities/discounts',
      byId: (id: string) => `/api/entities/discounts/${id}`,
    }
  },
  analytics: {
    summary: '/api/analytics/reports/summary',
    productSales: '/api/analytics/reports/product-sales',
    categorySales: '/api/analytics/reports/category-sales',
    qris: '/api/analytics/reports/qris',
  },
  cashDrawer: {
    base: '/api/cash-drawer',
    byId: (id: string) => `/api/cash-drawer/${id}`,
  },
  pendingOrders: {
    base: '/api/pending-orders',
    byId: (id: string) => `/api/pending-orders/${id}`,
  },
  permissions: {
    base: '/api/permissions',
    update: (role: string) => `/api/permissions/${role}`,
  },
  receipt_settings: {
    base: '/api/receipt-settings'
  },
  ai: {
    chat: '/api/ai/chat',
    insights: '/api/ai/insights',
    processReceipt: '/api/ai/process-receipt',
    scanReceiptOCR: '/api/ai/scan-receipt-ocr',
    scanReceiptVision: '/api/ai/scan-receipt-vision',
  }
};

// ==================== AUTH & SESSION HANDLING ====================
const getAuthToken = (): string | null => localStorage.getItem('auth_token');
const getSessionId = (): string | null => localStorage.getItem('session_id');

export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token);
export const setSessionId = (id: string) => localStorage.setItem('session_id', id);

export const clearAuthSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('session_id');
  localStorage.removeItem('user_data');
};

// ==================== CORE REQUEST HANDLER ====================
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const sessionId = getSessionId();

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && token !== "undefined" && token !== "null") {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (sessionId && sessionId !== "null" && sessionId !== "undefined") {
    headers['X-Session-ID'] = sessionId;
  }

  // URL Handling: Pastikan domain bersih
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = url.replace(/^\//, '');
  const finalUrl = url.startsWith('http') ? url : `${base}/${path}`;

  const response = await fetch(finalUrl, { ...options, headers });

  if (!response.ok) {
    // Jika 401 (Unauthorized), user harus login ulang (Mongo Auth)
    if (response.status === 401 || response.status === 403) {
      clearAuthSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error("Sesi Berakhir");
    }

    const errorData = await response.json().catch(() => ({ error: 'Server Error' }));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ==================== AUTH API ====================
export const authAPI = {
  signup: async (email: string, password: string, name: string, role: string): Promise<User> => {
    const data = await apiRequest<{ user: User }>(API_ENDPOINTS.auth.signup, {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    return data.user;
  },

  login: async (email: string, password: string): Promise<{ user: User; access_token: string; session_id: string }> => {
    const data = await apiRequest<{ user: User; access_token: string; session_id: string }>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) setAuthToken(data.access_token);
    if (data.session_id) setSessionId(data.session_id);
    if (data.user) localStorage.setItem('user_data', JSON.stringify(data.user));

    return data;
  },

  getCachedUser: (): User | null => {
    const saved = localStorage.getItem('user_data');
    if (!saved || saved === "undefined") return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  },

  getCurrentUser: async () => {
    const data = await apiRequest<{ user: User }>(API_ENDPOINTS.auth.getCurrentUser);
    if (data.user) localStorage.setItem('user_data', JSON.stringify(data.user));
    return data.user;
  },

  getUsers: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.auth.getUsers);
    const raw = Array.isArray(response) ? response : (response.users || response.data || []);
    return raw.map((u: any) => ({ ...u, id: u._id }));
  },

  createUser: async (payload: { name: string; email: string; password: string; role: string }) => {
    const response: any = await apiRequest(API_ENDPOINTS.auth.createUser, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.user || response;
  },

  deleteUser: async (id: string) => {
    return apiRequest(API_ENDPOINTS.auth.deleteUser(id), {
      method: 'DELETE',
    });
  },

  logout: () => {
    clearAuthSession();
    window.location.href = '/login';
  },
};

// ==================== PRODUCTS API ====================
export const productsAPI = {
  getAll: async (): Promise<Product[]> => {
    const response: any = await apiRequest(API_ENDPOINTS.products.getAll);
    const rawProducts = Array.isArray(response) ? response : (response.products || response.data || []);

    return rawProducts.map((p: any) => ({
      ...p,
      id: p._id,
      stock: p.stock_quantity,
      categoryName: p.category_id?.name || 'Umum'
    }));
  },

  getById: async (id: string) => apiRequest<{ product: any }>(API_ENDPOINTS.products.getById(id)),

  create: async (p: any) => apiRequest(API_ENDPOINTS.products.create, {
    method: 'POST',
    body: JSON.stringify({ ...p, stock_quantity: p.stock_quantity || p.stock }),
  }),

  update: async (id: string, p: any) => apiRequest(API_ENDPOINTS.products.update(id), {
    method: 'PUT',
    body: JSON.stringify({ ...p, stock_quantity: p.stock_quantity ?? p.stock }),
  }),

  delete: async (id: string) => apiRequest(API_ENDPOINTS.products.delete(id), { method: 'DELETE' }),

  addStock: async (id: string, amount: number) => {
    return apiRequest(API_ENDPOINTS.products.addStock(id), {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  getStockLogs: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.products.getStockLogs);
    return Array.isArray(response) ? response : (response.logs || response.data || []);
  },

  bulkAddStock: async (items: any[]) => {
    return apiRequest<any>(API_ENDPOINTS.products.bulkAddStock, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  import: async (formData: FormData) => {
    return apiRequest<any>(API_ENDPOINTS.products.importExcel, {
      method: 'POST',
      body: formData,
    });
  },

  export: () => {
    const base = API_BASE_URL.replace(/\/$/, '');
    window.open(`${base}${API_ENDPOINTS.products.exportExcel}`, '_blank');
  },
};

// ==================== CATEGORIES API ====================
export const categoriesAPI = {
  getAll: async (): Promise<Category[]> => {
    const response: any = await apiRequest(API_ENDPOINTS.categories.getAll);
    const raw = Array.isArray(response) ? response : (response.categories || response.data || []);
    return raw.map((c: any) => ({ ...c, id: c._id }));
  },

  create: async (category: any) => apiRequest(API_ENDPOINTS.categories.create, {
    method: 'POST', body: JSON.stringify(category)
  }),

  update: async (id: string, category: any) => apiRequest(API_ENDPOINTS.categories.update(id), {
    method: 'PUT', body: JSON.stringify(category)
  }),

  delete: async (id: string) => apiRequest(API_ENDPOINTS.categories.delete(id), {
    method: 'DELETE'
  }),
};

// ==================== TRANSACTIONS API ====================
export const transactionsAPI = {
  getAll: async (filters?: { startDate?: any; endDate?: any }) => {
    let url = API_ENDPOINTS.transactions.getAll;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', typeof filters.startDate === 'string' ? filters.startDate : filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', typeof filters.endDate === 'string' ? filters.endDate : filters.endDate.toISOString());

    const query = params.toString();
    if (query) url += `?${query}`;

    const response: any = await apiRequest(url);
    const raw = Array.isArray(response) ? response : (response.transactions || response.data || []);
    return raw.map((t: any) => ({ ...t, id: t._id, total: t.total_amount }));
  },

  getById: async (id: string) => apiRequest<any>(API_ENDPOINTS.transactions.getById(id)),

  create: async (tx: any) => apiRequest(API_ENDPOINTS.transactions.create, {
    method: 'POST',
    body: JSON.stringify({
      ...tx,
      total_amount: tx.total_amount || tx.total,
      payment_method: tx.payment_method || tx.paymentMethod,
      items: tx.items.map((i: any) => ({
        product_id: String(i.product_id || i.id).trim(),
        quantity: i.quantity,
        price_at_sale: i.price_at_sale || i.price,
        cost_at_sale: i.cost_at_sale || i.cost || 0
      }))
    }),
  }),

  updateItems: async (id: string, payload: any) => apiRequest(API_ENDPOINTS.transactions.update(id), {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),

  getSummary: async (start: string, end: string) => {
    const s = start.includes('T') ? start : `${start}T00:00:00.000Z`;
    const e = end.includes('T') ? end : `${end}T23:59:59.999Z`;
    return apiRequest(`${API_ENDPOINTS.transactions.summary}?startDate=${s}&endDate=${e}`);
  },
};

// ==================== ENTITIES (CUSTOMERS/SUPPLIERS/DISCOUNTS) ====================
export const customersAPI = {
  getAll: async () => {
    const res: any = await apiRequest(API_ENDPOINTS.entities.customers.base);
    const data = Array.isArray(res) ? res : (res.customers || res.data || []);
    return data.map((c: any) => ({ ...c, id: c._id }));
  },
  create: async (c: any) => apiRequest(API_ENDPOINTS.entities.customers.base, { method: 'POST', body: JSON.stringify(c) }),
  update: async (id: string, c: any) => apiRequest(API_ENDPOINTS.entities.customers.byId(id), { method: 'PUT', body: JSON.stringify(c) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.entities.customers.byId(id), { method: 'DELETE' }),
};

export const suppliersAPI = {
  getAll: async () => {
    const res: any = await apiRequest(API_ENDPOINTS.entities.suppliers.base);
    const data = Array.isArray(res) ? res : (res.suppliers || res.data || []);
    return data.map((s: any) => ({ ...s, id: s._id }));
  },
  create: async (s: any) => apiRequest(API_ENDPOINTS.entities.suppliers.base, { method: 'POST', body: JSON.stringify(s) }),
  update: async (id: string, s: any) => apiRequest(API_ENDPOINTS.entities.suppliers.byId(id), { method: 'PUT', body: JSON.stringify(s) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.entities.suppliers.byId(id), { method: 'DELETE' }),
};

export const discountsAPI = {
  getAll: async () => {
    const res: any = await apiRequest(API_ENDPOINTS.entities.discounts.base);
    const data = Array.isArray(res) ? res : (res.discounts || res.data || []);
    return data.map((d: any) => ({ ...d, id: d._id }));
  },
  create: async (d: any) => apiRequest(API_ENDPOINTS.entities.discounts.base, { method: 'POST', body: JSON.stringify(d) }),
  update: async (id: string, d: any) => apiRequest(API_ENDPOINTS.entities.discounts.byId(id), { method: 'PUT', body: JSON.stringify(d) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.entities.discounts.byId(id), { method: 'DELETE' }),
};

// ==================== REPORTS & ANALYTICS API ====================
export const reportsAPI = {
  getProductSales: async (start: Date | string, end: Date | string) => {
    const s = typeof start === 'string' ? new Date(start).toISOString() : start.toISOString();
    const e = typeof end === 'string' ? new Date(end).toISOString() : end.toISOString();
    return apiRequest(`${API_ENDPOINTS.analytics.productSales}?startDate=${s}&endDate=${e}`);
  },

  getCategorySales: async (start: Date | string, end: Date | string) => {
    // PROTEKSI: Cek tipe data, kalau string konversi dulu mang!
    const s = typeof start === 'string' ? new Date(start).toISOString() : start.toISOString();
    const e = typeof end === 'string' ? new Date(end).toISOString() : end.toISOString();
    return apiRequest(`${API_ENDPOINTS.analytics.categorySales}?startDate=${s}&endDate=${e}`);
  },

  getQrisReports: async (start: Date | string, end: Date | string, limit: number = 20) => {
    const s = typeof start === 'string' ? new Date(start).toISOString() : start.toISOString();
    const e = typeof end === 'string' ? new Date(end).toISOString() : end.toISOString();
    return apiRequest(`${API_ENDPOINTS.analytics.qris}?startDate=${s}&endDate=${e}&limit=${limit}`);
  },

  getSummary: async (start: Date | string, end: Date | string) => {
    const s = typeof start === 'string' ? new Date(start).toISOString() : start.toISOString();
    const e = typeof end === 'string' ? new Date(end).toISOString() : end.toISOString();
    const res: any = await apiRequest(`${API_ENDPOINTS.analytics.summary}?startDate=${s}&endDate=${e}`);
    return res.data || res || { totalProfit: 0, totalRevenue: 0, totalGrossRevenue: 0, totalDiscount: 0 };
  }
};

// ==================== CASH DRAWER API ====================
export const cashDrawerAPI = {
  getAll: async () => {
    const res: any = await apiRequest(API_ENDPOINTS.cashDrawer.base);
    const data = Array.isArray(res) ? res : (res.cashDrawers || res.data || []);
    return data.map((d: any) => ({ ...d, id: d._id }));
  },
  create: async (d: any) => apiRequest(API_ENDPOINTS.cashDrawer.base, { method: 'POST', body: JSON.stringify(d) }),
  update: async (id: string, d: any) => apiRequest(API_ENDPOINTS.cashDrawer.byId(id), { method: 'PUT', body: JSON.stringify(d) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.cashDrawer.byId(id), { method: 'DELETE' }),
};

// ==================== PENDING ORDERS API ====================
export const pendingOrdersAPI = {
  getAll: async () => {
    const res: any = await apiRequest(API_ENDPOINTS.pendingOrders.base);
    const data = Array.isArray(res) ? res : (res.pendingOrders || res.data || []);
    return data.map((o: any) => ({ ...o, id: o._id }));
  },
  save: (data: any) => apiRequest(API_ENDPOINTS.pendingOrders.base, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest(API_ENDPOINTS.pendingOrders.byId(id), { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(API_ENDPOINTS.pendingOrders.byId(id), { method: 'DELETE' }),
};

// ==================== AI & SETTINGS ====================
export const aiAPI = {
  chat: async (prompt: string, history: any[]) => {
    const res = await apiRequest<{ response: string }>(API_ENDPOINTS.ai.chat, {
      method: 'POST', body: JSON.stringify({ prompt, history })
    });
    return res.response;
  },
  getInsights: async () => apiRequest(API_ENDPOINTS.ai.insights),
  processReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest(API_ENDPOINTS.ai.processReceipt, { method: 'POST', body: formData });
  },
  scanReceiptOCR: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<any>(API_ENDPOINTS.ai.scanReceiptOCR, { method: 'POST', body: formData });
  },
  scanReceiptVision: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<any>(API_ENDPOINTS.ai.scanReceiptVision, { method: 'POST', body: formData });
  },
};

export const settingsAPI = {
  getReceiptSettings: async () => {
    try {
      const res: any = await apiRequest(API_ENDPOINTS.receipt_settings.base);
      const data = Array.isArray(res) ? res[0] : res;
      return {
        store_name: data?.store_name || 'WUZPAY SINDANGSARI',
        address: data?.address || 'Jl. Sindangsari No. 01',
        footer_text: data?.footer_text || 'Terima Kasih!',
        logo_url: data?.logo_url || null,
        show_logo: data?.show_logo ?? false,
        paper_size: data?.paper_size || '58mm',
        auto_print: data?.auto_print ?? true,
        max_chars: data?.max_chars || 32,
        font_family: data?.font_family || 'monospace',
        font_size: data?.font_size || 10,
        margin_h: data?.margin_h || 0,
        margin_b: data?.margin_b || 20
      };
    } catch (e) {
      return { store_name: 'WUZPAY SINDANGSARI', paper_size: '58mm' };
    }
  },
  updateReceiptSettings: async (config: any) => apiRequest(API_ENDPOINTS.receipt_settings.base, {
    method: 'PUT', body: JSON.stringify(config)
  }),
};

export const permissionsAPI = {
  getAll: () => apiRequest(API_ENDPOINTS.permissions.base),
  update: (role: string, menus: string[]) => apiRequest(API_ENDPOINTS.permissions.update(role), {
    method: 'PUT', body: JSON.stringify({ allowed_menus: menus })
  }),
};

// INGREDIENT
export const ingredientsAPI = {
  getAll: async () => {
    const res = await fetch(`${API_BASE_URL}/api/ingredients`);
    if (!res.ok) throw new Error('Gagal fetch ingredients');
    return (await res.json()).data;
  },
  addStock: async (id: string, amount: number) => {
    const res = await fetch(`${API_BASE_URL}/api/ingredients/${id}/add-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    if (!res.ok) throw new Error('Gagal update stok ingredient');
    return await res.json();
  },
  saveOCR: async (items: any[]) => {
    const res = await fetch(`${API_BASE_URL}/api/ingredients/ocr-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('Gagal simpan hasil OCR');
    return await res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/ingredients/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Gagal menghapus bahan baku');
    return await res.json();
  }
};