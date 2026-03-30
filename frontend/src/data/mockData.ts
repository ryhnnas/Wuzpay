// Mock Data untuk Demo
// Ganti dengan data dari MySQL database Anda

import { 
  Product, 
  Category, 
  Customer, 
  Supplier, 
  Transaction, 
  Discount, 
  CashDrawer,
  User 
} from '@/types';

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Seblak Original', color: '#FF6B6B' },
  { id: 'cat-2', name: 'Seblak Premium', color: '#4ECDC4' },
  { id: 'cat-3', name: 'Seblak Pedas', color: '#FF4757' },
  { id: 'cat-4', name: 'Minuman', color: '#1E90FF' },
  { id: 'cat-5', name: 'Topping', color: '#FFA502' },
  { id: 'cat-6', name: 'Paket Hemat', color: '#2ED573' },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    sku: 'SBK-001',
    name: 'Seblak Original',
    description: 'Seblak original dengan kerupuk pilihan',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
    categories: ['cat-1'],
    buyPrice: 8000,
    sellPrice: 15000,
    stock: 50,
  },
  {
    id: 'prod-2',
    sku: 'SBK-002',
    name: 'Seblak Ceker',
    description: 'Seblak dengan ceker ayam empuk',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    categories: ['cat-2', 'cat-3'],
    buyPrice: 12000,
    sellPrice: 22000,
    stock: 35,
    discount: 10,
    discountType: 'percentage',
  },
  {
    id: 'prod-3',
    sku: 'SBK-003',
    name: 'Seblak Macaroni',
    description: 'Seblak dengan macaroni kenyal',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    categories: ['cat-1'],
    buyPrice: 9000,
    sellPrice: 17000,
    stock: 40,
  },
  {
    id: 'prod-4',
    sku: 'SBK-004',
    name: 'Seblak Bakso',
    description: 'Seblak dengan bakso sapi',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    categories: ['cat-2'],
    buyPrice: 11000,
    sellPrice: 20000,
    stock: 30,
  },
  {
    id: 'prod-5',
    sku: 'SBK-005',
    name: 'Seblak Super Pedas',
    description: 'Seblak level pedas maksimal',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    categories: ['cat-3'],
    buyPrice: 10000,
    sellPrice: 18000,
    stock: 25,
  },
  {
    id: 'prod-6',
    sku: 'DRK-001',
    name: 'Es Teh Manis',
    description: 'Teh manis dingin',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    categories: ['cat-4'],
    buyPrice: 2000,
    sellPrice: 5000,
    stock: 100,
  },
  {
    id: 'prod-7',
    sku: 'DRK-002',
    name: 'Es Jeruk',
    description: 'Jeruk peras segar',
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
    categories: ['cat-4'],
    buyPrice: 3000,
    sellPrice: 8000,
    stock: 80,
  },
  {
    id: 'prod-8',
    sku: 'TOP-001',
    name: 'Topping Telur',
    description: 'Tambahan telur rebus',
    image: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400',
    categories: ['cat-5'],
    buyPrice: 2000,
    sellPrice: 5000,
    stock: 60,
  },
  {
    id: 'prod-9',
    sku: 'PKT-001',
    name: 'Paket Hemat 1',
    description: 'Seblak Original + Es Teh',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
    categories: ['cat-6'],
    buyPrice: 10000,
    sellPrice: 18000,
    stock: 20,
    isPackage: true,
    packageItems: [
      { productId: 'prod-1', quantity: 1 },
      { productId: 'prod-6', quantity: 1 },
    ],
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    phone: '081234567890',
    address: 'Jl. Merdeka No. 123, Jakarta',
    totalPurchases: 450000,
    lastPurchase: new Date('2026-01-22'),
  },
  {
    id: 'cust-2',
    name: 'Siti Nurhaliza',
    email: 'siti@example.com',
    phone: '081234567891',
    address: 'Jl. Sudirman No. 45, Jakarta',
    totalPurchases: 320000,
    lastPurchase: new Date('2026-01-21'),
  },
  {
    id: 'cust-3',
    name: 'Ahmad Rizki',
    phone: '081234567892',
    totalPurchases: 180000,
    lastPurchase: new Date('2026-01-20'),
  },
];

export const mockSuppliers: Supplier[] = [
  {
    id: 'supp-1',
    name: 'PT Maju Jaya',
    email: 'majujaya@supplier.com',
    phone: '021-1234567',
    address: 'Jl. Industri No. 100, Tangerang',
  },
  {
    id: 'supp-2',
    name: 'CV Sumber Rezeki',
    email: 'sumberrezeki@supplier.com',
    phone: '021-7654321',
    address: 'Jl. Pasar Baru No. 50, Jakarta',
  },
];

export const mockDiscounts: Discount[] = [
  {
    id: 'disc-1',
    name: 'Diskon Seblak Ceker',
    amount: 10,
    type: 'percentage',
    scope: 'item',
    isActive: true,
  },
  {
    id: 'disc-2',
    name: 'Diskon Weekend',
    amount: 5000,
    type: 'fixed',
    scope: 'transaction',
    isActive: true,
  },
];

export const mockTransactions: Transaction[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  date.setHours(Math.floor(Math.random() * 12) + 9);
  
  const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
  const quantity = Math.floor(Math.random() * 3) + 1;
  const subtotal = product.sellPrice * quantity;
  const discount = Math.random() > 0.7 ? 5000 : 0;
  const total = subtotal - discount;
  const profit = (product.sellPrice - product.buyPrice) * quantity - discount;
  
  return {
    id: `trans-${i + 1}`,
    receiptNumber: `INV-2026${String(i + 1).padStart(4, '0')}`,
    date,
    items: [
      {
        product,
        quantity,
        subtotal,
        discount: 0,
      },
    ],
    orderType: Math.random() > 0.5 ? 'dine-in' : 'takeaway',
    paymentMethod: ['cash', 'qris', 'transfer'][Math.floor(Math.random() * 3)] as any,
    subtotal,
    discount,
    tax: 0,
    total,
    paid: total,
    change: 0,
    profit,
    cashierId: 'user-1',
    cashierEmail: 'kasir@seblak.com',
    status: 'completed',
  };
});

export const mockCashDrawer: CashDrawer[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const openingBalance = 100000;
  const dailySales = Math.floor(Math.random() * 500000) + 200000;
  const closingBalance = openingBalance + dailySales;
  
  return {
    id: `drawer-${i + 1}`,
    date,
    openingBalance,
    closingBalance,
    staffName: 'Kasir 1',
    staffId: 'user-1',
    expectedCash: closingBalance,
    actualCash: closingBalance,
    difference: 0,
  };
});

export const mockCurrentUser: User = {
  id: 'user-1',
  name: 'Admin POS',
  email: 'admin@seblak.com',
  role: 'owner',
};

// Helper function untuk generate mock data berdasarkan date range
export const getMockTransactionsByDateRange = (startDate: Date, endDate: Date): Transaction[] => {
  return mockTransactions.filter(trans => {
    const transDate = new Date(trans.date);
    return transDate >= startDate && transDate <= endDate;
  });
};

export const getMockSalesSummary = (startDate: Date, endDate: Date) => {
  const transactions = getMockTransactionsByDateRange(startDate, endDate);
  
  return {
    totalTransactions: transactions.length,
    totalRevenue: transactions.reduce((sum, t) => sum + t.total, 0),
    totalProfit: transactions.reduce((sum, t) => sum + t.profit, 0),
    avgTransaction: transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.total, 0) / transactions.length 
      : 0,
  };
};
