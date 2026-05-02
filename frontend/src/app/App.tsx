import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Toaster } from '@/app/components/ui/sonner';
import { toast } from 'sonner';
import { Sidebar } from '@/app/components/layout/Sidebar';
import { Header } from '@/app/components/layout/Header';
import { Dashboard } from '@/app/components/dashboard/Dashboard';
import { POSScreen } from '@/app/components/pos/POSScreen';
import KategoriManagement from './components/products/KategoriManagement';
import { ProductManagement } from '@/app/components/products/ProductManagement';
import { CustomerManagement } from '@/app/components/customers/CustomerManagement';
import { ProductSalesReport } from '@/app/components/reports/ProductSalesReport';
import { CategorySalesReport } from '@/app/components/reports/CategorySalesReport';
import { QrisReportPage } from '@/app/components/reports/QrisReportPage';
import { ReportsSection } from '@/app/components/reports/ReportsSection';
import { AIAssistant } from '@/app/components/ai/AIAssistant';
import { AIInsights } from '@/app/components/ai/AIInsights';
import { DiscountsManagement } from '@/app/components/misc/DiscountsManagement';
import { CashDrawer } from '@/app/components/misc/CashDrawer';
import { LoginScreen } from '@/app/components/auth/LoginScreen';
import { User } from '@/types';
import { StockManagement } from './components/products/StockManagement';
import SettingsPage from './components/setting/SettingPage';
import SettingStruk from './components/setting/SettingStruk';
import SettingPrint from './components/setting/SettingPrint';
import SettingAkses from './components/setting/SettingAkses';
import { APIRequestError, authAPI, isNetworkError, isUnauthorizedError, pendingOrdersAPI, permissionsAPI, transactionsAPI } from '@/services/api';
import { IngredientManagement } from './components/products/IngredientManagement';
import { OfflineBanner } from './components/ui/OfflineBanner';
import db from '@/services/db';

