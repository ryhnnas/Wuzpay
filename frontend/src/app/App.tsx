import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Toaster } from '@/app/components/ui/sonner';
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
import { supabase } from '@/services/supabaseClient';
import { authAPI, pendingOrdersAPI, permissionsAPI } from '@/services/api';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(authAPI.getCachedUser());
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isCheckingAuth, setIsCheckingAuth] = useState(!authAPI.getCachedUser());
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [showPendingListDialog, setShowPendingListDialog] = useState(false);
  
  // State Permissions
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isPermsLoading, setIsPermsLoading] = useState(true);

  // --- FUNGSI LOAD DATA (Wrapped in useCallback agar stabil) ---
  const loadPendingOrdersFromDB = useCallback(async () => {
    try {
      const orders = await pendingOrdersAPI.getAll();
      setPendingOrders(orders);
    } catch (err) {
      console.error("Gagal load antrean");
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
          // Default jika role tidak terdaftar di DB
          setUserPermissions(role.toLowerCase() === 'kasir' ? ['pos'] : ['dashboard']);
        }
      }
    } catch (error) {
      console.error("Gagal load permissions:", error);
      setUserPermissions(['dashboard', 'pos']);
    } finally {
      // Kasih delay dikit biar state sinkron sempurna
      setTimeout(() => setIsPermsLoading(false), 300);
    }
  }, []);

  // --- LOGIKA AUTH & INITIAL LOAD ---
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) { 
        setIsCheckingAuth(false);
        setIsPermsLoading(false);
        setPendingOrders([]);
        return; 
      }
      try {
        const user = await authAPI.getCurrentUser();
        setCurrentUser(user);
        
        // Load Permissions Segera setelah user didapat
        if (user.role) {
          await loadUserPermissions(user.role);
        }

        if (user.role === 'kasir') setActiveMenu('pos');
        
        loadPendingOrdersFromDB();

      } catch (error) {
        console.error("Auth init failed", error);
        handleLogout();
      } finally { 
        setIsCheckingAuth(false); 
      }
    };

    initApp();

    // Realtime Listener
    const channel = supabase
      .channel('pending_orders_changes')
      .on('postgres_changes', { event: '*', table: 'pending_orders' }, () => {
        loadPendingOrdersFromDB(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPendingOrdersFromDB, loadUserPermissions, currentUser?.id]);

  // --- HANDLERS ---
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadUserPermissions(user.role);
    setActiveMenu(user.role === 'kasir' ? 'pos' : 'dashboard');
  };

  const handleLogout = () => {
    authAPI.logout();
    setCurrentUser(null);
    setActiveMenu('dashboard');
    setUserPermissions([]);
    setIsPermsLoading(false);
  };

  // --- 🛰️ GLOBAL SESSION MONITOR (SATUAN PENJAGA SESI) ---
  useEffect(() => {
    const handleAuthError = (event: PromiseRejectionEvent) => {
      // Kita tangkap error dari apiRequest yang statusnya 401
      const errorMsg = event.reason?.message || "";
      
      if (errorMsg.includes("401") || errorMsg.includes("status: 401") || errorMsg.includes("Unauthorized")) {
        console.warn("🛡️ Global Auth Monitor: Mendeteksi Sesi Berakhir");
        
        // Kasih info ke kasir pakai toast yang gak bisa ilang (Infinity)
        toast.error("Sesi Login Berakhir!", {
          description: "Silakan masuk kembali untuk melanjutkan pekerjaan.",
          duration: Infinity, 
          id: "auth-expired-toast", // ID unik biar gak muncul double
          action: {
            label: "LOGIN SEKARANG",
            onClick: () => handleLogout()
          }
        });

        // Paksa logout otomatis setelah 4 detik kalau kasir gak klik tombolnya
        setTimeout(() => {
          handleLogout();
        }, 4000);
      }
    };

    // Pasang pendengar error global
    window.addEventListener("unhandledrejection", handleAuthError);
    
    return () => {
      window.removeEventListener("unhandledrejection", handleAuthError);
    };
  }, [handleLogout]); // Masukkan handleLogout agar tetap sinkron

  // --- RENDER CONTENT (LOGIKA ANTI RACE CONDITION) ---
  const renderContent = () => {
    // 1. Jika masih loading AUTH atau PERMISSIONS, tahan di layar loading
    if (isCheckingAuth || isPermsLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-white">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">
            Sinkronisasi Data...
          </p>
        </div>
      );
    }

    // 2. Cek Izin Akses (Setelah dipastikan loading selesai)
    const currentMenu = activeMenu;
    const isAllowed =
      userPermissions.includes(currentMenu) ||
      currentUser?.role.toLowerCase() === 'owner';

    if (!isAllowed) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-10 text-center bg-white">
          <div className="size-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <ShieldCheck className="size-10" />
          </div>
          <h2 className="font-black text-3xl uppercase tracking-tighter text-gray-900">Akses Dibatasi</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-xs font-bold uppercase tracking-widest">
            Role <span className="text-orange-600">{currentUser?.role}</span> tidak diizinkan mengakses menu ini.
          </p>
          <Button 
            onClick={() => setActiveMenu(currentUser?.role === 'kasir' ? 'pos' : 'dashboard')}
            className="mt-8 bg-gray-900 text-white rounded-2xl font-black px-10 h-14 hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 uppercase tracking-widest text-[10px]"
          >
            KEMBALI KE BERANDA
          </Button>
        </div>
      );
    }

    // 3. Render Menu
    switch (currentMenu) {
      case 'pos':
        return (
          <POSScreen 
            pendingOrders={pendingOrders} 
            setPendingOrders={setPendingOrders}
            showPendingListDialog={showPendingListDialog}
            setShowPendingListDialog={setShowPendingListDialog}
            refreshPendingOrders={loadPendingOrdersFromDB} 
          />
        );
      case 'dashboard': return <Dashboard />;
      case 'products': return <ProductManagement />;
      case 'stock': return <StockManagement />;
      case 'contacts': return <CustomerManagement />;
      case 'discounts': return <DiscountsManagement />;
      case 'cash-drawer': return <CashDrawer />;
      case 'kategories': return <KategoriManagement />;
      case 'product-sales': return <ProductSalesReport />;
      case 'category-sales': return <CategorySalesReport />;
      case 'qris-reports': return <QrisReportPage />;
      case 'reports': return <ReportsSection />;
      case 'ai-insights': return <AIInsights />;
      case 'ai-assistant': return <AIAssistant />;
      case 'settings': return <SettingsPage onLogout={handleLogout} />;
      case 'setting-struk': return <SettingStruk />;
      case 'setting-print': return <SettingPrint />;
      case 'setting-akses': return <SettingAkses />;
      default: return <Dashboard />;
    }
  };

  // --- MAIN RENDER ---
  if (!currentUser && !isCheckingAuth) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu} 
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
  );
}

export default App;