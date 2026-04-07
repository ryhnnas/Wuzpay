import Dexie, { type EntityTable } from 'dexie';

// Interface untuk data payload transaksi mentah yang dikirim ke backend
export interface PendingTransaction {
  id?: number;
  payload: any;
  timestamp: number;
}

// Inisialisasi IndexedDB via Dexie
const db = new Dexie('WuzPayDB') as Dexie & {
  pendingTransactions: EntityTable<
    PendingTransaction,
    'id' 
  >;
};

// Deklarasi Schema
// ++id = auto-increment
db.version(1).stores({
  pendingTransactions: '++id, timestamp',
});

// Utility untuk mengecek apakah kita online atau offline
export const isUserOnline = () => navigator.onLine;

export default db;
