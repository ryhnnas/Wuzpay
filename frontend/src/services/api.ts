import { API_ENDPOINTS, SUPABASE_ANON_KEY } from '@/config/database';
import {
  Product, Category, Customer, Supplier, Transaction, Discount, CashDrawer, User,
} from '@/types';
import { API_BASE_URL } from '../config/database';
import { supabase } from '../services/supabaseClient';

// ==================== AUTH & SESSION HANDLING ====================
const getAuthToken = (): string | null => localStorage.getItem('auth_token');
const getSessionId = (): string | null => localStorage.getItem('session_id');

export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token);
export const setSessionId = (id: string) => localStorage.setItem('session_id', id);

export const clearAuthSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('session_id');
};

// ==================== CORE REQUEST HANDLER ====================
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const sessionId = getSessionId();
  
  const headers: HeadersInit = {
    'apiKey': SUPABASE_ANON_KEY,
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

  // 1. Bersihkan domain (hapus "/" di akhir kalau ada)
  const base = API_BASE_URL.replace(/\/$/, ''); 

  // 2. Bersihkan path (hapus "/" di awal kalau ada)
  const path = url.replace(/^\//, ''); 

  // 3. Gabungkan jadi alamat lengkap ke Azure
  const finalUrl = url.startsWith('http') ? url : `${base}/${path}`;

  // 4. Panggil fetch pakai finalUrl yang sudah "pintar"
  const response = await fetch(finalUrl, { ...options, headers });

  if (!response.ok) {
    // BAGIAN DALAM IF 401/403 (Versi Bersih)
    if (response.status === 401 || response.status === 403) {
      console.warn("Sesi expired, mencoba refresh...");

      try {
        // Mintalah session baru ke Supabase
        const { data, error } = await supabase.auth.refreshSession();
        
        if (data?.session && !error) {
          const newToken = data.session.access_token;
          
          // Simpan ke local storage biar request berikutnya gak expired lagi
          setAuthToken(newToken); 

          const retryResponse = await fetch(finalUrl, { ...options, headers: newHeaders });
          
          if (retryResponse.ok) {
            console.log("Retry berhasil dengan token baru!");
            return retryResponse.json();
          }
        }
      } catch (e) {
        console.error("Refresh session gagal total:", e);
      }

      // Jika benar-benar gagal (misal: user sudah logout dari device lain)
      console.error("Sesi benar-benar habis. Silakan login kembali.");
      clearAuthSession();
      window.location.href = '/login';
      return; // Hentikan eksekusi
    }

    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ==================== AUTH ====================
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
    
    // SIMPAN SEMUA KE LOCALSTORAGE BIAR AWET
    if (data.access_token) setAuthToken(data.access_token);
    if (data.session_id) setSessionId(data.session_id);
    if (data.user) {
      localStorage.setItem('user_data', JSON.stringify(data.user));
    }
    
    return data;
  },

  // Fungsi baru untuk ambil data user yang tersimpan tanpa ngetik email lagi
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
    // Update data di storage kalau ada perubahan di server
    if (data.user) {
      localStorage.setItem('user_data', JSON.stringify(data.user));
    }
    return data.user;
  },

  getUsers: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.auth.getUsers);
    return Array.isArray(response) ? response : (response.users || response.data || []);
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
    localStorage.removeItem('user_data');
    // Tambahkan redirect manual jika perlu agar aplikasi bersih
    window.location.href = '/'; 
  },
};

