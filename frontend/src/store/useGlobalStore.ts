import { create } from 'zustand';
import { pendingOrdersAPI, APIRequestError } from '@/services/api';
import { toast } from 'sonner';

interface GlobalState {
  pendingOrders: any[];
  isLoadingPending: boolean;
  setPendingOrders: (orders: any[]) => void;
  loadPendingOrders: () => Promise<void>;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  pendingOrders: [],
  isLoadingPending: false,
  setPendingOrders: (orders) => set({ pendingOrders: orders }),
  loadPendingOrders: async () => {
    set({ isLoadingPending: true });
    try {
      const orders = await pendingOrdersAPI.getAll();
      set({ pendingOrders: orders });
    } catch (err) {
      if (err instanceof APIRequestError && err.code === 'NO_OFFLINE_CACHE') {
        toast.info('Antrean offline belum tersedia. Buka halaman ini sekali saat online untuk sinkron awal.');
      } else {
        console.error('Gagal memuat antrean:', err);
      }
    } finally {
      set({ isLoadingPending: false });
    }
  },
}));
