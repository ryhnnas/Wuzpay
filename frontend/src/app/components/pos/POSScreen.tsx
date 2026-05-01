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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/app/components/ui/select';
import { productsAPI, transactionsAPI, categoriesAPI, discountsAPI, pendingOrdersAPI, ingredientsAPI } from '@/services/api';
import { toast } from 'sonner';
// HAPUS SUPABASE CLIENT KARENA SUDAH PAKAI MONGO DB
import { handleGlobalPrint } from '@/app/components/utils/printHandler';
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
  pendingOrders = [], 
  setPendingOrders, 
  showPendingListDialog, 
  setShowPendingListDialog,
  refreshPendingOrders 
}: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
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

  // STATE UNTUK CHECK STATUS SIMULASI TRANSAKSI
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
      if (!editingOrderId) {
        setCustomerName(`Customer-${pendingOrders.length + 1}`);
      }
    }
  }, [showSaveOrderDialog, pendingOrders.length, editingOrderId]);

  // 1. TAMBAHKAN EFFECT INI DI POSScreen.tsx
  useEffect(() => {
    const savedCart = localStorage.getItem('nex_pos_backup_cart');
    const savedDiscount = localStorage.getItem('nex_pos_backup_discount');
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart.length > 0) {
          setCart(parsedCart);
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
    if (cart.length > 0) {
      localStorage.setItem('nex_pos_backup_cart', JSON.stringify(cart));
      localStorage.setItem('nex_pos_backup_discount', selectedDiscountId);
    } else {
      localStorage.removeItem('nex_pos_backup_cart');
      localStorage.removeItem('nex_pos_backup_discount');
    }
  }, [cart, selectedDiscountId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, discountsData, ingredientsData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        discountsAPI.getAll(),
        ingredientsAPI.getAll()
      ]);

      const finalProducts = Array.isArray(productsData) ? productsData : (productsData.products || []);
      const finalDiscounts = Array.isArray(discountsData) ? discountsData : (discountsData.discounts || []);

      setProducts(finalProducts);
      setCategories(Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []));
      setDiscounts(finalDiscounts);
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : []);
    } catch (error) { 
      toast.error("Gagal sinkronisasi data"); 
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAvailability = (product: any) => {
    const recipe = product.recipe || [];
    const directStock = Number(product.stock_quantity ?? product.stock ?? 0);

    // Jika ada stok langsung, gunakan itu
    if (directStock > 0) return { count: directStock, type: 'item' };

    // Jika tidak ada stok langsung tapi ada resep, hitung porsi
    if (recipe.length > 0) {
      let minPortions = Infinity;
      for (const r of recipe) {
        const amountNeeded = Number(r.amount_needed) || 1;
        const ing = r.ingredient_id?._id
          ? r.ingredient_id
          : ingredients.find((i: any) => (i._id || i.id) === r.ingredient_id);

        if (!ing) { minPortions = 0; break; }
        const stock = Number(ing.stock_quantity ?? ing.stock ?? 0);
        const portions = Math.floor(stock / amountNeeded);
        minPortions = Math.min(minPortions, portions);
      }
      return { 
        count: minPortions === Infinity ? 0 : minPortions, 
        type: 'porsi' 
      };
    }

    // Fallback jika tidak ada dua-duanya
    return { count: directStock, type: 'item' };
  };

  const handleSaveOrder = async () => {
    if (cart.length === 0) return;

    const payload = {
      customer_name: customerName,
      items: cart,
      subtotal: subtotal,
      discount_amount: transactionDiscount,
      discount_name: discounts.find(d => (d._id || d.id) === selectedDiscountId)?.name || '',
      selected_discount_id: selectedDiscountId,
      total_amount: total
    };

    try {
      if (editingOrderId && !editingOrderId.startsWith('HOLD-')) {
        await pendingOrdersAPI.update(editingOrderId, payload);
        toast.success(`Antrean ${customerName} diperbarui`);
      } else {
        await pendingOrdersAPI.save(payload);
        toast.success(`Pesanan ${customerName} disimpan`);
      }

      await refreshPendingOrders(); 
      localStorage.removeItem('nex_pos_backup_cart');
      localStorage.removeItem('nex_pos_backup_discount');

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
    const cleanAmount = Math.floor(Number(total));
    if (cleanAmount < 1000) {
      toast.error("Minimal transaksi Rp 1.000");
      return;
    }

    setIsLoadingQR(true);
    setQrisUrl(null); 

    const newOrderId = `WUZ-${Date.now()}`;
    setCurrentOrderId(newOrderId);

    // MENGGUNAKAN SIMULASI QRIS UNTUK TUGAS
    setTimeout(() => {
      const simulationUrl = paymentMethod === 'gopay' 
        ? '/qris-gopay.jpg' 
        : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SIMULASI-${newOrderId}`;
      
      setQrisUrl(simulationUrl);
      setIsLoadingQR(false);
      toast.success("QRIS Simulasi Dibuat");
    }, 800);
  };

  useEffect(() => {
    if (paymentMethod === 'qris' && showPaymentDialog) {
      setQrisUrl(null); 
      generateQRIS();
    }
  }, [paymentMethod, showPaymentDialog]);

  const getEffectivePrice = (product: any) => {
    const pId = product._id || product.id;
    if (selectedDiscountId === 'none' || !discounts) return { price: product.price, hasDiscount: false };

    const activeDiscount = discounts.find(d => {
      const dId = d._id || d.id;
      const isSelected = dId === selectedDiscountId;
      
      const isProductMatch = (d.scope === 'product' || d.scope === 'item') && 
                            (d.product_id === pId || d.productId === pId);
      const isCategoryMatch = d.scope === 'category' && 
                              (d.category_id === (product.category_id?._id || product.category_id));
      
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
    const catId = product.category_id?._id || product.category_id;
    const matchesCategory = selectedCategory === 'all' || catId === selectedCategory;
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

  const addToCart = (product: any) => {
    const pId = product._id || product.id;
    const { price: effectivePrice } = getEffectivePrice(product);
    const existingItem = cart.find(item => (item._id || item.id) === pId);
    
    if (existingItem) {
      setCart(cart.map(item =>
        (item._id || item.id) === pId ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * effectivePrice } : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        _id: pId, 
        id: pId, 
        price: effectivePrice, 
        quantity: 1, 
        subtotal: effectivePrice 
      }]);
    }
    toast.success(`${product.name} ditambah`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      const pId = item._id || item.id;
      if (pId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  const transactionDiscount = useMemo(() => {
    const disc = discounts.find(d => (d._id || d.id) === selectedDiscountId && d.scope === 'transaction');
    if (!disc) return 0;
    return disc.value_type === 'percentage' ? (subtotal * (disc.value / 100)) : disc.value;
  }, [subtotal, discounts, selectedDiscountId]);

  const total = Math.max(0, subtotal - transactionDiscount);
  const change = Math.max(0, (parseFloat(paidAmount) || 0) - total);

const processPayment = async () => {
    const inputBayar = parseFloat(paidAmount) || 0;
    const activeDiscount = discounts.find(d => (d._id || d.id) === selectedDiscountId);
    const currentDiscountName = activeDiscount ? activeDiscount.name : 'Tanpa Diskon';
    const currentDiscountAmount = transactionDiscount; 
    const currentTotal = total;

    if (paymentMethod === 'cash' && inputBayar < currentTotal) {
      toast.error('Uang tunai kurang!');
      return;
    }

    const normalizedPaymentMethod = paymentMethod.toLowerCase();

    try {
      const transactionPayload = {
        subtotal: subtotal,
        discount_amount: currentDiscountAmount, 
        discount_name: currentDiscountName, 
        total_amount: currentTotal,
        total_real_amount: subtotal, // MAPPING KE MONGO FIELD
        payment_method: normalizedPaymentMethod,
        paid_amount: paymentMethod === 'cash' ? inputBayar : currentTotal,
        change_amount: paymentMethod === 'cash' ? (inputBayar - currentTotal) : 0,
        customer_name: customerName || 'Pelanggan Umum',
        items: cart.map(item => ({
          product_id: item._id || item.id,
          name: item.name,
          quantity: item.quantity,
          price_at_sale: item.price,
          cost_at_sale: item.cost_price || 0, // MENGAMBIL COST_PRICE DARI MONGO
          discount_amount: (item.originalPrice || item.price) - item.price,
          category_name: item.category_id?.name || "Umum",
          total_amount: item.subtotal
        }))
      };

      const response: any = await transactionsAPI.create(transactionPayload);
      const savedTransaction = response.transaction || response;

      setLastTransaction({
        ...savedTransaction,
        items: transactionPayload.items,
        total_real_amount: subtotal
      }); 
      setIsSuccessMode(true);

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

      setShowPaymentDialog(false);
      setPaidAmount('');
      setQrisUrl(null);
      setCustomerName('');
      setSelectedDiscountId('none');

      if (editingOrderId && !editingOrderId.startsWith('HOLD-')) {
        await pendingOrdersAPI.delete(editingOrderId);
      }
      
      setEditingOrderId(null);
      await refreshPendingOrders();
      localStorage.removeItem('nex_pos_backup_cart');
      localStorage.removeItem('nex_pos_backup_discount');
      setCart([]);
      toast.success('TRANSAKSI BERHASIL!');

    } catch (error: any) { 
      console.error("❌ ERROR TRANSAKSI:", error);
      toast.error('Gagal simpan transaksi'); 
    }
  };

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
              placeholder="Cari menu..." 
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
              onChange={(e) => setSelectedDiscountId(e.target.value)}
            >
              <option value="none">TANPA DISKON</option>
              {discounts
                .filter(d => d.is_active === true)
                .map(d => (
                  <option key={d._id || d.id} value={d._id || d.id}>
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
          {categories.map(cat => {
            const catId = cat._id || cat.id;
            return (
              <Button 
                key={catId} 
                variant={selectedCategory === catId ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setSelectedCategory(catId)}
                className={cn("rounded-full text-[11px] font-bold px-4 h-8", selectedCategory === catId && "bg-orange-600")}
              >{cat.name.toLowerCase()}</Button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className={cn(
            "grid gap-3",
            viewMode === 'grid' 
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
              : "grid-cols-1"
          )}>
            {filteredProducts.map(product => {
              const discInfo = getEffectivePrice(product);
              const productId = product._id || product.id;
              return (
                <Card 
                  key={productId} 
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
                    
                    <div className="flex flex-col">
                      {discInfo.hasDiscount && (
                        <span className="text-[9px] text-gray-400 line-through">{formatRupiah(discInfo.originalPrice)}</span>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <span className="text-orange-600 font-black text-sm">{formatRupiah(discInfo.price)}</span>
                        {(() => {
                          const { count, type } = calculateAvailability(product);
                          return (
                            <div className="flex flex-col items-end">
                              <Badge variant={count === 0 ? "destructive" : "outline"} className={cn(
                                "text-[8px] px-1.5 py-0 h-4 font-black border-none",
                                count === 0 ? "bg-red-500 text-white" : count <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              )}>
                                {count === 0 ? 'HABIS' : count}
                              </Badge>
                              <span className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">{type}</span>
                            </div>
                          );
                        })()}
                      </div>
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
            <h2 className="font-black text-xl tracking-tighter text-gray-800 uppercase leading-none">KERANJANG</h2>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black text-red-500 hover:bg-red-50 border border-red-100 transition-all uppercase"
              >
                <Trash2 className="size-3" /> Kosongkan
              </button>
            )}
          </div>
          <Badge variant="outline" className="border-orange-200 text-orange-600 font-black text-[10px] mt-2 italic">{cart.length} ITEMS SELECTED</Badge>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20 mt-20">
              <ShoppingBag className="size-16 mb-2" />
              <p className="text-xs font-black">KOSONG</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map(item => {
                const itemId = item._id || item.id;
                return (
                  <div key={itemId} className="py-4 flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                    <img src={item.image_url} className="size-12 rounded-xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-gray-800 truncate uppercase tracking-tighter">{item.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(itemId, -1)} className="size-6 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-orange-100 transition-colors"><Minus className="size-3" /></button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(itemId, 1)} className="size-6 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-orange-100 transition-colors"><Plus className="size-3" /></button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-orange-600">{formatRupiah(item.subtotal)}</p>
                      <button onClick={() => setCart(cart.filter(i => (i._id || i.id) !== itemId))} className="text-red-400 mt-1 hover:text-red-600 transition-colors"><Trash2 className="size-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t space-y-3 shadow-inner">
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1"><span className="text-[9px] font-bold text-gray-400 uppercase">Subtotal</span><span className="text-xs font-bold text-gray-600">{formatRupiah(subtotal)}</span></div>
            {transactionDiscount > 0 && <div className="flex justify-between items-center px-1"><span className="text-[9px] font-bold text-red-500 uppercase italic">Potongan</span><span className="text-xs font-bold text-red-500">-{formatRupiah(transactionDiscount)}</span></div>}
            <div className="flex justify-between items-center px-1 pt-1 border-t border-dashed"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Grand Total</span><span className="font-black text-orange-600 text-2xl tracking-tighter">{formatRupiah(total)}</span></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={cart.length === 0} onClick={() => setShowSaveOrderDialog(true)} className="flex-1 h-14 border-orange-200 text-orange-600 hover:bg-orange-50 rounded-2xl font-black text-[10px] tracking-tighter transition-all uppercase">SIMPAN</Button>
            <Button disabled={cart.length === 0} onClick={() => setShowPaymentDialog(true)} className="flex-[2] h-14 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-sm tracking-tighter shadow-lg shadow-orange-100 transition-all active:scale-95 uppercase">BAYAR</Button>
          </div>
        </div>
      </div>

      {/* MODAL LIST ANTREAN (MEJA) - VERSI RAPIH */}
      <Dialog open={showPendingListDialog} onOpenChange={setShowPendingListDialog}>
        <DialogContent className="sm:max-w-[950px] p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl h-[650px]">
          <DialogHeader className="hidden">
            <DialogTitle>Daftar Antrean</DialogTitle>
            <DialogDescription>Kelola pesanan tertunda</DialogDescription>
          </DialogHeader>
          <div className="flex h-full">
            {/* SISI KIRI: DAFTAR NAMA */}
            <div className="w-[360px] bg-gray-50 border-r p-8 flex flex-col">
               <h3 className="font-black text-xl uppercase italic mb-6 text-orange-600 tracking-tighter underline decoration-orange-500 decoration-4">Daftar Meja</h3>
               <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                 {pendingOrders.map((order: any) => {
                   const oId = order._id || order.id;
                   return (
                     <button key={`pending-${oId}`} onClick={() => setSelectedPendingOrder(order)} className={cn("w-full p-5 rounded-[24px] text-left transition-all border-2 flex flex-col gap-1", (selectedPendingOrder?._id || selectedPendingOrder?.id) === oId ? "border-orange-600 bg-white shadow-xl scale-[1.02]" : "border-gray-100 bg-white hover:border-orange-200")}>
                        <div className="flex justify-between items-start">
                          <p className="font-black text-sm uppercase text-gray-800 italic truncate">{order.customer_name}</p>
                          <p className="font-black text-xs text-orange-600">{formatRupiah(order.total_amount)}</p>
                        </div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{order.items?.length || 0} Menu Tersimpan</p>
                     </button>
                   );
                 })}
               </div>
            </div>

            {/* SISI KANAN: DETAIL & ACTION */}
            <div className="flex-1 p-10 flex flex-col justify-between bg-white relative">
               {selectedPendingOrder ? (
                 <>
                   <div className="overflow-y-auto flex-1 custom-scrollbar pr-4">
                     <div className="flex justify-between items-start mb-8">
                        <div>
                          <h2 className="font-black text-4xl uppercase italic text-orange-600 leading-none">{selectedPendingOrder.customer_name}</h2>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Detail Pesanan Pelanggan</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setOrderToDelete(selectedPendingOrder); setShowDeleteConfirm(true); }} 
                          className="size-12 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 className="size-6" />
                        </Button>
                     </div>
                     <div className="space-y-3">
                       {selectedPendingOrder.items?.map((item: any, idx: number) => (
                         <div key={`item-${selectedPendingOrder._id}-${idx}`} className="flex justify-between items-center p-4 bg-gray-50 rounded-[20px] border border-gray-100 shadow-sm">
                            <div className="flex flex-col">
                              <span className="font-black text-xs uppercase text-gray-700 italic">{item.name}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{item.quantity}x @ {formatRupiah(item.price)}</span>
                            </div>
                            <span className="font-black text-sm text-orange-600">{formatRupiah(item.subtotal)}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   <div className="pt-8 border-t-4 border-dashed border-gray-50 mt-6 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="font-black uppercase text-gray-400 text-xs tracking-widest">Tagihan</span>
                        <span className="font-black text-4xl text-orange-600 tracking-tighter">{formatRupiah(selectedPendingOrder.total_amount)}</span>
                      </div>
                      <div className="flex gap-4">
                         <Button onClick={() => { setCart(selectedPendingOrder.items); setCustomerName(selectedPendingOrder.customer_name); setEditingOrderId(selectedPendingOrder._id || selectedPendingOrder.id); setShowPendingListDialog(false); }} className="flex-1 h-16 bg-gray-100 text-orange-600 rounded-[24px] font-black hover:bg-gray-200 uppercase text-[10px] tracking-widest">Edit</Button>
                         <Button onClick={() => { setCart(selectedPendingOrder.items); setEditingOrderId(selectedPendingOrder._id || selectedPendingOrder.id); setCustomerName(selectedPendingOrder.customer_name); setShowPendingListDialog(false); setShowPaymentDialog(true); }} className="flex-[1.5] h-16 bg-orange-600 text-white rounded-[24px] font-black shadow-2xl shadow-orange-100 uppercase text-[10px] tracking-widest">Bayar</Button>
                      </div>
                   </div>
                 </>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale text-center">
                   <ShoppingBag className="size-32 mb-4" />
                   <p className="font-black text-sm uppercase tracking-widest italic">Pilih antrean untuk melihat rincian</p>
                 </div>
               )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS - MONGODB COMPATIBLE */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center rounded-[32px] border-none shadow-2xl bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Konfirmasi Hapus Antrean</DialogTitle>
            <DialogDescription>Menghapus pesanan terpilih secara permanen</DialogDescription>
          </DialogHeader>
          <div className="size-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="size-10" />
          </div>
          <h2 className="font-black text-xl uppercase tracking-tighter text-gray-800">Hapus Antrean?</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Pesanan atas nama <span className="font-bold text-orange-600 italic">"{orderToDelete?.customer_name || 'Pelanggan'}"</span> akan dihapus permanen.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-12 rounded-2xl font-black text-[10px] uppercase">BATAL</Button>
            <Button 
              className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all active:scale-95 text-[10px] uppercase"
              onClick={async () => {
                try {
                  // KUNCI MONGO: Gunakan _id jika .id tidak ada
                  const idToDel = orderToDelete?._id || orderToDelete?.id;
                  if (!idToDel) return;
                  
                  await pendingOrdersAPI.delete(idToDel);
                  await refreshPendingOrders();
                  setShowDeleteConfirm(false);
                  setSelectedPendingOrder(null);
                  toast.success("Antrean berhasil dihapus");
                } catch (err) { 
                  toast.error("Gagal menghapus antrean"); 
                }
              }}
            >YA, HAPUS</Button>
          </div>
        </DialogContent>
      </Dialog>

     {/* MODAL PEMBAYARAN - VERSI TOMBOL NOMINAL CEPAT */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[800px] p-0 border-none rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <DialogHeader className="hidden">
            <DialogTitle>Pembayaran</DialogTitle>
            <DialogDescription>Pilih metode dan masukkan nominal</DialogDescription>
          </DialogHeader>
          <div className="flex h-[580px]">
            <div className="w-[300px] bg-gray-50 flex flex-col border-r">
              <div className="bg-orange-600 p-8 text-white text-center shadow-lg">
                <p className="text-[10px] uppercase font-black opacity-70 mb-1 tracking-widest text-orange-100">Total Tagihan</p>
                <h2 className="text-3xl font-black tracking-tighter leading-none italic">{formatRupiah(total)}</h2>
              </div>
              <div className="p-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Metode Pembayaran</p>
                {['cash', 'qris', 'gopay', 'transfer'].map(m => (
                  <button key={m} onClick={() => { setPaymentMethod(m); setPaidAmount(total.toString()); }} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group", paymentMethod === m ? "border-orange-600 bg-white text-orange-600 shadow-sm" : "border-transparent bg-white text-gray-400 hover:bg-gray-100 shadow-sm")}>
                    {m === 'cash' ? <Banknote className="size-4"/> : m === 'qris' ? <CreditCard className="size-4"/> : m === 'gopay' ? <Smartphone className="size-4"/> : <Wallet className="size-4"/>}
                    <span className="text-[10px] font-black uppercase tracking-tighter">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white p-6 flex flex-col justify-between">
              {paymentMethod === 'cash' ? (
                <div className="space-y-4 font-sans">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase px-1">Jumlah Bayar</p>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">Rp</span>
                      <Input type="text" value={new Intl.NumberFormat('id-ID').format(Number(paidAmount) || 0)} onChange={(e) => setPaidAmount(e.target.value.replace(/\D/g, ''))} className="h-14 pl-12 pr-5 text-3xl font-black bg-gray-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-600 shadow-inner" autoFocus />
                    </div>
                  </div>

                  {/* TOMBOL NOMINAL CEPAT */}
                  <div className="flex gap-2">
                    {[total, 20000, 50000, 100000].map((amt) => (
                      <button 
                        key={amt} 
                        onClick={() => setPaidAmount(amt.toString())}
                        className="flex-1 py-2 rounded-xl bg-orange-50 text-[10px] font-black text-orange-600 border border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                      >
                        {amt === total ? "PAS" : (amt / 1000) + "RB"}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((num) => (
                      <button key={num} onClick={() => {
                        if (num === 'C') setPaidAmount('');
                        else if (num === 'DEL') setPaidAmount(p => p.slice(0, -1));
                        else setPaidAmount(p => p + num.toString());
                      }} className="h-12 rounded-xl bg-gray-50 font-black hover:bg-orange-50 transition-all active:scale-95 border border-gray-100 text-gray-700">{num}</button>
                    ))}
                  </div>
                  {parseFloat(paidAmount) >= total && <div className="p-4 bg-green-600 rounded-2xl text-white font-black animate-in slide-in-from-top-2 shadow-lg shadow-green-100"><p className="text-[9px] opacity-60">KEMBALIAN</p><p className="text-xl">{formatRupiah(change)}</p></div>}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="relative p-4 bg-white border-4 border-orange-600 rounded-[40px] shadow-2xl">
                    <img src={paymentMethod === 'gopay' ? '/qris-gopay.jpg' : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=WUZ-${currentOrderId}`} className="size-56 object-contain" />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase shadow-lg border-2 border-white">SIMULASI BAYAR</div>
                  </div>
                  <h3 className="font-black uppercase italic text-gray-800 tracking-tighter">Scan QR {paymentMethod.toUpperCase()}</h3>
                  <Button onClick={processPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 font-black uppercase text-[10px] tracking-widest transition-all">Klik Jika Bayar Berhasil (Simulasi)</Button>
                </div>
              )}
              {paymentMethod === 'cash' && (
                <Button onClick={processPayment} disabled={parseFloat(paidAmount) < total} className="w-full h-14 bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 uppercase tracking-widest transition-all active:scale-95 mt-2">KONFIRMASI PEMBAYARAN</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}