// ==================== PRODUCTS ====================
export const productsAPI = {
  getAll: async (): Promise<Product[]> => {
    const response: any = await apiRequest(API_ENDPOINTS.products.getAll);
    // FIX: Unwrapping data yang lebih aman
    const rawProducts = Array.isArray(response) ? response : (response.products || response.data || []);

    return rawProducts.map((p: any) => ({
      ...p,
      stock: p.stock_quantity,
      categoryName: p.categories?.name || 'Umum'
    }));
  },

  addStock: async (id: string, amount: number) => {
    return apiRequest(API_ENDPOINTS.products.addStock(id), {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  getStockLogs: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.products.getStockLogs);
    // FIX: Unwrapping data logs
    return Array.isArray(response) ? response : (response.logs || response.data || []);
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

  import: async (formData: FormData) => {
    return apiRequest<any>(API_ENDPOINTS.products.importExcel, {
      method: 'POST',
      body: formData,
    });
  },

  export: () => {
    const url = API_ENDPOINTS.products.exportExcel;
    window.open(url, '_blank');
  },
};

// ==================== CATEGORIES ====================
export const categoriesAPI = {
  // FIX: Unwrapping data categories
  getAll: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.categories.getAll);
    return Array.isArray(response) ? response : (response.categories || response.data || []);
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

// ==================== TRANSACTIONS ====================
export const transactionsAPI = {
  getAll: async (filters?: { startDate?: any; endDate?: any }) => {
    let url = API_ENDPOINTS.transactions.getAll;
    
    if (filters?.startDate && filters?.endDate) {
      // KALAU SUDAH STRING, LANGSUNG TEMPEL AJA MANG!
      // Gak perlu di-new Date() lagi biar jamnya gak lari-lari
      const sStr = typeof filters.startDate === 'string' 
        ? filters.startDate 
        : filters.startDate.toISOString();
        
      const eStr = typeof filters.endDate === 'string' 
        ? filters.endDate 
        : filters.endDate.toISOString();

      url += `?startDate=${sStr}&endDate=${eStr}`;
    }
    
    const response: any = await apiRequest(url);
    const rawTransactions = Array.isArray(response) ? response : (response.transactions || response.data || []);
    return rawTransactions.map((t: any) => ({ ...t, total: t.total_amount }));
  },

  getById: async (id: string) => {
    // Kita panggil endpoint detail. 
    // Pastikan di API_ENDPOINTS sudah ada konfigurasi buat getById
    return apiRequest<any>(API_ENDPOINTS.transactions.getById(id));
  },

  updateItems: async (transactionId: string, data: any[]) => {
    return apiRequest(API_ENDPOINTS.transactions.update(transactionId), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  getSummary: async (startDate: string, endDate: string) => {
    const s = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`;
    const e = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;

    // Hilangkan tanda '/' di awal kalau apiRequest sudah punya base URL
    const url = `api/analytics/reports/summary?startDate=${s}&endDate=${e}`;
    
    const response: any = await apiRequest(url);
    return response; 
  },
  
  create: async (tx: any) => apiRequest(API_ENDPOINTS.transactions.create, {
    method: 'POST',
    body: JSON.stringify({
      // 1. DATA TOTAL & PEMBAYARAN
      total_amount: tx.total_amount || tx.total,
      subtotal: tx.subtotal,                      
      payment_method: tx.payment_method || tx.paymentMethod,
      paid_amount: tx.paid_amount,
      change_amount: tx.change_amount,

      // 2. DATA DISKON & PELANGGAN (KUNCI UTAMA)
      discount_amount: tx.discount_amount || 0,   
      discount_name: tx.discount_name || '',      
      customer_name: tx.customer_name || 'Pelanggan Umum', 

      // 3. DATA ITEM
      items: tx.items.map((i: any) => ({ 
        product_id: String(i.product_id || i.id).trim(),
        quantity: i.quantity, 
        price_at_sale: i.price_at_sale || i.price
      }))
    }),
  }),
};

// ==================== REPORTS & ANALYTICS ====================
export const reportsAPI = {
  getSales: async (start: Date, end: Date) => {
    const response: any = await apiRequest(`${API_ENDPOINTS.reports.sales}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
    return Array.isArray(response) ? response : (response.report || response.data || []);
  },
  
  getProducts: async (start: Date, end: Date) => {
    const response: any = await apiRequest(`${API_ENDPOINTS.reports.products}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
    return Array.isArray(response) ? response : (response.report || response.data || []);
  },

  getQrisReports: async (start: Date, end: Date, limit: number = 10) => {
    const url = `${API_ENDPOINTS.analytics.qris}?startDate=${start.toISOString()}&endDate=${end.toISOString()}&limit=${limit}`;
    return await apiRequest(url);
  },
    
  getProductSales: async (start: Date, end: Date) => {
    const url = `${API_ENDPOINTS.analytics.productSales}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
    return await apiRequest(url);
  },

  // Di services/api.ts
  getSummary: async (start: Date, end: Date) => {
    // Tambahkan /analytics sebelum /reports
    const url = `api/analytics/reports/summary?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
    
    const response: any = await apiRequest(url);
    return response.data || response || { totalProfit: 0, totalRevenue: 0, totalGrossRevenue: 0, totalDiscount: 0 }; 
  },

  getCategorySales: async (start: Date, end: Date) => {
    const url = `${API_ENDPOINTS.analytics.categorySales}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
    return await apiRequest(url);
  }
};

// ==================== ENTITIES ====================
export const customersAPI = {
  getAll: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.customers.getAll);
    return Array.isArray(response) ? response : (response.customers || response.data || []);
  },
  create: async (c: any) => apiRequest(API_ENDPOINTS.customers.create, { method: 'POST', body: JSON.stringify(c) }),
  update: async (id: string, c: any) => apiRequest(API_ENDPOINTS.customers.update(id), { method: 'PUT', body: JSON.stringify(c) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.customers.delete(id), { method: 'DELETE' }),
};

export const suppliersAPI = {
  getAll: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.suppliers.getAll);
    return Array.isArray(response) ? response : (response.suppliers || response.data || []);
  },
  create: async (s: any) => apiRequest(API_ENDPOINTS.suppliers.create, { method: 'POST', body: JSON.stringify(s) }),
  update: async (id: string, s: any) => apiRequest(API_ENDPOINTS.suppliers.update(id), { method: 'PUT', body: JSON.stringify(s) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.suppliers.delete(id), { method: 'DELETE' }),
};

export const discountsAPI = {
  getAll: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.discounts.getAll);
    return Array.isArray(response) ? response : (response.discounts || response.data || []);
  },
  create: async (d: any) => apiRequest(API_ENDPOINTS.discounts.create, { method: 'POST', body: JSON.stringify(d) }),
  update: async (id: string, d: any) => apiRequest(API_ENDPOINTS.discounts.update(id), { method: 'PUT', body: JSON.stringify(d) }),
  delete: async (id: string) => apiRequest(API_ENDPOINTS.discounts.delete(id), { method: 'DELETE' }),
};

// ==================== CASH DRAWER ====================
export const cashDrawerAPI = {
  getAll: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.cashDrawer.getAll);
    return Array.isArray(response) ? response : (response.cashDrawers || response.data || []);
  },
  create: async (drawer: any) => {
    return apiRequest(API_ENDPOINTS.cashDrawer.create, { method: 'POST', body: JSON.stringify(drawer) });
  },
  update: async (id: string, drawer: any) => {
    return apiRequest(API_ENDPOINTS.cashDrawer.update(id), { method: 'PUT', body: JSON.stringify(drawer) });
  },
  delete: async (id: string) => {
    return apiRequest(API_ENDPOINTS.cashDrawer.delete(id), { method: 'DELETE' });
  },
};

