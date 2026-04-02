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
  onOpenPendingOrders?: () => void;
  pendingCount?: number;
}

interface AppNotification {
  id: string;
  type: 'stock' | 'error' | 'system' | 'printer';
  message: string;
}

const pageTitle: Record<string, string> = {
  dashboard: 'Dashboard Analytics',
  pos: 'Kasir',
  products: 'Katalog Produk',
  stock: 'Kontrol Inventori',
  contacts: 'Mitra & Pelanggan',
  discounts: 'Manajemen Promo',
  'cash-drawer': 'Buka/Tutup Kasir',
  reports: 'Laporan Penjualan',
  'ai-insights': 'Business Intelligence',
  'ai-assistant': 'WuzPay AI Bot',
  settings: 'Konfigurasi Sistem',
};

export function Header({ user, currentPage, onOpenPendingOrders, pendingCount = 0 }: HeaderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Logika Cek Stok Real-time (Polling 60 detik)
  useEffect(() => {
    const checkSystems = async () => {
      try {
        const products = await productsAPI.getAll();
        // MongoDB menggunakan stock_quantity
        const lowStockItems = products.filter((p: Product) => Number(p.stock_quantity ?? 0) <= 5);
        
        const currentStockNotifs = lowStockItems.map(p => ({
          id: `low-stock-${p._id || p.id}`,
          type: 'stock' as const,
          message: `Stok ${p.name} menipis! Sisa ${p.stock_quantity}`
        }));

        setNotifications(prev => {
          const nonStockNotifs = prev.filter(n => n.type !== 'stock');
          return [...nonStockNotifs, ...currentStockNotifs];
        });

      } catch (err) {
        setNotifications(prev => {
          if (prev.some(n => n.id === 'backend-error')) return prev;
          return [...prev, { id: 'backend-error', type: 'system', message: 'Koneksi ke WuzPay Server terputus!' }];
        });
      }
    };

    checkSystems();
    const interval = setInterval(checkSystems, 60000); 
    return () => clearInterval(interval);
  }, [user]);

  const removeNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      <header className="flex h-20 items-center justify-between border-b bg-white/80 backdrop-blur-xl px-8 sticky top-0 z-30 border-gray-100">
        {/* Judul Halaman */}
        <div className="flex items-center gap-4 flex-1">
          <div className="h-8 w-1 bg-orange-600 rounded-full hidden md:block" />
          <h2 className="font-black text-xl tracking-tighter text-orange-600 uppercase italic">
            {pageTitle[currentPage] || 'Kategori'}
          </h2>
        </div>

        <div className="flex items-center gap-5">
          {/* TOMBOL DAFTAR PESANAN - HANYA DI POS */}
          {currentPage === 'pos' && (
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onOpenPendingOrders}
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  pendingCount > 0 ? "bg-orange-50 text-orange-600 hover:bg-orange-100 shadow-sm" : "text-gray-400 hover:bg-gray-50"
                )}
              >
                <Clock className="size-5" />
                {pendingCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-orange-600 p-0 text-[10px] font-black text-white border-2 border-white animate-bounce">
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
              className={cn(
                "rounded-2xl transition-all duration-300",
                notifications.length > 0 ? "bg-red-50 text-red-600 hover:bg-red-100 shadow-sm" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              <Bell className="size-5" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-600 p-0 text-[10px] font-black text-white border-2 border-white">
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </div>

          <div className="h-8 w-[1px] bg-gray-100 mx-1" />

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-gray-50/80 pl-4 pr-1.5 py-1.5 rounded-[20px] border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer group">
            <div className="hidden md:block text-right leading-none">
              <p className="font-black text-[11px] text-orange-600 uppercase tracking-tight group-hover:text-orange-600 transition-colors">
                {user?.name || user?.email?.split('@')[0] || "Staff"}
              </p>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 italic">
                {user?.role || "Staff"}
              </p>
            </div>
            
            <Avatar className="size-9 ring-4 ring-white shadow-sm transition-transform group-hover:scale-105">
              <AvatarFallback className="bg-orange-600 text-white font-black text-xs uppercase">
                {user?.name ? user.name.substring(0, 2) : (user?.email ? user.email.substring(0, 2) : "??")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Floating Notifications Container */}
      <div className="fixed top-24 right-8 z-50 flex flex-col gap-4 w-80 pointer-events-none">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            className={cn(
              "pointer-events-auto flex items-start gap-4 p-5 rounded-[24px] shadow-2xl backdrop-blur-xl border-l-8 animate-in slide-in-from-right-full duration-500 bg-white/95",
              n.type === 'stock' ? "border-orange-500" : "border-red-600"
            )}
          >
            <div className={cn(
              "p-2.5 rounded-xl",
              n.type === 'stock' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
            )}>
              {n.type === 'stock' ? (
                <AlertTriangle className="size-5" />
              ) : n.type === 'printer' ? (
                <Printer className="size-5" />
              ) : (
                <ServerCrash className="size-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">
                {n.type === 'stock' ? 'Peringatan Inventori' : 'Error Critical'}
              </p>
              <p className="text-[11px] text-gray-500 font-bold leading-relaxed italic">{n.message}</p>
            </div>

            <button 
              onClick={() => removeNotif(n.id)}
              className="text-gray-300 hover:text-orange-600 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}