const sendDebugLog = (payload: Record<string, unknown>) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  fetch('http://127.0.0.1:7803/ingest/bf88b2af-7fcc-4dce-92b2-66169c85c570', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b291df' },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(authAPI.getCachedUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(!authAPI.getCachedUser());
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [showPendingListDialog, setShowPendingListDialog] = useState(false);

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isPermsLoading, setIsPermsLoading] = useState(true);

  // --- FUNGSI LOAD DATA ---
  const loadPendingOrdersFromDB = useCallback(async () => {
    try {
      const orders = await pendingOrdersAPI.getAll();
      setPendingOrders(orders);
    } catch (err) {
      if (err instanceof APIRequestError && err.code === 'NO_OFFLINE_CACHE') {
        toast.info('Antrean offline belum tersedia. Buka halaman ini sekali saat online untuk sinkron awal.');
        return;
      }
      console.error("Gagal load antrean", err);
    }
  }, []);

  const loadUserPermissions = useCallback(async (role: string) => {
    if (!role) {
      setIsPermsLoading(false);
      return;
    }
    try {
      setIsPermsLoading(true);
      const data = await permissionsAPI.getAll();

      if (Array.isArray(data)) {
        const myPerms = data.find((p: any) =>
          p.role_name.toLowerCase() === role.toLowerCase()
        );

        if (myPerms && myPerms.allowed_menus) {
          setUserPermissions(myPerms.allowed_menus);
        } else {
          setUserPermissions(role.toLowerCase() === 'kasir' ? ['pos'] : ['dashboard']);
        }
      }
    } catch (error) {
      if (isNetworkError(error)) {
        console.warn("Permissions fallback default karena offline.");
      } else {
        console.error("Gagal load permissions:", error);
      }
      setUserPermissions(['dashboard', 'pos']);
    } finally {
      setTimeout(() => setIsPermsLoading(false), 300);
    }
  }, []);

  // --- LOGIKA AUTH & POLLING ---
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('auth_token');
      // #region agent log
      sendDebugLog({sessionId:'b291df',runId:'baseline',hypothesisId:'H2',location:'frontend/src/app/App.tsx:90',message:'initApp invoked',data:{pathname:location.pathname,hasToken:Boolean(token)},timestamp:Date.now()});
      // #endregion
      if (!token) {
        setIsCheckingAuth(false);
        setIsPermsLoading(false);
        return;
      }
      try {
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);

        if (user.role) {
          await loadUserPermissions(user.role);
        }

        if (user.role && location.pathname === '/login') {
          navigate(user.role === 'kasir' ? '/pos' : '/dashboard', { replace: true });
        }
        loadPendingOrdersFromDB();

      } catch (error) {
        if (isUnauthorizedError(error)) {
          handleLogout();
          return;
        }

        if (isNetworkError(error)) {
          const cachedUser = authAPI.getCachedUser();
          if (cachedUser) {
            setCurrentUser(cachedUser);
            if (cachedUser.role) {
              await loadUserPermissions(cachedUser.role);
            }
            if (location.pathname === '/login') {
              navigate(cachedUser.role === 'kasir' ? '/pos' : '/dashboard', { replace: true });
            }
            loadPendingOrdersFromDB();
            toast.warning('Mode offline aktif. Menggunakan sesi tersimpan.');
            return;
          }

          setCurrentUser(null);
          setUserPermissions([]);
          setIsPermsLoading(false);
          toast.error('Tidak ada sesi tersimpan. Silakan sambungkan internet untuk login.');
          return;
        }

        handleLogout();
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initApp();

    const interval = setInterval(() => {
      const isPosPage = location.pathname.startsWith('/pos');
      const isVisible = document.visibilityState === 'visible';
      // #region agent log
      sendDebugLog({sessionId:'b291df',runId:'post-fix',hypothesisId:'H1',location:'frontend/src/app/App.tsx:122',message:'pending orders interval tick',data:{hasToken:Boolean(localStorage.getItem('auth_token')),isPosPage,isVisible,pathname:location.pathname},timestamp:Date.now()});
      // #endregion
      if (localStorage.getItem('auth_token') && isPosPage && isVisible) {
        // #region agent log
        sendDebugLog({sessionId:'b291df',runId:'post-fix',hypothesisId:'H1',location:'frontend/src/app/App.tsx:125',message:'pending orders polling executed',data:{pathname:location.pathname},timestamp:Date.now()});
        // #endregion
        loadPendingOrdersFromDB();
      } else {
        // #region agent log
        sendDebugLog({sessionId:'b291df',runId:'post-fix',hypothesisId:'H1',location:'frontend/src/app/App.tsx:130',message:'pending orders polling skipped',data:{pathname:location.pathname,isPosPage,isVisible},timestamp:Date.now()});
        // #endregion
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadPendingOrdersFromDB, loadUserPermissions, location.pathname]);

  // --- HANDLERS ---
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadUserPermissions(user.role);
    navigate(user.role === 'kasir' ? '/pos' : '/dashboard', { replace: true });
  };

  const handleLogout = useCallback(() => {
    authAPI.logout();
    setCurrentUser(null);
    setUserPermissions([]);
    setIsPermsLoading(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  // --- GLOBAL SESSION MONITOR ---
  useEffect(() => {
    const handleAuthError = (event: PromiseRejectionEvent) => {
      const errorMsg = event.reason?.message || "";
      if (errorMsg.includes("Unauthorized") || errorMsg.includes("Sesi Berakhir")) {
        toast.error("Sesi Login Berakhir!", {
          description: "Silakan masuk kembali.",
          duration: 5000,
        });
        handleLogout();
      }
    };

    window.addEventListener("unhandledrejection", handleAuthError);
    return () => window.removeEventListener("unhandledrejection", handleAuthError);
  }, [handleLogout]);

  // --- OFFLINE SYNC BACKGROUND WORKER ---
  useEffect(() => {
    const syncOfflineData = async () => {
      // #region agent log
      sendDebugLog({sessionId:'b291df',runId:'baseline',hypothesisId:'H5',location:'frontend/src/app/App.tsx:163',message:'syncOfflineData called',data:{online:navigator.onLine},timestamp:Date.now()});
      // #endregion
      if (!navigator.onLine) return;

      const pendingTxs = await db.pendingTransactions.toArray();
      if (pendingTxs.length === 0) return;

      console.log(`🔄 Mengirim ${pendingTxs.length} transaksi offline ke awan...`);
      for (const tx of pendingTxs) {
        try {
           const response: any = await transactionsAPI.create(tx.payload, { disableOfflineQueue: true });

           // Hanya hapus jika transaksi benar-benar berhasil terkirim ke server.
           if (!response?.offline) {
             await db.pendingTransactions.delete(tx.id!);
           }
           
           // Jeda pernafasan 300ms antar resit agar backend Deno Rate Limiter tidak tersentak
           await new Promise(r => setTimeout(r, 300)); 
        } catch(e: any) {
           // Jangan hapus antrean saat gagal sinkron agar tidak kehilangan transaksi.
           console.warn("Gagal sync transaksi offline, antrean dipertahankan:", e?.message || e);
        }
      }
    };

    window.addEventListener('online', syncOfflineData);
    const syncInterval = setInterval(syncOfflineData, 20000); // Tiap 20 detik
    
    // Coba tembak sync saat aplikasi pertama kali ke-load (antisipasi tertinggal)
    setTimeout(syncOfflineData, 3000);

    return () => {
      window.removeEventListener('online', syncOfflineData);
      clearInterval(syncInterval);
    };
  }, []);

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (isCheckingAuth || isPermsLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest animate-pulse">WuzPay Syncing...</p>
        </div>
      );
    }

    // Dapatkan menu ID dari URL path
    let activeMenu = location.pathname.substring(1);
    if (!activeMenu || activeMenu === 'login') {
      activeMenu = currentUser?.role === 'kasir' ? 'pos' : 'dashboard';
    }

    const isAllowed = userPermissions.includes(activeMenu) || currentUser?.role === 'owner';

    if (!isAllowed) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-10 bg-white">
          <ShieldCheck className="size-20 text-orange-600 mb-6" />
          <h2 className="font-black text-3xl uppercase">Akses Dibatasi</h2>
          <Button onClick={() => navigate(currentUser?.role === 'kasir' ? '/pos' : '/dashboard')} className="mt-8 bg-black text-white px-10">KEMBALI</Button>
        </div>
      );
    }

    return (
      <Routes>
        <Route path="/" element={<Navigate to={currentUser?.role === 'kasir' ? '/pos' : '/dashboard'} replace />} />
        <Route path="/login" element={<Navigate to={currentUser?.role === 'kasir' ? '/pos' : '/dashboard'} replace />} />
        
        <Route path="/pos" element={<POSScreen pendingOrders={pendingOrders} setPendingOrders={setPendingOrders} showPendingListDialog={showPendingListDialog} setShowPendingListDialog={setShowPendingListDialog} refreshPendingOrders={loadPendingOrdersFromDB} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ingredients" element={<IngredientManagement />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/stock" element={<StockManagement />} />
        <Route path="/contacts" element={<CustomerManagement />} />
        <Route path="/discounts" element={<DiscountsManagement />} />
        <Route path="/cash-drawer" element={<CashDrawer />} />
        <Route path="/kategories" element={<KategoriManagement />} />
        <Route path="/product-sales" element={<ProductSalesReport />} />
        <Route path="/category-sales" element={<CategorySalesReport />} />
        <Route path="/qris-reports" element={<QrisReportPage />} />
        <Route path="/reports" element={<ReportsSection />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/settings" element={<SettingsPage onLogout={handleLogout} />} />
        <Route path="/setting-struk" element={<SettingStruk />} />
        <Route path="/setting-print" element={<SettingPrint />} />
        <Route path="/setting-akses" element={<SettingAkses />} />
        
        <Route path="*" element={<Navigate to={currentUser?.role === 'kasir' ? '/pos' : '/dashboard'} replace />} />
      </Routes>
    );
  };


  if (!currentUser && !isCheckingAuth) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  let activeMenu = location.pathname.substring(1);
  if (!activeMenu || activeMenu === 'login') {
    activeMenu = currentUser?.role === 'kasir' ? 'pos' : 'dashboard';
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <OfflineBanner />
      <div className="flex flex-1 h-full bg-gray-50 overflow-hidden font-sans relative">
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={(menu: string) => navigate(`/${menu}`)}
          userRole={currentUser?.role || ''}
          allowedMenus={userPermissions}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={currentUser}
          currentPage={activeMenu}
          pendingCount={pendingOrders.length}
          onOpenPendingOrders={() => setShowPendingListDialog(true)}
        />
        <main className="flex-1 overflow-auto bg-white/50">
          {renderContent()}
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
      </div>
    </div>
  );
}

export default App;