// ==================== AI ====================
export const aiAPI = {
  chat: async (message: string, history: any[]) => 
    (await apiRequest<{ response: string }>(API_ENDPOINTS.ai.chat, { method: 'POST', body: JSON.stringify({ message, history }) })).response,
  getInsights: async () => {
    const response: any = await apiRequest(API_ENDPOINTS.ai.insights);
    return Array.isArray(response) ? response : (response.insights || response.data || []);
  },
  processReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<any>(API_ENDPOINTS.ai.processReceipt, { method: 'POST', body: formData });
  },
};

// ==================== SETTINGS (STRUK & TOKO) ====================
export const settingsAPI = {
  /**
   * MENGAMBIL PENGATURAN DARI DATABASE (PUSAT)
   */
  getReceiptSettings: async () => {
      try {
        const response = await apiRequest<any>(API_ENDPOINTS.receipt_settings.base);

        // JAGA-JAGA: Kalau response adalah Array, ambil elemen pertama
        const data = Array.isArray(response) ? response[0] : response;

        if (data) {
          return {
            // Gunakan Nilai dari DB, tapi kasih FALLBACK (Cadangan) kalau kolomnya null/tidak ada
            store_name: data.store_name || 'SEBLAK MLEDAK',
            address: data.address || 'Alamat Belum Diatur',
            footer_text: data.footer_text || 'Terima Kasih!',
            logo_url: data.logo_url || null,
            show_logo: data.show_logo ?? false,
            paper_size: data.paper_size || '58mm',
            
            // DATA ADVANCE (Kasih default angka/string kalau kolom belum dibuat di PostgreSQL)
            auto_print: data.auto_print ?? true,
            max_chars: data.max_chars || 32,
            font_family: data.font_family || 'monospace',
            font_size: data.font_size || 10,
            margin_h: data.margin_h || 0,
            margin_b: data.margin_b || 20
          };
        }
        
        // Jika data benar-benar kosong (null/undefined), lempar ke catch
        throw new Error("Data Kosong");

      } catch (error) {
        console.error("Gagal sinkronisasi settings pusat, menggunakan default.");
        return {
          store_name: 'SEBLAK MLEDAK',
          address: 'Alamat Belum Diatur',
          footer_text: 'Terima Kasih!',
          show_logo: false,
          logo_url: null,
          paper_size: '58mm',
          auto_print: true,
          max_chars: 32,
          font_family: 'monospace',
          font_size: 10,
          margin_h: 0,
          margin_b: 20
        };
      }
    },

  /**
   * MENYIMPAN PENGATURAN KE DATABASE (PUSAT)
   */
  updateReceiptSettings: async (config: any) => {
    return apiRequest(API_ENDPOINTS.receipt_settings.base, {
      method: 'PUT',
      body: JSON.stringify({
        // Menyesuaikan kiriman body dengan nama kolom di PostgreSQL kamu
        store_name: config.store_name || config.storeName,
        address: config.address,
        footer_text: config.footer_text || config.footer,
        logo_url: config.logo_url || config.logo,
        show_logo: config.show_logo ?? config.showLogo,
        paper_size: config.paper_size || config.paperSize,
        
        // DATA ADVANCE (KIRIM KE DATABASE)
        auto_print: config.auto_print ?? config.autoPrint,
        max_chars: config.max_chars || config.maxChars,
        font_family: config.font_family || config.fontFamily,
        font_size: config.font_size || config.fontSize,
        margin_h: config.margin_h || config.marginHorizontal,
        margin_b: config.margin_b || config.marginBottom
      }),
    });
  }
};


// ==================== PENDING ORDER ====================
export const pendingOrdersAPI = {
  // Ambil semua antrean
  getAll: () => apiRequest(API_ENDPOINTS.pendingOrders.base),

  // Simpan antrean baru
  save: (data: any) => apiRequest(API_ENDPOINTS.pendingOrders.base, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update antrean (diedit kasir)
  update: (id: string, data: any) => apiRequest(API_ENDPOINTS.pendingOrders.getById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Hapus antrean (setelah dibayar atau dicancel)
  delete: (id: string) => apiRequest(API_ENDPOINTS.pendingOrders.getById(id), {
    method: 'DELETE',
  }),
};

// ==================== PERMISSIONS ====================
export const permissionsAPI = {
  getAll: () => apiRequest(API_ENDPOINTS.permissions.base),
  
  update: (roleName: string, allowedMenus: string[]) => 
    apiRequest(API_ENDPOINTS.permissions.update(roleName), {
      method: 'PUT',
      body: JSON.stringify({ allowed_menus: allowedMenus }),
    }),
};
