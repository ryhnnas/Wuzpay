import React, { useEffect, useState } from 'react';
import { WifiOff, ShieldCheck, RefreshCw } from 'lucide-react';
import db from '@/services/db';
import { useLiveQuery } from 'dexie-react-hooks';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Real-time pantau jumlah pesanan yang belum disinkronkan ke server
  const pendingCount = useLiveQuery(() => db.pendingTransactions.count(), []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Jika online dan tidak ada antrean sinkronisasi, sembunyikan banner
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`w-full text-white px-4 py-2 flex items-center justify-between text-sm md:text-base font-medium shadow-md transition-colors duration-300 z-[9999] relative ${
      !isOnline ? 'bg-orange-600' : 'bg-blue-600'
    }`}>
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <WifiOff className="w-5 h-5 animate-pulse" />
        ) : (
          <RefreshCw className="w-5 h-5 animate-spin" />
        )}
        <span>
          {!isOnline 
            ? "Mati Lampu/Offline Mode Aktif. Data kasir aman tersimpan lokal." 
            : "Koneksi Pulih! Mengirim transaksi ke server..."}
        </span>
      </div>
      
      {pendingCount ? (
        <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-green-300" />
          <span>{pendingCount} Transaksi Pending</span>
        </div>
      ) : null}
    </div>
  );
};
