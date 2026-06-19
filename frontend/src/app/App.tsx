import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Toaster } from '@/app/components/ui/sonner';
import { toast } from 'sonner';
import { Sidebar } from '@/app/components/layout/Sidebar';
import { Header } from '@/app/components/layout/Header';
import { LoginScreen } from '@/app/components/auth/LoginScreen';
import { User } from '@/types';
import { APIRequestError, authAPI, isNetworkError, isUnauthorizedError, permissionsAPI, transactionsAPI } from '@/services/api';
import { OfflineBanner } from './components/ui/OfflineBanner';
import db from '@/services/db';
import { useGlobalStore } from '@/store/useGlobalStore';

// Lazy loaded page components
const Dashboard = lazy(() => import('@/app/components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const POSScreen = lazy(() => import('@/app/components/pos/POSScreen').then(m => ({ default: m.POSScreen })));
const KategoriManagement = lazy(() => import('./components/products/KategoriManagement'));
const ProductManagement = lazy(() => import('@/app/components/products/ProductManagement').then(m => ({ default: m.ProductManagement })));
const CustomerManagement = lazy(() => import('@/app/components/customers/CustomerManagement').then(m => ({ default: m.CustomerManagement })));
const ProductSalesReport = lazy(() => import('@/app/components/reports/ProductSalesReport').then(m => ({ default: m.ProductSalesReport })));
const CategorySalesReport = lazy(() => import('@/app/components/reports/CategorySalesReport').then(m => ({ default: m.CategorySalesReport })));
const QrisReportPage = lazy(() => import('@/app/components/reports/QrisReportPage').then(m => ({ default: m.QrisReportPage })));
const ReportsSection = lazy(() => import('@/app/components/reports/ReportsSection').then(m => ({ default: m.ReportsSection })));
const AIAssistant = lazy(() => import('@/app/components/ai/AIAssistant').then(m => ({ default: m.AIAssistant })));
const AIInsights = lazy(() => import('@/app/components/ai/AIInsights').then(m => ({ default: m.AIInsights })));
const DiscountsManagement = lazy(() => import('@/app/components/misc/DiscountsManagement').then(m => ({ default: m.DiscountsManagement })));
const CashDrawer = lazy(() => import('@/app/components/misc/CashDrawer').then(m => ({ default: m.CashDrawer })));
const StockManagement = lazy(() => import('./components/products/StockManagement').then(m => ({ default: m.StockManagement })));
const SettingsPage = lazy(() => import('./components/setting/SettingPage'));
const SettingStruk = lazy(() => import('./components/setting/SettingStruk'));
const SettingPrint = lazy(() => import('./components/setting/SettingPrint'));
const SettingAkses = lazy(() => import('./components/setting/SettingAkses'));
const IngredientManagement = lazy(() => import('./components/products/IngredientManagement').then(m => ({ default: m.IngredientManagement })));

const sendDebugLog = (payload: Record<string, unknown>) => {
  // Disabled to prevent ERR_CONNECTION_REFUSED in local development
  return;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(authAPI.getCachedUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(!authAPI.getCachedUser());
  const [showPendingListDialog, setShowPendingListDialog] = useState(false);

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isPermsLoading, setIsPermsLoading] = useState(true);

  const { pendingOrders, loadPendingOrders } = useGlobalStore();

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
        loadPendingOrders();

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
            loadPendingOrders();
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
        loadPendingOrders();
      } else {
        // #region agent log
        sendDebugLog({sessionId:'b291df',runId:'post-fix',hypothesisId:'H1',location:'frontend/src/app/App.tsx:130',message:'pending orders polling skipped',data:{pathname:location.pathname,isPosPage,isVisible},timestamp:Date.now()});
        // #endregion
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadPendingOrders, loadUserPermissions, location.pathname]);

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
      <Suspense fallback={
        <div className="flex h-full flex-col items-center justify-center bg-white">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">Memuat Halaman...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Navigate to={currentUser?.role === 'kasir' ? '/pos' : '/dashboard'} replace />} />
          <Route path="/login" element={<Navigate to={currentUser?.role === 'kasir' ? '/pos' : '/dashboard'} replace />} />
          
          <Route path="/pos" element={<POSScreen showPendingListDialog={showPendingListDialog} setShowPendingListDialog={setShowPendingListDialog} />} />
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
      </Suspense>
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