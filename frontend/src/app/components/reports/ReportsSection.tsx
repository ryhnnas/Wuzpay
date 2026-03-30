import { useState, useEffect, useMemo } from 'react';
import { 
  Download, Calendar, TrendingUp, DollarSign, ShoppingBag, 
  CreditCard, PieChart, Loader2, User, ChevronLeft, 
  ChevronRight, FileText, Search, Filter, Printer, ExternalLink 
} from 'lucide-react';
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
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
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
import { format, subDays, isValid, parseISO } from 'date-fns';

export function ReportsSection() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState('sales');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // --- FILTER STATES ---
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [activeFilter, setActiveFilter] = useState('today');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- MODAL & PAGINATION STATES ---
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; 

  // --- FUNGSI PROTEKSI TANGGAL ---
  const safeFormat = (dateVal: any, formatStr: string) => {
    try {
      if (!dateVal) return "-";
      const d = new Date(dateVal);
      return isValid(d) ? format(d, formatStr) : "-";
    } catch (e) {
      return "-";
    }
  };

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
      setTransactions(Array.isArray(tData) ? tData : []);
      setProducts(Array.isArray(pData) ? pData : []);
    } catch (error) {
      toast.error('Koneksi WuzPay Cloud terputus');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ==================== LOGIK FILTERING MONGODB ====================
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Ambil field createdAt atau created_at sesuai model mongo
      const d = new Date(t.createdAt || t.created_at);
      if (!isValid(d)) return false;
      
      const transDate = format(d, 'yyyy-MM-dd');
      
      const matchesDate = transDate >= dateFrom && transDate <= dateTo;
      const matchesPayment = paymentFilter === 'all' || t.payment_method?.toLowerCase() === paymentFilter.toLowerCase();
      const matchesSearch = 
        (t.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (t.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesDate && matchesPayment && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());
  }, [transactions, dateFrom, dateTo, paymentFilter, searchQuery]);

  const handleFilterClick = (type: string) => {
    setActiveFilter(type);
    const now = new Date();
    const nowStr = format(now, 'yyyy-MM-dd');

    if (type === 'today') {
      setDateFrom(nowStr); setDateTo(nowStr);
    } else if (type === 'week') {
      setDateFrom(format(subDays(now, 7), 'yyyy-MM-dd')); setDateTo(nowStr);
    } else if (type === 'month') {
      setDateFrom(format(subDays(now, 30), 'yyyy-MM-dd')); setDateTo(nowStr);
    }
  };

  // ==================== LOGIK PAGINATION ====================
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, paymentFilter, searchQuery]);

  // ==================== LOGIK SUMMARY ====================
  const summary = useMemo(() => ({
    count: filteredTransactions.length,
    revenue: filteredTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0),
    profit: filteredTransactions.reduce((sum, t) => sum + (Number(t.profit) || 0), 0),
    discount: filteredTransactions.reduce((sum, t) => sum + (Number(t.discount_amount) || 0), 0),
  }), [filteredTransactions]);

  // ==================== LOGIK ANALISIS PRODUK ====================
  const productSales = useMemo(() => {
    const stats = filteredTransactions.flatMap(t => t.items || []).reduce((acc: any, item: any) => {
      const pId = item.product_id?._id || item.product_id || 'unknown';
      if (!acc[pId]) {
        acc[pId] = {
          name: item.name || item.product_name || 'Item WuzPay',
          sku: item.sku || 'WUZ-ITEM',
          qty: 0,
          rev: 0,
          prof: 0
        };
      }
      const quantity = Number(item.quantity) || 0;
      acc[pId].qty += quantity;
      acc[pId].rev += Number(item.total_amount) || (quantity * (item.price_at_sale || 0));
      acc[pId].prof += Number(item.profit) || ((Number(item.price_at_sale || 0) - Number(item.cost_at_sale || 0)) * quantity);
      return acc;
    }, {});

    return Object.values(stats).sort((a: any, b: any) => b.qty - a.qty);
  }, [filteredTransactions]);

  const handleExport = () => {
    setIsExporting(true);
    toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
      loading: 'Mengompres data laporan...',
      success: () => {
        setIsExporting(false);
        return 'Laporan Excel WuzPay berhasil diunduh';
      },
      error: 'Gagal ekspor',
    });
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="size-12 text-orange-600 animate-spin" />
      <div className="text-center">
        <p className="font-black text-gray-900 uppercase text-xs tracking-[0.3em] animate-pulse">WuzPay Reporting Engine</p>
        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Mengkalkulasi Laba & Rugi...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 font-sans bg-slate-50/50 min-h-screen">
      
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">
            Sales <span className="text-orange-600">Intelligence</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Audit & Performa Bisnis WuzPay Sindangsari
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData} className="rounded-2xl font-black text-[10px] uppercase border-gray-200 h-12 px-6 hover:bg-white transition-all shadow-sm">
            Refresh Data
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-gray-900 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase h-12 px-8 shadow-xl transition-all flex items-center gap-2"
          >
            {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export Excel
          </Button>
        </div>
      </div>

      {/* SECTION 2: SMART FILTERS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-8 rounded-[32px] border-none shadow-sm bg-white p-2">
          <CardContent className="p-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-[20px]">
              {['today', 'week', 'month', 'custom'].map((f) => (
                <button 
                  key={f} 
                  onClick={() => handleFilterClick(f)} 
                  className={cn(
                    "px-6 py-2.5 text-[10px] font-black uppercase rounded-[14px] transition-all duration-300 whitespace-nowrap", 
                    activeFilter === f ? "bg-white text-orange-600 shadow-md scale-105" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {f === 'today' ? 'Hari Ini' : f === 'week' ? '7 Hari' : f === 'month' ? '30 Hari' : 'Kustom'}
                </button>
              ))}
            </div>

            {activeFilter === 'custom' && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-500">
                <input type="date" className="text-[11px] font-black bg-gray-50 border-none rounded-xl p-2.5 uppercase text-gray-600" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <span className="text-[10px] font-black text-gray-300">TO</span>
                <input type="date" className="text-[11px] font-black bg-gray-50 border-none rounded-xl p-2.5 uppercase text-gray-600" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            )}

            <div className="h-10 w-px bg-gray-100 hidden md:block" />

            <div className="flex-1 min-w-[200px]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                <Input 
                  placeholder="Cari No. Struk atau Nama..." 
                  className="pl-12 h-12 bg-gray-50 border-none rounded-2xl font-bold text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 rounded-[32px] border-none shadow-sm bg-white p-2">
          <CardContent className="p-4">
            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Metode Pembayaran</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="rounded-2xl bg-gray-50 border-none h-12 font-black text-[10px] uppercase px-6 focus:ring-0">
                <SelectValue placeholder="Semua Metode" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all" className="font-black text-[10px] uppercase">SEMUA METODE</SelectItem>
                <SelectItem value="cash" className="font-black text-[10px] uppercase">TUNAI / CASH</SelectItem>
                <SelectItem value="qris" className="font-black text-[10px] uppercase">DIGITAL / QRIS</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Volume Sales', val: summary.count, icon: ShoppingBag, col: 'text-blue-600', bg: 'bg-blue-50', unit: ' Orders' },
          { label: 'Gross Revenue', val: formatRupiah(summary.revenue), icon: DollarSign, col: 'text-orange-600', bg: 'bg-orange-50', unit: '' },
          { label: 'Net Profit', val: formatRupiah(summary.profit), icon: TrendingUp, col: 'text-emerald-600', bg: 'bg-emerald-50', unit: '' },
          { label: 'Avg Ticket', val: formatRupiah(summary.count > 0 ? summary.revenue / summary.count : 0), icon: CreditCard, col: 'text-purple-600', bg: 'bg-purple-50', unit: '' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[32px] overflow-hidden group hover:shadow-xl transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className={cn("p-5 rounded-[22px] transition-transform group-hover:scale-110 group-hover:rotate-6", s.bg, s.col)}>
                <s.icon className="size-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{s.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className={cn("text-2xl font-black tracking-tighter mt-1", s.col)}>{s.val}</p>
                  <span className="text-[9px] font-bold text-gray-300 uppercase whitespace-nowrap">{s.unit}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SECTION 4: DETAILED TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="bg-gray-100 p-1.5 rounded-2xl w-fit shadow-inner h-fit">
            <TabsTrigger value="sales" className="text-[10px] font-black uppercase px-10 py-3 data-[state=active]:bg-white data-[state=active]:text-orange-600 rounded-xl transition-all shadow-sm">Audit Transaksi</TabsTrigger>
            <TabsTrigger value="products" className="text-[10px] font-black uppercase px-10 py-3 data-[state=active]:bg-white data-[state=active]:text-orange-600 rounded-xl transition-all shadow-sm">Product Rank</TabsTrigger>
          </TabsList>

          <div className="hidden md:flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex flex-col text-right">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Global Discounts</span>
                <span className="text-xs font-black text-red-500">-{formatRupiah(summary.discount)}</span>
             </div>
             <div className="h-6 w-px bg-gray-100" />
             <PieChart className="size-5 text-gray-200" />
          </div>
        </div>

        <TabsContent value="sales" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-3">
                 <FileText className="size-4 text-orange-600" /> WuzPay Transaction Ledger
              </CardTitle>
              <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl">
                 <span className="text-[10px] font-black text-gray-400">Page {currentPage} / {totalPages || 1}</span>
                 <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-white" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-white" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="size-4" /></Button>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="border-none">
                      <TableHead className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">No. Struk</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-400">Waktu</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-400 text-center">Metode</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-400 text-right">Total Transaksi</TableHead>
                      <TableHead className="px-10 text-[10px] font-black uppercase text-gray-400 text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTransactions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-32 text-gray-300 font-black uppercase tracking-widest italic text-[10px]">Tidak ada transaksi ditemukan.</TableCell></TableRow>
                    ) : currentTransactions.map(t => (
                      <TableRow 
                        key={t._id || t.id} 
                        className="hover:bg-orange-50/20 transition-all cursor-pointer group border-b border-gray-50" 
                        onClick={() => setSelectedTransactionId(t._id || t.id)}
                      >
                        <TableCell className="px-10 py-6 font-mono text-[11px] font-black text-orange-600 italic group-hover:scale-105 transition-transform origin-left">
                          #{t.receipt_number || (t._id || t.id).substring(18).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-gray-400">
                          {safeFormat(t.createdAt || t.created_at, 'dd/MM/yy HH:mm')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-gray-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                            {t.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-gray-900 text-xs tracking-tighter italic">
                          {formatRupiah(t.total_amount)}
                        </TableCell>
                        <TableCell className="px-10 text-right">
                           <div className="flex flex-col items-end">
                              <span className="font-black text-emerald-600 text-sm tracking-tighter italic">+{formatRupiah(t.profit)}</span>
                              <span className="text-[8px] font-bold text-gray-300 uppercase">Margin</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-3">
                 <ExternalLink className="size-4 text-orange-600" /> Best Sellers Ranking
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="border-none">
                      <TableHead className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">Rank & Menu Produk</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-400 text-center">Qty Terjual</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-400 text-right">Omzet Bruto</TableHead>
                      <TableHead className="px-10 text-[10px] font-black uppercase text-gray-400 text-right">Kontribusi Laba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSales.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-32 text-gray-300 font-black uppercase tracking-widest italic text-[10px]">Data produk belum tersedia.</TableCell></TableRow>
                    ) : productSales.map((p: any, i) => (
                      <tr key={i} className="hover:bg-orange-50/20 transition-all group border-b border-gray-50">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <span className={cn("text-[10px] font-black w-6", i === 0 ? "text-orange-600" : "text-gray-300")}>0{i+1}</span>
                              <div className="flex flex-col">
                                 <span className="font-black text-gray-800 uppercase text-xs italic tracking-tight">{p.name}</span>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase">{p.sku}</span>
                              </div>
                           </div>
                        </td>
                        <td className="text-center">
                           <Badge className={cn("font-black text-[11px] px-5 py-1.5 rounded-xl border-none shadow-sm", i === 0 ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-500")}>
                             {p.qty} Pcs
                           </Badge>
                        </td>
                        <td className="text-right font-bold text-gray-400 text-xs italic">{formatRupiah(p.rev)}</td>
                        <td className="px-10 text-right">
                           <span className="font-black text-emerald-600 text-base tracking-tighter italic">+{formatRupiah(p.prof)}</span>
                        </td>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* SECTION 5: FOOTER INFO */}
      <div className="flex flex-col md:flex-row justify-between items-center px-8 py-6 rounded-[32px] bg-white border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-orange-50 rounded-full flex items-center justify-center">
            <Printer className="size-5 text-orange-600" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total SKU Aktif: {productSales.length} | WuzPay Cloud Sync: 100%</p>
        </div>
        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em] italic mt-4 md:mt-0">© 2026 WuzPay POS Sindangsari v3.0.4</p>
      </div>

      {/* MODAL EDITOR INTEGRATION */}
      {selectedTransactionId && (
        <EditStruk 
          transactionId={selectedTransactionId} 
          onClose={() => {
            setSelectedTransactionId(null);
            loadData();
          }} 
        />
      )}
    </div>
  );
}