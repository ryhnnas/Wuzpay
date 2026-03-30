import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, ShoppingCart, DollarSign, Package, Calendar, 
  Clock, Loader2, Award, AlertTriangle, CreditCard, Wallet, Receipt, BarChart2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { transactionsAPI, productsAPI } from '@/services/api';
import { cn } from "@/app/components/ui/utils"; 
import { toast } from 'sonner';

export function Dashboard() {
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState({ totalRevenue: 0, totalProfit: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, startDate, endDate]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      let sStr = "";
      let eStr = "";
      
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now - offset).toISOString();
      const todayStr = localISOTime.split('T')[0];

      if (dateRange === 'today') {
        sStr = `${todayStr}T00:00:00.000Z`;
        eStr = `${todayStr}T23:59:59.999Z`;
      } else if (dateRange === 'week') {
        // 🔵 MINGGU INI: 7 Hari Terakhir (Rolling)
        const start = new Date();
        start.setDate(start.getDate() - 7);
        sStr = start.toISOString().split('T')[0] + 'T00:00:00.000Z';
        eStr = `${todayStr}T23:59:59.999Z`;
      } else if (dateRange === 'month') {
        // 🟢 BULAN INI: 30 Hari Terakhir (Rolling)
        const start = new Date();
        start.setDate(start.getDate() - 30);
        sStr = start.toISOString().split('T')[0] + 'T00:00:00.000Z';
        eStr = `${todayStr}T23:59:59.999Z`;
      } else if (dateRange === 'custom') {
        if (!startDate || !endDate) { setIsLoading(false); return; }
        sStr = `${startDate}T00:00:00.000Z`;
        eStr = `${endDate}T23:59:59.999Z`;
      }

      const [transList, prodList, summaryRes] = await Promise.all([
        transactionsAPI.getAll({ startDate: sStr, endDate: eStr }),
        productsAPI.getAll(),
        transactionsAPI.getSummary(sStr, eStr) 
      ]);

      setTransactions(Array.isArray(transList) ? transList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
      
      // Simpan hasil summary yang sudah dibulatkan dari Backend
      if (summaryRes?.success) {
        setSummaryData(summaryRes.data);
      }
    } catch (error) {
      console.error("Gagal load dashboard:", error);
      toast.error("Gagal sinkronisasi data");
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = useMemo(() => {
    // AMBIL LANGSUNG DARI HASIL API SUMMARY
    // Jika API Summary sudah bener, angka ini harusnya Rp 10.533.425
    const totalProfit = summaryData.totalProfit; 
    const totalRevenue = summaryData.totalRevenue;

    const totalCost = totalRevenue - totalProfit;
    const count = transactions.length;
    const avgPerStruk = count > 0 ? totalRevenue / count : 0;
    
    return { totalRevenue, totalProfit, totalCost, count, avgPerStruk };
  }, [summaryData, transactions.length]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock_quantity < 10).sort((a, b) => a.stock_quantity - b.stock_quantity);
  }, [products]);

  const chartData = useMemo(() => {
    const isToday =
      dateRange === 'today' ||
      (dateRange === 'custom' && startDate === endDate);

    // ==================== MODE PER JAM ====================
    if (isToday) {
      const result = Array.from({ length: 15 }, (_, i) => {
        const hour = i + 8;

        const hourlyTrans = transactions.filter((t) => {
          if (!t.created_at) return false;
          const d = new Date(t.created_at);
          return d.getHours() === hour;
        });

        const rev = hourlyTrans.reduce(
          (sum, t) => sum + (Number(t.total_amount || t.total) || 0),
          0
        );

        const prof = hourlyTrans.reduce(
          (sum, t) => sum + (Number(t.profit) || 0),
          0
        );

        return {
          label: `${hour.toString().padStart(2, '0')}:00`,
          transaksi: hourlyTrans.length,
          pendapatan: rev,
          pengeluaran: rev - prof,
          sortKey: hour,
        };
      });

      return result.sort((a, b) => a.sortKey - b.sortKey);
    }

    // ==================== MODE PER HARI ====================
    const dailyMap: Record<string, any> = {};

    transactions.forEach((t) => {
      if (!t.created_at) return;

      const d = new Date(t.created_at);
      const isoKey = d.toISOString().split('T')[0];

      if (!dailyMap[isoKey]) {
        dailyMap[isoKey] = {
          label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          transaksi: 0,
          pendapatan: 0,
          pengeluaran: 0,
          sortKey: isoKey,
        };
      }

      // 🔥 TAMBAHKAN Math.round DI SINI MANG!
      // Biar total pendapatan di grafik klop sama totalRevenue di Card
      const rev = Math.round(Number(t.total_amount || t.total) || 0);
      const prof = Math.round(Number(t.profit) || 0);

      dailyMap[isoKey].transaksi += 1;
      dailyMap[isoKey].pendapatan += rev;
      dailyMap[isoKey].pengeluaran += (rev - prof);
    });

    return Object.values(dailyMap).sort((a: any, b: any) =>
      a.sortKey.localeCompare(b.sortKey)
    );
  }, [transactions, dateRange, startDate, endDate]);

  const topProducts = useMemo(() => {
    const counts: Record<string, any> = {};
    transactions.forEach(t => {
      (t.items || t.transaction_items || []).forEach((item: any) => {
        const pId = item.product_id || item.product?.id;
        const pName = item.product?.name || products.find(p => p.id === pId)?.name || "Menu";
        if (!counts[pId]) counts[pId] = { name: pName, value: 0 };
        counts[pId].value += (item.quantity || 0);
      });
    });
    return Object.values(counts).sort((a: any, b: any) => b.value - a.value).slice(0, 5);
  }, [transactions, products]);

  const paymentData = useMemo(() => {
      // Helper untuk normalisasi teks (lowercase & hapus spasi)
      const getMethod = (m) => (m || 'LAINNYA').toLowerCase().trim();

      // 1. Kelompokkan Transaksi
      const cashTrans = transactions.filter(t => getMethod(t.payment_method) === 'cash' || getMethod(t.payment_method) === 'tunai');
      const midtransTrans = transactions.filter(t => getMethod(t.payment_method) === 'qris'); // QRIS Midtrans
      const gopayTrans = transactions.filter(t => getMethod(t.payment_method) === 'gopay' || getMethod(t.payment_method) === 'gopay_bisnis');
      const tfTrans = transactions.filter(t => getMethod(t.payment_method) === 'transfer' || getMethod(t.payment_method) === 'tf');
      
      // 2. Tangkap sisa (jika ada yang typo)
      const otherTrans = transactions.filter(t => 
        !['cash', 'tunai', 'qris', 'gopay', 'gopay_bisnis', 'transfer', 'tf'].includes(getMethod(t.payment_method))
      );

      const data = [
        { 
          name: 'Tunai', 
          count: cashTrans.length, 
          value: cashTrans.reduce((sum, t) => sum + (Number(t.total_amount || t.total) || 0), 0), 
          color: '#f59e0b' // Amber/Orange
        },
        { 
          name: 'QRIS Midtrans', 
          count: midtransTrans.length, 
          value: midtransTrans.reduce((sum, t) => sum + (Number(t.total_amount || t.total) || 0), 0), 
          color: '#8b5cf6' // Purple/Violet
        },
        { 
          name: 'Gopay Bisnis', 
          count: gopayTrans.length, 
          value: gopayTrans.reduce((sum, t) => sum + (Number(t.total_amount || t.total) || 0), 0), 
          color: '#ec4899' // Pink (Gopay vibes)
        },
        { 
          name: 'Transfer', 
          count: tfTrans.length, 
          value: tfTrans.reduce((sum, t) => sum + (Number(t.total_amount || t.total) || 0), 0), 
          color: '#3b82f6' // Blue
        },
        { 
          name: 'Lainnya', 
          count: otherTrans.length, 
          value: otherTrans.reduce((sum, t) => sum + (Number(t.total_amount || t.total) || 0), 0), 
          color: '#94a3b8' // Grey
        },
      ];

      // Filter yang count-nya > 0 agar grafik tidak ramai label kosong
      return data.filter(p => p.count > 0);
    }, [transactions]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(value));
  };

  const peakHour = chartData.length > 0
    ? [...chartData].sort((a, b) => b.transaksi - a.transaksi)[0]?.label
    : '--:--';

  if (isLoading) return (
    <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-slate-50 to-orange-50">
      <Loader2 className="size-10 text-orange-600 animate-spin" />
      <p className="font-black text-gray-400 uppercase text-xs tracking-widest animate-pulse">Sinkronisasi Data Mledak...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-orange-50/20 relative overflow-hidden">
      {/* BACKGROUND PATTERN - Subtle Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* DECORATIVE BLOBS */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -mr-48 -mt-48 pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -ml-48 -mb-48 pointer-events-none"></div>
      <div className="fixed top-1/2 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-5 -ml-48 -mt-48 pointer-events-none"></div>

      <div className="relative p-6 space-y-6 animate-in fade-in duration-500">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-2xl uppercase tracking-tighter text-gray-800">Analytics Dashboard</h2>
            <p className="text-gray-500 text-sm italic underline decoration-orange-300">Data Real-Time Seblak Mledak</p>
          </div>
          <div className="flex items-center bg-white/70 backdrop-blur-md p-2 rounded-2xl shadow-md border border-gray-200/50 gap-2 flex-wrap">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36 border-none bg-gray-50/50 font-black text-[10px] rounded-xl hover:bg-gray-100/50 transition-colors">
                <Calendar className="mr-2 size-3 text-orange-600" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari ini</SelectItem>
                <SelectItem value="week">Minggu ini</SelectItem>
                <SelectItem value="month">Bulan ini</SelectItem>
                <SelectItem value="custom">Kustom</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === "custom" && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="h-9 w-36 bg-gray-50/50 border-none text-[10px] font-bold rounded-xl hover:bg-gray-100/50 transition-colors"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  className="h-9 w-36 bg-gray-50/50 border-none text-[10px] font-bold rounded-xl hover:bg-gray-100/50 transition-colors"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* ROW 0: SUMMARY STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Penjualan */}
          <Card className="border border-orange-200/50 shadow-lg rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-orange-100/50 backdrop-blur-sm hover:shadow-xl hover:border-orange-300/70 transition-all duration-300 group">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-600">Total Penjualan</p>
                <div className="p-2.5 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <Wallet className="size-3.5 text-orange-700" />
                </div>
              </div>
              <p className="text-lg font-black tracking-tighter text-gray-800 leading-none">
                {formatRupiah(metrics.totalRevenue)}
              </p>
            </CardContent>
          </Card>

          {/* Total Transaksi */}
          <Card className="border border-blue-200/50 shadow-lg rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/80 to-sky-100/50 backdrop-blur-sm hover:shadow-xl hover:border-blue-300/70 transition-all duration-300 group">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Total Transaksi</p>
                <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <ShoppingCart className="size-3.5 text-blue-700" />
                </div>
              </div>
              <p className="text-lg font-black tracking-tighter text-gray-800 leading-none">
                {metrics.count.toLocaleString('id-ID')}
                <span className="text-xs font-bold text-gray-400 ml-1">struk</span>
              </p>
            </CardContent>
          </Card>

          {/* Total Profit */}
          <Card className="border border-emerald-200/50 shadow-lg rounded-2xl bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-green-100/50 backdrop-blur-sm hover:shadow-xl hover:border-emerald-300/70 transition-all duration-300 group">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Total Profit</p>
                <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <BarChart2 className="size-3.5 text-emerald-700" />
                </div>
              </div>
              <p className="text-lg font-black tracking-tighter text-gray-800 leading-none">
                {formatRupiah(metrics.totalProfit)}
              </p>
            </CardContent>
          </Card>

          {/* Avg Per Struk */}
          <Card className="border border-purple-200/50 shadow-lg rounded-2xl bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-violet-100/50 backdrop-blur-sm hover:shadow-xl hover:border-purple-300/70 transition-all duration-300 group">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-purple-600">Avg / Struk</p>
                <div className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                  <Receipt className="size-3.5 text-purple-700" />
                </div>
              </div>
              <p className="text-lg font-black tracking-tighter text-gray-800 leading-none">
                {formatRupiah(metrics.avgPerStruk)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ROW 1: TREN PENDAPATAN (7/10) & STOK MENIPIS (3/10) */}
        <div className="grid gap-6 lg:grid-cols-10">
          <Card className="lg:col-span-7 border border-gray-200/50 shadow-lg rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-orange-200 to-orange-100 border-b border-gray-200/50 p-4">
              <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 tracking-widest text-gray-700">
                <TrendingUp className="size-4 text-orange-500" /> Tren Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[320px] bg-gradient-to-b from-white/50 via-blue-50/10 to-white/50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <pattern id="chartGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} width={60} formatter={(value) => formatNumber(value)} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }} formatter={(value) => formatNumber(Number(value))} />
                  <Area type="monotone" dataKey="pendapatan" stroke="#f59e0b" strokeWidth={3} fill="url(#revGrad)" name="Pendapatan" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border border-red-200/50 shadow-lg rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-red-50/80 via-orange-50/50 to-red-50/80 border-b border-red-200/50 p-4">
              <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 tracking-widest text-red-700">
                <AlertTriangle className="size-4 animate-bounce" /> Stok Menipis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[320px] overflow-y-auto bg-gradient-to-b from-white/50 to-red-50/20">
                {lowStockProducts.length > 0 ? lowStockProducts.map((p, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between border-b border-gray-100/50 hover:bg-orange-50/40 transition-colors duration-200 group">
                    <div>
                      <p className="font-black text-[11px] uppercase text-gray-800 leading-tight group-hover:text-gray-900 transition-colors">{p.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">{p.sku || 'TANPA SKU'}</p>
                    </div>
                    <Badge className={cn(
                      "font-black text-[10px] border-none px-2.5 py-1 rounded-lg ml-2 shrink-0 group-hover:scale-110 transition-transform duration-200",
                      p.stock_quantity < 5 ? "bg-gradient-to-r from-red-100 to-red-200 text-red-700 shadow-md" : "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 shadow-md"
                    )}>
                      {p.stock_quantity}
                    </Badge>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <Package className="size-8 mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase">Stok Aman Terkendali</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 2: PENDAPATAN VS MODAL & JAM TERPADAT */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border border-gray-200/50 shadow-lg rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
              <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 tracking-widest text-white">
                <DollarSign className="size-4 text-emerald-400" /> Pendapatan vs Modal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[280px] bg-gradient-to-b from-white/50 via-emerald-50/10 to-white/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" fontSize={10} fontWeight={800} axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={10} fontWeight={800} axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} width={60} formatter={(value) => formatNumber(value)} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }} formatter={(value) => formatNumber(Number(value))} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '10px' }} />
                  <Bar dataKey="pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} name="Pendapatan" maxBarSize={32} />
                  <Bar dataKey="pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} name="Modal (HPP)" maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl shadow-indigo-200/20 border border-slate-800 hover:border-orange-500/50 transition-all duration-500 group">
            <CardContent className="p-8 h-full flex flex-col justify-between min-h-[380px] relative overflow-hidden">
              
              {/* BACKGROUND PATTERN: Lebih halus & Pro */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#gridPattern)"/>
                </svg>
              </div>

              {/* HEADER SECTION */}
              <div className="flex justify-between items-start relative z-10">
                <div className="p-4 bg-orange-600 rounded-2xl shadow-lg shadow-orange-600/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Clock className="size-8 text-white" />
                </div>
                <Badge className="bg-orange-600/10 border border-orange-500/30 text-orange-500 font-black text-[10px] uppercase tracking-tighter px-3 py-1 backdrop-blur-xl">
                  Live Insight
                </Badge>
              </div>

              {/* MAIN CONTENT: Font Lebih Besar */}
              <div className="relative z-10 space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500 drop-shadow-md">
                  Jam Penjualan Terpadat
                </p>
                <h3 className="text-7xl font-black tracking-tighter mt-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent drop-shadow-2xl">
                  {peakHour}
                </h3>
              </div>

              {/* INSIGHT FOOTER: Font Lebih Besar & Kontras */}
              <div className="relative z-10 border-t-2 border-orange-600/30 pt-6">
                <p className="text-sm md:text-base text-gray-200 leading-relaxed font-medium">
                  {(() => {
                    const hour = parseInt(peakHour);
                    if (hour >= 11 && hour <= 14) {
                      return (
                        <span>
                          <span className="text-orange-500 font-black">🔥 PEAK HOUR MAKAN SIANG!</span> Persiapan topping & bumbu harus matang 30 menit lebih awal agar antrean mengalir lancar.
                        </span>
                      );
                    } else if (hour >= 16 && hour <= 20) {
                      return (
                        <span>
                          <span className="text-orange-500 font-black">🚀 WAR SEBLAK DIMULAI!</span> Optimalkan stok ceker sekarang untuk menyambut lonjakan pesanan di jam produktif ini.
                        </span>
                      );
                    } else if (hour >= 21 || hour <= 3) {
                      return (
                        <span>
                          <span className="text-orange-500 font-black">🌙 MIDNIGHT SNACK RAMAI!</span> Pastikan pencahayaan terang dan stok menu favorit terjaga hingga akhir operasional.
                        </span>
                      );
                    } else {
                      return (
                        <span>
                          <span className="text-orange-500 font-black">📊 TREN MENINGKAT!</span> Waktu yang tepat untuk melakukan pengecekan ketersediaan stok bahan baku utama di gudang.
                        </span>
                      );
                    }
                  })()}
                </p>
              </div>

              {/* DECORATIVE GLOW */}
              <div className="absolute -bottom-20 -right-20 size-64 bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />
            </CardContent>
          </Card>
        </div>

        {/* ROW 3: VOLUME, PEMBAYARAN, TERLARIS */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Volume Transaksi */}
          <Card className="border border-blue-200/50 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 border-b border-blue-200/50 bg-gradient-to-r from-blue-50/80 to-sky-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-700">Volume Transaksi</CardTitle>
              <ShoppingCart className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent className="h-[240px] pt-4 px-2 bg-gradient-to-b from-white/50 via-blue-50/10 to-white/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" hide />
                  <YAxis fontSize={10} fontWeight={800} axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} width={40} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }} />
                  <Bar dataKey="transaksi" fill="#3b82f6" radius={[8, 8, 8, 8]} barSize={10} name="Transaksi" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribusi Pembayaran */}
          <Card className="border border-purple-200/50 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50/80 to-violet-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-purple-700">Metode Bayar</CardTitle>
              <CreditCard className="size-4 text-purple-600" />
            </CardHeader>
            <CardContent className="h-[240px] flex items-center justify-center px-2 bg-gradient-to-b from-white/50 via-purple-50/10 to-white/50 relative">
              
              {/* TEXT TOTAL TENGAH (OPSIONAL) */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Omzet</span>
                <span className="text-[10px] font-black text-purple-700">Pusat</span>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={paymentData} 
                    innerRadius={55} 
                    outerRadius={75} 
                    paddingAngle={4} 
                    dataKey="value" // 'value' adalah jumlah uangnya
                  >
                    {paymentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  
                  {/* MODIFIKASI TOOLTIP AGAR MUNCUL UANG & JUMLAH TRANSAKSI */}
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      background: 'rgba(255,255,255,0.95)', 
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                    }} 
                    // Custom Formatter: value adalah nominal uang, payload adalah data lengkap item itu
                    formatter={(value, name, props) => [
                      `Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`, 
                      `${name} (${props.payload.count} Transaksi)` 
                    ]}
                  />
                  
                  <Legend 
                    iconType="circle" 
                    verticalAlign="bottom" 
                    wrapperStyle={{ 
                      fontSize: '8px', 
                      fontWeight: '900', 
                      textTransform: 'uppercase',
                      paddingTop: '10px'
                    }} 
                    // Formatter Legend agar di bawah grafik muncul Nama + Rp nya
                    formatter={(value, entry) => (
                      <span className="text-gray-600">
                        {value}: <span className="text-purple-700">Rp {new Intl.NumberFormat('id-ID').format(entry.payload.value)}</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border border-orange-200/50 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 border-b border-orange-200/50 bg-gradient-to-r from-orange-50/80 to-amber-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-orange-700">Menu Terlaris</CardTitle>
              <Award className="size-4 text-orange-600" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100/50 bg-gradient-to-b from-white/50 to-orange-50/20 max-h-[240px] overflow-hidden">
                {topProducts.length > 0 ? topProducts.map((p: any, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-orange-50/60 transition-colors duration-200 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "text-[9px] font-black w-4 shrink-0 group-hover:scale-125 transition-transform duration-200",
                        i === 0 ? "text-orange-500 drop-shadow-lg" : "text-gray-300"
                      )}>#{i + 1}</span>
                      <span className="text-[11px] font-black text-gray-800 uppercase truncate group-hover:text-gray-900 transition-colors">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-orange-600 shrink-0 group-hover:scale-110 transition-transform duration-200">{p.value}x</span>
                  </div>
                )) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-400">
                    <p className="text-[10px] font-bold uppercase">Belum ada data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}