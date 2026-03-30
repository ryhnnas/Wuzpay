import { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp, DollarSign, ShoppingBag, CreditCard, PieChart, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { transactionsAPI, productsAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';
import { EditStruk } from './EditStruck';
import { handleGlobalPrint } from '../utils/printHandler';
import { format, subDays } from 'date-fns';

export function ReportsSection() {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const [activeTab, setActiveTab] = useState('sales');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [activeFilter, setActiveFilter] = useState('today');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Buat Link Struk
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage =25; 

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tData, pData] = await Promise.all([
        transactionsAPI.getAll(),
        productsAPI.getAll()
      ]);

      // CEK DI SINI:
    console.log("JUMLAH DATA ASLI DARI API:", tData.length);
    
      setTransactions(tData || []);
      setProducts(pData || []);
    } catch (error) {
      toast.error('Gagal mengambil data dari database');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const normalizePaymentMethod = (value: any) => {
    const normalized = String(value || 'lainnya').trim().toLowerCase();

    const key =
      normalized === 'cash' || normalized === 'tunai'
        ? 'cash'
        : normalized === 'qris' || normalized === 'qris payment' || normalized === 'qr'
          ? 'qris'
          : normalized === 'transfer' || normalized === 'bank transfer'
            ? 'transfer'
            : normalized;

    const label =
      key === 'cash'
        ? 'CASH'
        : key === 'qris'
          ? 'QRIS'
          : key === 'transfer'
            ? 'TRANSFER'
            : key.toUpperCase();

    return { key, label };
  };

  // ==================== LOGIC FILTERING ====================
  const filteredTransactions = transactions.filter(t => {
    // Kita bandingkan string tanggal (YYYY-MM-DD) agar lebih akurat dan ringan
    const transDate = format(new Date(t.created_at || t.date), 'yyyy-MM-dd');
    
    // Bandingkan string secara langsung (karena format YYYY-MM-DD aman untuk komparasi string)
    const matchesDate = transDate >= dateFrom && transDate <= dateTo;
    const paymentMethodKey = normalizePaymentMethod(t.payment_method).key;
    const matchesPayment = paymentFilter === 'all' || paymentMethodKey === paymentFilter;
    
    return matchesDate && matchesPayment;
  });

  const handleFilterClick = (type: string) => {
    setActiveFilter(type);
    const now = new Date();
    const nowStr = format(now, 'yyyy-MM-dd');

    if (type === 'today') {
      setDateFrom(nowStr);
      setDateTo(nowStr);
    } else if (type === 'week') {
      setDateFrom(format(subDays(now, 7), 'yyyy-MM-dd'));
      setDateTo(nowStr);
    } else if (type === 'month') {
      setDateFrom(format(subDays(now, 30), 'yyyy-MM-dd'));
      setDateTo(nowStr);
    }
  };

  // ==================== LOGIC PAGINATION ====================
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  // Inilah data yang akan di-map di tabel
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  // Reset ke halaman 1 kalau filter tanggal berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, paymentFilter]);

  // ==================== LOGIC SUMMARY ====================
  const summary = {
    totalTransactions: filteredTransactions.length,
    totalRevenue: filteredTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0),
    totalProfit: filteredTransactions.reduce((sum, t) => sum + (t.profit || 0), 0),
    avgTransaction: filteredTransactions.length > 0
      ? filteredTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0) / filteredTransactions.length
      : 0,
  };

  // ==================== LOGIC PRODUK TERLARIS ====================
  const productSales = Object.values(
    filteredTransactions
      .flatMap(t => t.items || [])
      .reduce((acc: Record<string, any>, item: any) => {
        const productId = item.product_id || item.product?.id || item.id || 'unknown';
        const quantity = Number(item.quantity) || 0;
        const priceAtSale = Number(item.price_at_sale) || Number(item.price) || 0;
        const lineRevenue = Number(item.total_amount) || (quantity * priceAtSale);
        const costAtSale = Number(item.cost_at_sale) || 0;
        const lineProfit = (priceAtSale - costAtSale) * quantity;

        if (!acc[productId]) {
          const productInfo = products.find((p: any) => p.id === productId);
          acc[productId] = {
            sku: item.product_code || productInfo?.sku || '-',
            name: item.product_name || item.product?.name || productInfo?.name || 'Produk Tidak Diketahui',
            quantitySold: 0,
            revenue: 0,
            profit: 0,
            totalPriceValue: 0,
          };
        }

        acc[productId].quantitySold += quantity;
        acc[productId].revenue += lineRevenue;
        acc[productId].profit += lineProfit;
        acc[productId].totalPriceValue += priceAtSale * quantity;

        return acc;
      }, {})
  )
    .map((item: any) => ({
      ...item,
      priceAtSale: item.quantitySold > 0 ? item.totalPriceValue / item.quantitySold : 0,
      profit: Math.round(item.profit),
    }))
    .filter((item: any) => item.quantitySold > 0)
    .sort((a: any, b: any) => b.quantitySold - a.quantitySold);

  // ==================== LOGIC METODE BAYAR ====================
  const paymentGroups = filteredTransactions.reduce((acc: Record<string, { method: string; count: number; amount: number }>, transaction: any) => {
    const { key: methodKey, label: methodLabel } = normalizePaymentMethod(transaction.payment_method);

    if (!acc[methodKey]) {
      acc[methodKey] = {
        method: methodLabel,
        count: 0,
        amount: 0,
      };
    }

    acc[methodKey].count += 1;
    acc[methodKey].amount += Number(transaction.total_amount) || 0;
    return acc;
  }, {});

  const paymentBreakdown = Object.values(paymentGroups)
    .sort((a, b) => b.amount - a.amount);

  const paymentMethodOptions = Object.values(
    transactions.reduce((acc: Record<string, { key: string; label: string }>, transaction: any) => {
      const normalized = normalizePaymentMethod(transaction.payment_method);
      if (!acc[normalized.key]) {
        acc[normalized.key] = normalized;
      }
      return acc;
    }, {})
  ).sort((a, b) => a.label.localeCompare(b.label));

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">Sinkronisasi Database...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl uppercase tracking-tighter text-gray-800">Laporan Penjualan</h2>
          <p className="text-gray-500 text-sm">Monitoring performa outlet Seblak Mledak</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} className="rounded-xl font-bold text-xs shadow-sm">
            REFRESH
          </Button>
          <Button onClick={() => toast.info('Fitur Export Excel sedang dikembangkan')} className="bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-xs shadow-md">
            <Download className="mr-2 size-4" /> EXPORT EXCEL
          </Button>
        </div>
      </div>

      {/* FILTER CARDS */}
      <Card className="border-none shadow-sm bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          {/* TENGAH: QUICK FILTERS UNIVERSAL */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-sm">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'week', label: '7 Hari' },
              { id: 'month', label: '30 Hari' },
              { id: 'custom', label: 'Custom' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterClick(f.id)}
                className={cn(
                  "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-200",
                  activeFilter === f.id 
                    ? "bg-white text-orange-600 shadow-md scale-105" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {f.label}
              </button>
            ))}

            {/* INPUT TANGGAL (Hanya muncul jika mode Custom aktif) */}
            {activeFilter === 'custom' && (
            <div className="flex items-center gap-2 px-3 animate-in slide-in-from-left-2 duration-300 border-l border-gray-300 ml-2">
              <input 
                type="date" 
                className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[115px] uppercase text-gray-700 cursor-pointer" 
                value={dateFrom} // Pakai dateFrom
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-[10px] font-black text-gray-300">S/D</span>
              <input 
                type="date" 
                className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[115px] uppercase text-gray-700 cursor-pointer" 
                value={dateTo} // Pakai dateTo
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">Metode Bayar</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-44 rounded-xl bg-gray-50 border-none h-10 font-bold text-xs">
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">SEMUA METODE</SelectItem>
                {paymentMethodOptions.map((option: any) => (
                  <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* STATISTICS GRID */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Transaksi', value: summary.totalTransactions, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Omzet', value: formatRupiah(summary.totalRevenue), icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Profit', value: formatRupiah(summary.totalProfit), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Struk', value: formatRupiah(summary.avgTransaction), icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl", stat.bg, stat.color)}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">{stat.label}</p>
                <p className={cn("text-lg font-black tracking-tight", stat.color)}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TABS SECTION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl w-fit mb-4">
          <TabsTrigger value="sales" className="text-[10px] font-bold uppercase px-6">Transaksi</TabsTrigger>
          <TabsTrigger value="products" className="text-[10px] font-bold uppercase px-6">Produk Terlaris</TabsTrigger>
          <TabsTrigger value="payment" className="text-[10px] font-bold uppercase px-6">Metode Bayar</TabsTrigger>
        </TabsList>

        {/* TAB: DAFTAR TRANSAKSI */}
        <TabsContent value="sales" className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">No. Struk</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Waktu Transaksi</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Created By</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Metode</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Total Bayar</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Keuntungan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTransactions.map(trans => (
                  <TableRow key={trans.id}>
                    {/* Kolom No Struk yang sekarang sudah ada isinya dari Backend */}
                    <TableCell 
                      className="font-mono text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer underline decoration-dotted"
                      onClick={() => setSelectedTransactionId(trans.id)} // Klik untuk buka edit
                    >
                      {trans.receipt_number || trans.id.slice(0,8).toUpperCase()}
                    </TableCell>
                    
                    <TableCell className="text-[11px]">
                      {new Date(trans.created_at).toLocaleString('id-ID')}
                    </TableCell>

                    {/* Tampilkan Nama Kasir biar jelas siapa yang jaga */}
                    <TableCell className="text-[11px] font-medium">
                      {trans.cashier_name || 'Admin'}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[9px] font-black uppercase">
                        {trans.payment_method}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-bold text-[11px]">
                      {formatRupiah(trans.total_amount || 0)}
                    </TableCell>

                    {/* Kolom Profit yang sekarang sudah dihitung otomatis oleh Backend */}
                    <TableCell className="text-green-600 text-[11px] font-bold">
                      {formatRupiah(trans.profit || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB: PRODUK TERLARIS */}
        <TabsContent value="products" className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">SKU</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Nama Produk</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Terjual</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Harga / Item</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Omzet</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSales.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-gray-400 italic text-xs">Belum ada menu yang terjual...</TableCell></TableRow>
                ) : (
                  productSales.map(item => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-[11px]">{item.sku}</TableCell>
                      <TableCell className="font-black text-[11px] uppercase text-gray-700">{item.name}</TableCell>
                      <TableCell className="text-[11px] font-bold text-center">{item.quantitySold} Porsi</TableCell>
                      <TableCell className="text-[11px] font-bold">{formatRupiah(item.priceAtSale)}</TableCell>
                      <TableCell className="text-[11px] font-bold">{formatRupiah(item.revenue)}</TableCell>
                      <TableCell className="text-green-600 text-[11px] font-bold">{formatRupiah(item.profit)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB: METODE PEMBAYARAN */}
        <TabsContent value="payment" className="animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Metode Pembayaran</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right">Frekuensi</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right">Total Uang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentBreakdown.map(p => (
                    <TableRow key={p.method}>
                      <TableCell className="font-bold text-[11px]">{p.method}</TableCell>
                      <TableCell className="text-right text-[11px] font-bold">{p.count} Transaksi</TableCell>
                      <TableCell className="text-right text-[11px] font-bold text-orange-600">{formatRupiah(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Card className="rounded-2xl border-dashed border-2 flex flex-col items-center justify-center p-10 text-gray-400">
               <PieChart className="size-10 mb-2 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">Visual Analysis</p>
               <p className="text-[10px] mt-1 italic text-center">Grafik lingkaran otomatis akan muncul di sini setelah integrasi Recharts.</p>
            </Card>
          </div>
        </TabsContent>

        {/* NAVIGASI HALAMAN */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t rounded-b-2xl">
          <p className="text-[10px] font-bold uppercase text-gray-400">
            Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTransactions.length)} dari {filteredTransactions.length} Transaksi
          </p>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-lg h-8 text-[10px] font-bold uppercase"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            
            <div className="flex items-center px-4 bg-gray-50 rounded-lg text-[10px] font-black">
              HALAMAN {currentPage} / {totalPages || 1}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-lg h-8 text-[10px] font-bold uppercase"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </Tabs>
      
      {/* MODAL EDIT STRUK */}
      {selectedTransactionId && (
        <EditStruk 
          transactionId={selectedTransactionId} 
          onClose={() => setSelectedTransactionId(null)} 
        />
      )}
    </div>
  );
}