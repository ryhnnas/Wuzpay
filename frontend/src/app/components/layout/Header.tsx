import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, ServerCrash, Printer, Clock } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { User as UserType, Product } from '@/types';
import { productsAPI } from '@/services/api';
import { cn } from '@/app/components/ui/utils';

interface HeaderProps {
  user: UserType;
  currentPage: string;
  // PROPS TAMBAHAN
  onOpenPendingOrders?: () => void;
  pendingCount?: number;
}

interface AppNotification {
  id: string;
  type: 'stock' | 'error' | 'system' | 'printer';
  message: string;
}

const pageTitle: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'Point of Sale (Kasir)',
  products: 'Manajemen Produk',
  stock: 'Manajemen Stok',
  contacts: 'Manajemen Customer & Supplier',
  discounts: 'Manajemen Diskon',
  'cash-drawer': 'Cash Drawer',
  reports: 'Laporan',
  'ai-insights': 'AI Business Insights',
  'ai-assistant': 'AI Assistant',
  settings: 'Pengaturan',
};

export function Header({ user, currentPage, onOpenPendingOrders, pendingCount = 0 }: HeaderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Logika Cek Stok Real-time
useEffect(() => {
  const checkSystems = async () => {
    try {
      const products = await productsAPI.getAll();
      const lowStockItems = products.filter((p: Product) => Number(p.stock) <= 5);
      
      const currentStockNotifs = lowStockItems.map(p => ({
        id: `low-stock-${p.id}`,
        type: 'stock' as const,
        message: `Stok ${p.name} kritis! Sisa ${p.stock}`
      }));

      setNotifications(prev => {
        // 1. Ambil notifikasi selain stok (misal error sistem) agar tidak hilang
        const nonStockNotifs = prev.filter(n => n.type !== 'stock');
        
        // 2. Gabungkan notif non-stok dengan data stok terbaru hasil scan API
        return [...nonStockNotifs, ...currentStockNotifs];
      });

    } catch (err) {
      setNotifications(prev => {
        if (prev.some(n => n.id === 'backend-error')) return prev;
        return [...prev, { id: 'backend-error', type: 'system', message: 'Koneksi terputus!' }];
      });
    }
  };
  // Jalankan langsung saat pertama kali render
  checkSystems();

  // Jalankan setiap 60 detik
  const interval = setInterval(checkSystems, 60000); 
    
    // Cleanup function
    return () => clearInterval(interval);
  }, [user]);

  const removeNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 sticky top-0 z-30">
        {/* Judul Halaman */}
        <div className="flex items-center gap-4 flex-1">
          <h2 className="font-bold text-xl tracking-tight text-gray-800 uppercase">
            {pageTitle[currentPage] || 'POS System'}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* TOMBOL DAFTAR PESANAN - HANYA DI POS */}
          {currentPage === 'pos' && (
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onOpenPendingOrders}
                className={cn(pendingCount > 0 && "bg-orange-50 text-orange-600 hover:bg-orange-100")}
              >
                <Clock className="size-5" />
                {pendingCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-orange-600 p-0 text-[10px] text-white border-2 border-white">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            </div>
          )}

          {/* Notifikasi Bell */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(notifications.length > 0 && "bg-orange-50 text-orange-600 hover:bg-orange-100")}
            >
              <Bell className="size-5" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-600 p-0 text-[10px] text-white animate-pulse border-2 border-white">
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </div>

          <div className="h-6 w-[1px] bg-gray-200 mx-2" />

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-gray-50 pl-3 pr-1 py-1 rounded-full border border-gray-100">
            <div className="hidden md:block text-right leading-tight">
              {/* ✅ Ganti ke email agar lebih konsisten sesuai login */}
              <p className="font-bold text-xs text-gray-800 lowercase">{user?.email || "loading..."}</p>
              <p className="text-[9px] text-orange-600 font-bold uppercase tracking-widest">{user?.role || "Staff"}</p>
            </div>
            
            <Avatar className="size-8 ring-2 ring-white">
              <AvatarFallback className="bg-orange-600 text-white font-bold text-[10px]">
                {/* ✅ Ambil 2 huruf pertama dari email */}
                {user?.email ? user.email.substring(0, 2).toUpperCase() : "??"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Persistent Floating Notifications Container (Ala n8n) */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 w-80 pointer-events-none">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border-l-4 animate-in slide-in-from-right-10 duration-300 bg-white",
              n.type === 'stock' ? "border-red-500" : "border-red-600"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              n.type === 'stock' ? "bg-red-50" : "bg-red-50"
            )}>
              {n.type === 'stock' ? (
                <AlertTriangle className="size-4 text-red-600" />
              ) : n.type === 'printer' ? (
                <Printer className="size-4 text-red-600" />
              ) : (
                <ServerCrash className="size-4 text-red-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 leading-none mb-1">
                {n.type === 'stock' ? 'PERINGATAN STOK' : 'GANGGUAN SISTEM'}
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{n.message}</p>
            </div>

            <button 
              onClick={() => removeNotif(n.id)}
              className="text-gray-300 hover:text-gray-500 transition-colors pt-0.5"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}