import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, Utensils, Banknote, CreditCard, Wallet, 
  Tag, LayoutGrid, List, Loader2, ChevronDown, Delete, AlertTriangle, Clock, 
  Backpack, Smartphone, Check, Printer, CheckCircle2, ArrowLeft, Store, User 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { cn } from "@/app/components/ui/utils";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { productsAPI, transactionsAPI, categoriesAPI, discountsAPI } from '@/services/api';
import { toast } from 'sonner';
import { supabase } from '@/services/supabaseClient';
import { handleGlobalPrint } from '@/app/components/utils/printHandler';
import { pendingOrdersAPI } from '../../../services/api';
import { SuccessTransactionPage } from './SuccessTransactionPage';

// HELPER GLOBAL AGAR BISA DIAKSES SEMUA KOMPONEN DI FILE INI
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(amount || 0);
};

// MENERIMA PROPS DARI APP.TSX
export function POSScreen({ 
  pendingOrders, 
  setPendingOrders, 
  showPendingListDialog, 
  setShowPendingListDialog,
  refreshPendingOrders 
}: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('none');
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  
  // STATE LOADING BARU
  const [isLoading, setIsLoading] = useState(true);

  // STATE INTERNAL UNTUK MODAL SIMPAN
  const [showSaveOrderDialog, setShowSaveOrderDialog] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<any>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);

  // STATE UNTUK QRIS GOPAY
  const [showGoPayQR, setShowGoPayQR] = useState(false);

  // STATE UNTUK CHECK STATUS QRIS MIDTRANS
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // STATE UNTUK MODE SUKSES TRANSAKSI
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isSuccessMode, setIsSuccessMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto generate nama Customer-X
  useEffect(() => {
    if (showSaveOrderDialog) {
      // Jika tidak sedang edit (editingOrderId kosong), baru buat nama otomatis
      if (!editingOrderId) {
        setCustomerName(`Customer-${pendingOrders.length + 1}`);
      }
      // Jika sedang edit, biarkan customerName tetap sesuai nama aslinya
    }
  }, [showSaveOrderDialog, pendingOrders.length, editingOrderId]);

  // 1. TAMBAHKAN EFFECT INI DI POSScreen.tsx
  useEffect(() => {
    // Ambil data dari "gudang" browser saat pertama kali POS dibuka
    const savedCart = localStorage.getItem('nex_pos_backup_cart');
    const savedDiscount = localStorage.getItem('nex_pos_backup_discount');
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart.length > 0) {
          setCart(parsedCart);
          // Biar kasir tau kalau barangnya balik lagi
          toast.info("Pesanan sebelumnya dipulihkan otomatis");
        }
      } catch (e) {
        console.error("Gagal memulihkan keranjang", e);
      }
    }

    if (savedDiscount) {
      setSelectedDiscountId(savedDiscount);
    }
  }, []);

  // 2. TAMBAHKAN EFFECT KEDUA UNTUK MONITORING PERUBAHAN
  useEffect(() => {
    // Setiap kali isi keranjang atau diskon berubah, langsung catat di "gudang" browser
    if (cart.length > 0) {
      localStorage.setItem('nex_pos_backup_cart', JSON.stringify(cart));
      localStorage.setItem('nex_pos_backup_discount', selectedDiscountId);
    } else {
      // Kalau keranjang kosong (misal setelah bayar), hapus catatannya biar gak muncul lagi
      localStorage.removeItem('nex_pos_backup_cart');
      localStorage.removeItem('nex_pos_backup_discount');
    }
  }, [cart, selectedDiscountId]);

  const loadData = async () => {
    setIsLoading(true); // Mulai Loading
    try {
      const [productsData, categoriesData, discountsData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        discountsAPI.getAll()
      ]);

      const finalProducts = Array.isArray(productsData) ? productsData : (productsData.products || []);
      const finalDiscounts = Array.isArray(discountsData) ? discountsData : (discountsData.discounts || []);

      setProducts(finalProducts);
      setCategories(Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []));
      setDiscounts(finalDiscounts);
    } catch (error) { 
      toast.error("Gagal sinkronisasi data"); 
    } finally {
      setIsLoading(false); // Selesai Loading
    }
  };

  // LOGIC SIMPAN PESANAN
  const handleSaveOrder = async () => {
    if (cart.length === 0) return;

    const payload = {
      customer_name: customerName,
      items: cart,
      subtotal: subtotal,
      discount_amount: transactionDiscount,
      discount_name: discounts.find(d => d.id === selectedDiscountId)?.name || '',
      selected_discount_id: selectedDiscountId,
      total_amount: total
    };

    try {
      if (editingOrderId && !editingOrderId.startsWith('HOLD-')) {
        // --- UPDATE DI DATABASE ---
        await pendingOrdersAPI.update(editingOrderId, payload);
        toast.success(`Antrean ${customerName} diperbarui`);
      } else {
        // --- SIMPAN BARU KE DATABASE ---
        await pendingOrdersAPI.save(payload);
        toast.success(`Pesanan ${customerName} disimpan`);
      }

      // 1. Panggil fungsi refresh dari props (ini akan mengupdate state di App.tsx)
      await refreshPendingOrders(); 
      
      // 2. Bersihkan backup lokal supaya keranjang tidak muncul lagi setelah disimpan
      localStorage.removeItem('nex_pos_backup_cart');
      localStorage.removeItem('nex_pos_backup_discount');

      // 3. RESET STATE UI
      setCart([]);
      setCustomerName("");
      setEditingOrderId(null);
      setSelectedDiscountId('none');
      setShowSaveOrderDialog(false);

    } catch (error) {
      console.error("Save order error:", error);
      toast.error("Gagal simpan antrean ke database");
    }
  };

  const generateQRIS = async () => {
    // Cek nominal minimal Rp 1.000
    const cleanAmount = Math.floor(Number(total));
    if (cleanAmount < 1000) {
      toast.error("Minimal transaksi Rp 1.000");
      return;
    }

    setIsLoadingQR(true);
    setQrisUrl(null); // Reset QR lama

    // BUAT ID UNIK UNTUK TRANSAKSI INI
    const newOrderId = `NEX-${Date.now()}`;
    setCurrentOrderId(newOrderId);

    try {
      const { data, error } = await supabase.functions.invoke('create-qris-payment', {
        body: { 
          orderId: newOrderId,
          amount: cleanAmount 
        },
      });

      if (error) throw error;

      console.log("Respon Midtrans:", data);

      // Cari aksi untuk generate QR Code
      const qrAction = data.actions?.find((a: any) => a.name === 'generate-qr-code');
      
      if (qrAction && qrAction.url) {
        setQrisUrl(qrAction.url);
        toast.success("QRIS Berhasil Dibuat");
      } else {
        // Logic pesan ramah buat Kasir
        if (data.status_code === '402') {
          toast.error("Metode QRIS sedang diverifikasi Midtrans. Gunakan Tunai atau Qris Gopay.");
        } else {
          const errorMsg = data.status_message || "Gagal mendapatkan gambar QRIS";
          toast.error(`Midtrans: ${errorMsg}`);
        }
        console.error("Detail Respon:", data);
      }

    } catch (err: any) {
      console.error('Detail Error:', err);
      toast.error("Terjadi kesalahan koneksi pembayaran");
    } finally {
      setIsLoadingQR(false);
    }
  };

  useEffect(() => {
    // Fungsi untuk cek status ke Midtrans
    const checkStatus = async () => {
      if (!currentOrderId || paymentMethod !== 'qris') return;

      try {
        // Panggil Edge Function Supabase untuk cek status
        const { data } = await supabase.functions.invoke('check-payment-status', {
          body: { orderId: currentOrderId }
        });

        // Jika statusnya settlement (Berhasil Bayar)
        if (data?.transaction_status === 'settlement' || data?.transaction_status === 'capture') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          
          toast.success("PEMBAYARAN QRIS DITERIMA! MENCETAK STRUK...", { duration: 4000 });
          
          // PANGGIL FUNGSI PEMBAYARAN OTOMATIS KAMU
          processPayment(); 
        }
      } catch (err) {
        console.error("Polling Error:", err);
      }
    };

    // Jalankan polling jika modal bayar buka & metode QRIS terpilih
    if (showPaymentDialog && paymentMethod === 'qris' && qrisUrl) {
      pollingInterval.current = setInterval(checkStatus, 3000); // Cek tiap 3 detik
    }

    // Cleanup: Berhenti cek kalau modal ditutup atau ganti metode
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [showPaymentDialog, paymentMethod, qrisUrl, currentOrderId]);

  // Panggil generateQRIS saat paymentMethod berubah ke 'qris'
  useEffect(() => {
    if (paymentMethod === 'qris' && showPaymentDialog) {
      // Kosongkan QR lama dulu biar user nggak bingung
      setQrisUrl(null); 
      // Baru tembak yang baru
      generateQRIS();
    }
  }, [paymentMethod, showPaymentDialog]);

  // --- LOGIC PERHITUNGAN DISKON & HARGA ---
  const getEffectivePrice = (product: any) => {
    if (selectedDiscountId === 'none' || !discounts) return { price: product.price, hasDiscount: false };

    const activeDiscount = discounts.find(d => {
      // Kita cek apakah diskon ini yang sedang DIPILIH di dropdown kasir
      const isSelected = d.id === selectedDiscountId;
      
      const isProductMatch = (d.scope === 'product' || d.scope === 'item') && 
                            (d.product_id === product.id || d.productId === product.id);
      const isCategoryMatch = d.scope === 'category' && 
                              (d.category_id === product.category_id || d.categoryId === product.category_id);
      
      // Diskon berlaku jika dipilih dan scope-nya cocok (Produk/Kategori)
      return isSelected && (isProductMatch || isCategoryMatch);
    });

    if (!activeDiscount) return { price: product.price, hasDiscount: false };

    let discountedPrice = product.price;
    const val = parseFloat(activeDiscount.value);

    if (activeDiscount.value_type === 'percentage') {
      discountedPrice = product.price - (product.price * (val / 100));
    } else {
      discountedPrice = Math.max(0, product.price - val);
    }

    return { 
      price: discountedPrice, 
      hasDiscount: true, 
      originalPrice: product.price,
      label: activeDiscount.value_type === 'percentage' ? `${val}%` : `-${val/1000}K`
    };
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

  const addToCart = (product: any) => {
    const { price: effectivePrice } = getEffectivePrice(product);
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * effectivePrice } : item
      ));
    } else {
      setCart([...cart, { ...product, price: effectivePrice, quantity: 1, subtotal: effectivePrice }]);
    }
    // NOTIF TAMBAH
    toast.success(`${product.name} ditambah`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (delta > 0) toast.success(`Jumlah ${item.name} bertambah`);
        if (delta < 0 && item.quantity > 1) toast.info(`Jumlah ${item.name} berkurang`);
        return { ...item, quantity: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  const transactionDiscount = useMemo(() => {
    const disc = discounts.find(d => d.id === selectedDiscountId && d.scope === 'transaction');
    if (!disc) return 0;
    return disc.value_type === 'percentage' ? (subtotal * (disc.value / 100)) : disc.value;
  }, [subtotal, discounts, selectedDiscountId]);

  const total = Math.max(0, subtotal - transactionDiscount);
  const change = Math.max(0, (parseFloat(paidAmount) || 0) - total);

const processPayment = async () => {
    const inputBayar = parseFloat(paidAmount) || 0;

    // Ambil & Validasi data dari state/memo
    const activeDiscount = discounts.find(d => d.id === selectedDiscountId);
    const currentDiscountName = activeDiscount ? activeDiscount.name : 'Tanpa Diskon';
    const currentDiscountAmount = transactionDiscount; 
    const currentTotal = total;

    // Proteksi: Uang tunai kurang
    if (paymentMethod === 'cash' && inputBayar < currentTotal) {
      toast.error('Uang tunai kurang!');
      return;
    }

    // NORMALISASI: Memastikan string payment_method di DB konsisten untuk Dashboard
    // gopay (bisnis) tetap gopay, qris (midtrans) tetap qris, dst.
    const normalizedPaymentMethod = paymentMethod.toLowerCase();

    try {
      // Bungkus Payload untuk dikirim ke API
      const transactionPayload = {
        subtotal: subtotal,
        discount_amount: currentDiscountAmount, 
        discount_name: currentDiscountName, 
        total_amount: currentTotal,
        payment_method: normalizedPaymentMethod,
        paid_amount: paymentMethod === 'cash' ? inputBayar : currentTotal,
        change_amount: paymentMethod === 'cash' ? (inputBayar - currentTotal) : 0,
        customer_name: customerName || 'Pelanggan Umum',
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price_at_sale: item.price,
          // Hitung diskon per item jika ada (selisih harga asli vs harga jual di keranjang)
          discount_amount: (item.originalPrice || item.price) - item.price,
          subtotal: item.subtotal
        }))
      };

      // Simpan ke Database
      const response: any = await transactionsAPI.create(transactionPayload);
      
      // Ambil data hasil simpan (biasanya ada ID transaksi dari DB)
      const savedTransaction = response.transaction || response;

      // UPDATE STATE UNTUK LAYAR SUKSES DENGAN DATA LENGKAP
      setLastTransaction({
        ...savedTransaction,
        items: transactionPayload.items, // Paksa item masuk agar preview struk tidak kosong
        total_real_amount: subtotal
      }); 
      setIsSuccessMode(true);

      // LOGIKA CETAK STRUK
      handleGlobalPrint({
        ...savedTransaction,
        items: transactionPayload.items,
        payment_method: normalizedPaymentMethod,
        amount_paid: transactionPayload.paid_amount,
        change_amount: transactionPayload.change_amount,
        discount_name: currentDiscountName,    
        discount_amount: currentDiscountAmount,
        store_name: "SEBLAK MLEDAK"
      });

      // CLEAN UP & RESET STATE
      setShowPaymentDialog(false);
      setPaidAmount('');
      setQrisUrl(null);
      setCustomerName('');
      setSelectedDiscountId('none');

      // Jika transaksi ini berasal dari antrean (Pending Order), hapus dari DB
      if (editingOrderId && !editingOrderId.startsWith('HOLD-')) {
        await pendingOrdersAPI.delete(editingOrderId);
      }
      
      // Reset ID editing setelah sukses
      setEditingOrderId(null);

      // Refresh data antrean di Sidebar/Halaman Utama
      await refreshPendingOrders();

      // Bersihkan Backup LocalStorage (Gudang Browser)
      localStorage.removeItem('nex_pos_backup_cart');
      localStorage.removeItem('nex_pos_backup_discount');
      
      // Kosongkan keranjang di layar
      setCart([]);

      toast.success('TRANSAKSI BERHASIL!');

    } catch (error: any) { 
      console.error("❌ ERROR TRANSAKSI:", error);
      toast.error('Gagal: ' + (error.message || 'Terjadi kesalahan sistem')); 
    }
  };

  // --- TAMPILAN LOADING SINKRONISASI ---
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest animate-pulse">
          Sinkronisasi Menu Seblak...
        </p>
      </div>
    );
  }

  // --- INTERCEPTOR TAMPILAN SUKSES (KOMPONEN MEWAH) ---
  if (isSuccessMode && lastTransaction) {
    return (
      <SuccessTransactionPage 
        transaction={lastTransaction} 
        onBackToPOS={() => {
          setIsSuccessMode(false);
          setLastTransaction(null);
        }} 
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full gap-0 bg-gray-100 overflow-hidden animate-in fade-in duration-500">
      
      {/* PANEL KIRI: KATALOG */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r">
        <div className="p-4 border-b flex gap-3 items-center bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input 
              placeholder="Cari menu seblak..." 
              className="pl-9 bg-gray-50 border-none h-11 focus-visible:ring-1 focus-visible:ring-orange-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative min-w-[150px]">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-orange-500 z-10 pointer-events-none" />
            
            <select 
              className="pl-9 pr-10 h-11 w-full bg-orange-50 border-none rounded-md text-[11px] font-bold text-orange-700 appearance-none focus:ring-1 focus:ring-orange-500 cursor-pointer shadow-sm"
              value={selectedDiscountId}
              onChange={(e) => {
                setSelectedDiscountId(e.target.value); 
              }}
            >
              <option value="none">TANPA DISKON</option>
              {discounts
                .filter(d => d.is_active === true)
                .map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name.toUpperCase()}
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-orange-400 z-10 pointer-events-none" />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className={cn("size-9 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-orange-600" : "text-gray-400")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('list')}
              className={cn("size-9 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-orange-600" : "text-gray-400")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 border-b flex flex-wrap gap-2 bg-white">
          <Button 
            variant={selectedCategory === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedCategory('all')}
            className={cn("rounded-full text-[11px] font-bold px-4 h-8", selectedCategory === 'all' && "bg-orange-600")}
          >semua</Button>
          {categories.map(cat => (
            <Button 
              key={cat.id} 
              variant={selectedCategory === cat.id ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedCategory(cat.id)}
              className={cn("rounded-full text-[11px] font-bold px-4 h-8", selectedCategory === cat.id && "bg-orange-600")}
            >{cat.name.toLowerCase()}</Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className={cn(
            "grid gap-3",
            viewMode === 'grid' 
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" 
              : "grid-cols-1"
          )}>
            {filteredProducts.map(product => {
              const discInfo = getEffectivePrice(product);
              return (
                <Card 
                  key={product.id} 
                  className={cn(
                    "group flex overflow-hidden border-none shadow-sm hover:shadow-md transition-all cursor-pointer ring-1 ring-gray-100 bg-white relative",
                    viewMode === 'grid' ? "flex-col" : "flex-row h-24"
                  )}
                  onClick={() => addToCart(product)}
                >
                  {discInfo.hasDiscount && (
                    <div className="absolute top-2 right-2 z-50">
                      <Badge variant="destructive" className="bg-red-600 text-white text-[9px] px-2 py-0.5 font-bold">
                        {discInfo.label}
                      </Badge>
                    </div>
                  )}

                  <div className={cn(
                    "relative overflow-hidden bg-gray-50",
                    viewMode === 'grid' ? "aspect-square" : "h-full aspect-square w-24"
                  )}>
                    <img src={product.image_url || 'https://placehold.co/150'} className="size-full object-cover group-hover:scale-105 transition-transform" />
                  </div>

                  <CardContent className={cn(
                    "p-2 flex-1 flex flex-col justify-center",
                    viewMode === 'grid' ? "space-y-1" : "px-4 space-y-0"
                  )}>
                    <h3 className={cn(
                      "font-black text-gray-700 uppercase",
                      viewMode === 'grid' ? "text-[10px] truncate" : "text-sm"
                    )}>{product.name}</h3>
                    
                    <div className={cn(
                      "flex",
                      viewMode === 'grid' ? "flex-col" : "flex-row items-center justify-between"
                    )}>
                      <div className="flex flex-col">
                        {discInfo.hasDiscount && (
                          <span className="text-[9px] text-gray-400 line-through">{formatRupiah(discInfo.originalPrice)}</span>
                        )}
                        <span className="text-orange-600 font-black text-sm">{formatRupiah(discInfo.price)}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] text-gray-400 font-bold",
                        viewMode === 'list' ? "bg-gray-100 px-2 py-1 rounded-md" : ""
                      )}>
                        STOK: {product.stock_quantity}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* PANEL KANAN: KERANJANG */}
      <div className="w-[380px] flex flex-col bg-white border-l shadow-2xl relative">
        <div className="p-6 border-b bg-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-black text-xl tracking-tighter text-gray-800 uppercase leading-none">KERANJANG</h2>
              {/* TOMBOL CLEAR ALL */}
              {cart.length > 0 && (
                <button 
                  onClick={() => {
                    toast("Kosongkan Keranjang?", {
                      description: "Semua item yang sudah diinput akan dihapus permanen.",
                      action: {
                        label: "YA, HAPUS",
                        onClick: () => {
                          setCart([]);
                          toast.success("Keranjang telah dikosongkan");
                        },
                      },
                      cancel: {
                        label: "BATAL",
                        onClick: () => console.log("Batal hapus"),
                      },
                    });
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black text-red-500 hover:bg-red-50 border border-red-100 transition-all uppercase"
                >
                  <Trash2 className="size-3" />
                  Kosongkan
                </button>
              )}
            </div>

            <Badge variant="outline" className="border-orange-200 text-orange-600 font-black text-[10px]">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
            </Badge>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest uppercase">Detail Pesanan Pelanggan</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
              <ShoppingBag className="size-16 mb-2" />
              <p className="text-xs font-black">KOSONG</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map(item => (
                <div key={item.id} className="py-4 flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                  <img src={item.image_url} className="size-12 rounded-xl object-cover shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-800 truncate uppercase tracking-tighter">{item.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="size-6 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 hover:bg-orange-100 hover:text-orange-600 transition-colors"><Minus className="size-3" /></button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="size-6 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 hover:bg-orange-100 hover:text-orange-600 transition-colors"><Plus className="size-3" /></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">{formatRupiah(item.subtotal)}</p>
                    <button onClick={() => {
                        setCart(cart.filter(i => i.id !== item.id));
                        toast.error(`${item.name} dihapus`);
                    }} className="text-red-400 mt-1 hover:text-red-600 transition-colors"><Trash2 className="size-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t space-y-3 shadow-inner">
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Subtotal</span>
              <span className="text-xs font-bold text-gray-600">{formatRupiah(subtotal)}</span>
            </div>
            {transactionDiscount > 0 && (
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-red-500 uppercase italic">Potongan Transaksi</span>
                <span className="text-xs font-bold text-red-500">-{formatRupiah(transactionDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-1 pt-1 border-t border-dashed">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Grand Total</span>
              <span className="font-black text-orange-600 text-2xl tracking-tighter">{formatRupiah(total)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              disabled={cart.length === 0}
              onClick={() => setShowSaveOrderDialog(true)}
              className="flex-1 h-14 border-orange-200 text-orange-600 hover:bg-orange-50 rounded-2xl font-black text-[10px] tracking-tighter transition-all"
            >
              SIMPAN
            </Button>
            <Button 
              disabled={cart.length === 0}
              onClick={() => setShowPaymentDialog(true)}
              className="flex-[2] h-14 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-sm tracking-tighter shadow-lg shadow-orange-100 transition-all active:scale-95"
            >
              BAYAR SEKARANG
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL SIMPAN PESANAN */}
      <Dialog open={showSaveOrderDialog} onOpenChange={setShowSaveOrderDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-[32px] border-none">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-xl">Simpan Pesanan</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nama Pelanggan / Nomor Meja</Label>
            <Input 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-14 bg-gray-50 border-none rounded-2xl text-lg font-black focus-visible:ring-2 focus-visible:ring-orange-600"
              placeholder="Masukkan Nama..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveOrder} className="w-full h-14 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-sm">
              KONFIRMASI SIMPAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL LIST PESANAN DISIMPAN - UI CLEAN & MODERN */}
      <Dialog open={showPendingListDialog} onOpenChange={setShowPendingListDialog}>
        <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl h-[650px] bg-white">
          
          <DialogHeader className="sr-only">
            <DialogTitle>Daftar Antrean Pesanan</DialogTitle>
          </DialogHeader>

          <div className="flex h-full">
            <div className="w-[350px] bg-[#f8f9fa] border-r flex flex-col">
              <div className="p-7 bg-white border-b">
                <h3 className="font-black text-lg uppercase text-gray-800 tracking-tighter">Antrean Meja</h3>
                <p className="text-[11px] text-orange-600 font-black uppercase tracking-widest mt-1">
                  {pendingOrders.length} Pesanan Belum Bayar
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {pendingOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale">
                    <ShoppingBag className="size-12 mb-2" />
                    <p className="text-[10px] font-black uppercase">Belum Ada Antrean</p>
                  </div>
                ) : (
                  pendingOrders.map((order: any) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedPendingOrder(order)}
                      className={cn(
                        "w-full p-5 rounded-2xl text-left transition-all flex flex-col gap-1 border-2 relative group",
                        selectedPendingOrder?.id === order.id 
                          ? "border-orange-600 bg-white shadow-xl shadow-orange-100/50" 
                          : "border-gray-100 bg-white hover:border-orange-300 hover:bg-orange-50/50 active:scale-[0.98]" 
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-black text-sm uppercase text-gray-800 truncate pr-2">
                          {order.customer_name || "Tanpa Nama"}
                        </p>
                        <p className="font-black text-xs text-orange-600 whitespace-nowrap">
                          {formatRupiah(order.total_amount || 0)}
                        </p>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="size-3" />
                        {order.created_at ? new Date(order.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '--:--'} • {order.items?.length || 0} Menu
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 bg-white flex flex-col p-8 h-full max-h-[650px]">
              {selectedPendingOrder ? (
                <>
                  <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                      <h2 className="font-black text-3xl uppercase text-gray-900 leading-none">
                        {selectedPendingOrder.customer_name}
                      </h2>
                      <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                        <List className="size-3" />
                        Rincian Pesanan Pelanggan
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setOrderToDelete(selectedPendingOrder);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                    >
                      <Trash2 className="size-6" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 border-y py-6 my-2 custom-scrollbar min-h-0">
                    {selectedPendingOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between font-bold text-sm text-gray-700 items-center bg-gray-50 p-3 rounded-xl">
                        <div className="flex flex-col">
                          <span className="uppercase text-xs tracking-tight">{item.name}</span>
                          <span className="text-[10px] text-gray-400">{item.quantity} x {formatRupiah(item.price)}</span>
                        </div>
                        <span className="font-black">{formatRupiah(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 space-y-4 flex-shrink-0 bg-white">
                    <div className="flex justify-between items-center font-black">
                      <span className="text-gray-400 text-xs uppercase tracking-widest">Total Tagihan</span>
                      <span className="text-4xl text-orange-600 tracking-tighter">
                        {formatRupiah(selectedPendingOrder.total_amount || 0)}
                      </span>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          setCart(selectedPendingOrder.items || []);
                          setSelectedDiscountId(selectedPendingOrder.selected_discount_id || 'none');
                          setCustomerName(selectedPendingOrder.customer_name); 
                          setEditingOrderId(selectedPendingOrder.id); 
                          setShowPendingListDialog(false);
                          toast.info(`Mengedit: ${selectedPendingOrder.customer_name}`);
                        }}
                        className="flex-1 h-14 bg-gray-100 text-gray-800 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95 border-none"
                      >
                        EDIT / TAMBAH
                      </Button>
                      <Button 
                        onClick={() => {
                          setCart(selectedPendingOrder.items || []);
                          setSelectedDiscountId(selectedPendingOrder.selected_discount_id || 'none');
                          setEditingOrderId(selectedPendingOrder.id); 
                          setCustomerName(selectedPendingOrder.customer_name);
                          setShowPendingListDialog(false);
                          setShowPaymentDialog(true);
                        }}
                        className="flex-[1.5] h-14 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all active:scale-95 border-none shadow-lg shadow-orange-100"
                      >
                        BAYAR SEKARANG
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="size-10 opacity-20" />
                  </div>
                  <p className="font-black uppercase tracking-widest text-[10px]">Pilih antrean untuk melihat detail</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center rounded-[32px] border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <div className="size-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="size-10" />
          </div>
          <h2 className="font-black text-xl uppercase tracking-tighter text-gray-800">Hapus Antrean?</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Pesanan atas nama <span className="font-bold text-gray-800">"{orderToDelete?.customer_name || 'Pelanggan'}"</span> akan dihapus permanen.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-12 rounded-2xl font-black">BATAL</Button>
            <Button 
              className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all active:scale-95"
              onClick={async () => {
                try {
                  await pendingOrdersAPI.delete(orderToDelete.id);
                  await refreshPendingOrders();
                  setShowDeleteConfirm(false);
                  setSelectedPendingOrder(null);
                  toast.success("Antrean berhasil dihapus");
                } catch (err) { toast.error("Gagal menghapus antrean"); }
              }}
            >YA, HAPUS</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PEMBAYARAN */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300">
          <DialogHeader className="sr-only">
             <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex h-[580px]">
            
            <div className="w-[300px] bg-gray-50 flex flex-col border-r border-gray-100">
              <div className="bg-orange-600 p-8 text-white text-center">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-70 mb-1 text-orange-100">Total Tagihan</p>
                <h2 className="text-3xl font-black tracking-tighter leading-none">{formatRupiah(total)}</h2>
              </div>

              <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metode Pembayaran</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: 'cash', label: 'TUNAI / CASH', icon: Banknote },
                    { id: 'qris', label: 'QRIS', icon: CreditCard },
                    { id: 'gopay', label: 'QRIS GOPAY BUSINESS', icon: Smartphone },
                    { id: 'transfer', label: 'BANK TRANSFER', icon: Wallet }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setPaymentMethod(m.id);
                        setPaidAmount(total.toString());
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group",
                        paymentMethod === m.id 
                          ? "border-orange-600 bg-white text-orange-600 shadow-sm" 
                          : "border-transparent bg-white text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        paymentMethod === m.id ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                      )}>
                        <m.icon className="size-5" />
                      </div>
                      <span className="text-[11px] font-black tracking-tight">{m.label}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'cash' && parseFloat(paidAmount) >= total && (
                  <div className="p-4 bg-green-600 rounded-2xl text-white shadow-lg shadow-green-100 animate-in slide-in-from-bottom-2">
                    <span className="text-[9px] font-black opacity-60 tracking-widest block mb-1">KEMBALIAN</span>
                    <span className="text-xl font-black leading-none">{formatRupiah(change)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-white p-6 flex flex-col h-full justify-between">
              {paymentMethod === 'cash' ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Jumlah Bayar</p>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg pointer-events-none">Rp</span>
                      <Input 
                        type="text"
                        value={new Intl.NumberFormat('id-ID').format(Number(paidAmount) || 0)}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setPaidAmount(val);
                        }}
                        className="h-14 pl-12 pr-5 text-3xl font-black bg-gray-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-600 text-gray-900 shadow-inner"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => setPaidAmount(prev => prev + num.toString())}
                        className="h-11 rounded-xl bg-gray-50 font-black text-lg text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 border border-gray-100"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => setPaidAmount('')}
                      className="h-11 rounded-xl bg-red-50 font-black text-[9px] text-red-600 hover:bg-red-100 transition-all border border-red-100"
                    >
                      CLEAR
                    </button>
                    <button
                      onClick={() => setPaidAmount(prev => prev + '0')}
                      className="h-11 rounded-xl bg-gray-50 font-black text-lg text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all border border-gray-100"
                    >
                      0
                    </button>
                    <button
                      onClick={() => setPaidAmount(prev => prev.slice(0, -1))}
                      className="h-11 rounded-xl bg-orange-50 font-black text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center border border-orange-100"
                    >
                      <Delete className="size-5" />
                    </button>
                    
                    <button
                      onClick={() => setPaidAmount(prev => prev + '000')}
                      className="col-span-3 h-8 rounded-xl bg-gray-100 font-black text-[9px] text-gray-500 hover:bg-gray-200 transition-all uppercase tracking-widest border border-gray-200"
                    >
                      +000 (Ribuan)
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    {[total, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setPaidAmount(amt.toString())}
                        className="flex-1 h-9 rounded-xl border border-gray-200 text-[9px] font-black text-gray-500 hover:border-orange-600 hover:text-orange-600 transition-all bg-white"
                      >
                        {amt === total ? 'UANG PAS' : formatRupiah(amt).replace(',00', '').replace('Rp', '')}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                   {paymentMethod === 'gopay' ? (
                     <div className="space-y-4 animate-in zoom-in-95 duration-500">
                        <div className="relative p-3 bg-white border-4 border-[#00aade] rounded-[40px] shadow-2xl mx-auto w-fit">
                          <img src="/qris-gopay.jpg" alt="QRIS GoPay" className="size-80 object-contain rounded-2xl" />
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#00aade] px-4 py-1.5 rounded-full border-2 border-white shadow-md">
                             <span className="text-[10px] font-black text-white uppercase tracking-wider">GoPay Business</span>
                          </div>
                        </div>
                        <h3 className="font-black text-xl uppercase tracking-tighter text-gray-800 leading-none">Scan QRIS GoPay</h3>
                     </div>
                   ) : (
                     <div className="w-full flex flex-col items-center">
                        {isLoadingQR ? (
                          <div className="flex flex-col items-center gap-3 animate-in fade-in">
                            <Loader2 className="size-12 animate-spin text-orange-600" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Generating QRIS Midtrans...</p>
                          </div>
                        ) : qrisUrl ? (
                          <div className="space-y-6 animate-in zoom-in-95 duration-500 flex flex-col items-center">
                            <div className="relative p-3 bg-white border-4 border-gray-900 rounded-[32px] shadow-2xl mx-auto w-fit">
                              <img src={qrisUrl} alt="QRIS Midtrans" className="size-48 object-contain rounded-xl" />
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-1.5 rounded-full border-2 border-white shadow-lg flex items-center gap-2 min-w-[140px] justify-center z-10">
                                <div className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </div>
                                <span className="text-[9px] font-black text-white uppercase tracking-tighter">Auto Checking...</span>
                              </div>
                            </div>
                            <h3 className="font-black text-xl uppercase tracking-tighter text-gray-800 leading-none">Scan QRIS Midtrans</h3>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-center">
                            <div className="size-24 bg-orange-50 rounded-[32px] flex items-center justify-center animate-pulse border-2 border-orange-100 border-dashed">
                              <CreditCard className="size-10 text-orange-600" />
                            </div>
                            <h3 className="font-black text-lg uppercase tracking-tight text-gray-800 leading-none">Menunggu QRIS</h3>
                          </div>
                        )}
                     </div>
                   )}
                   <div className="bg-gray-100 px-4 py-2 rounded-2xl border border-gray-200 font-black text-orange-600">{formatRupiah(total)}</div>
                </div>
              )}

              <div className="pt-2">
                <Button 
                  onClick={processPayment}
                  disabled={paymentMethod === 'cash' && (parseFloat(paidAmount) < total || !paidAmount)}
                  className="w-full h-14 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-sm tracking-tighter shadow-lg shadow-orange-100 transition-all active:scale-95"
                >
                  KONFIRMASI & CETAK STRUK
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}