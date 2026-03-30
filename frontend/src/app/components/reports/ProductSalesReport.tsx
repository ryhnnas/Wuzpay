import React, { useState, useEffect } from 'react';
import { Package, Calendar, ChevronLeft, ChevronRight, Loader2, TrendingUp, Award, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { reportsAPI } from '@/services/api';
import { format, endOfDay, startOfDay, parseISO, subDays } from 'date-fns';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';

export function ProductSalesReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('today');
  const [netProfitFromDB, setNetProfitFromDB] = useState(0);
  const [grossRevenueFromDB, setGrossRevenueFromDB] = useState(0);
  const [discountFromDB, setDiscountFromDB] = useState(0);
  
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  const loadData = async () => {
    setLoading(true);
    try {
      const rangeStart = startOfDay(parseISO(startDate));
      const rangeEnd = endOfDay(parseISO(endDate));

      // Hit Backend Hono untuk data agregasi MongoDB
      const [salesRes, summaryRes] = await Promise.all([
        reportsAPI.getProductSales(rangeStart, rangeEnd),
        reportsAPI.getSummary(rangeStart, rangeEnd)
      ]);

      setData(Array.isArray(salesRes.data) ? salesRes.data : []);
      
      // Sinkronisasi angka dengan dashboard utama WuzPay
      setNetProfitFromDB(summaryRes.totalProfit || 0); 
      setGrossRevenueFromDB(summaryRes.totalGrossRevenue || 0);
      setDiscountFromDB(summaryRes.totalDiscount || 0);

      setCurrentPage(1);
    } catch (err) {
      console.error("WuzPay Report Error:", err);
      toast.error("Gagal sinkronisasi laporan produk");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [startDate, endDate]);

  const handleFilterClick = (type: string) => {
    setActiveFilter(type);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (type === 'today') {
      setStartDate(todayStr); setEndDate(todayStr);
    } else if (type === 'week') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd')); setEndDate(todayStr);
    } else if (type === 'month') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd')); setEndDate(todayStr);
    }
  };

  const totalNetProfit = netProfitFromDB; 
  const totalGrossRevenue = grossRevenueFromDB;
  const totalDiscount = discountFromDB;

  const sortedData = [...data].sort((a: any, b: any) => b.qty - a.qty);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-sans bg-slate-50/50 min-h-screen">
      
      {/* HEADER & ANALYTICS CARDS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">
            Product <span className="text-orange-600">Earnings</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Analisa Laba Berdasarkan Penjualan Menu</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          {/* QUICK FILTERS */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[22px] border border-gray-100 shadow-sm w-full md:w-auto">
            {['today', 'week', 'month', 'custom'].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterClick(f)}
                className={cn(
                  "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                  activeFilter === f 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-100 scale-105" 
                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {f === 'today' ? 'Hari Ini' : f === 'week' ? '7 Hari' : f === 'month' ? '30 Hari' : 'Kustom'}
              </button>
            ))}

            {activeFilter === 'custom' && (
              <div className="flex items-center gap-3 px-4 animate-in slide-in-from-left-4 duration-500 border-l border-gray-100 ml-2">
                <input type="date" className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[110px] uppercase cursor-pointer" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span className="text-[10px] font-black text-gray-300">TO</span>
                <input type="date" className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[110px] uppercase cursor-pointer" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          {/* NET PROFIT HIGHLIGHT (WUZPAY BRANDING) */}
          <div className="bg-gray-900 text-white p-5 rounded-[32px] shadow-2xl flex items-center gap-6 min-w-[300px] group border-b-4 border-orange-600">
            <div className="size-14 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:rotate-12 transition-transform duration-500">
               <TrendingUp className="size-7 text-white" />
            </div>
            <div className="text-right flex-1">
              <p className="text-[9px] uppercase font-black tracking-widest text-gray-500 mb-1 leading-none">Net Earnings (Profit)</p>
              <p className="text-3xl font-black tracking-tighter leading-none italic">
                Rp {Math.round(totalNetProfit).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 p-6 rounded-[28px] shadow-sm flex items-center gap-4">
             <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><DollarSign className="size-5"/></div>
             <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Gross Revenue</p>
                <p className="text-lg font-black text-gray-900 tracking-tighter">Rp {Math.round(totalGrossRevenue).toLocaleString('id-ID')}</p>
             </div>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-[28px] shadow-sm flex items-center gap-4">
             <div className="size-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><Award className="size-5"/></div>
             <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Discounts</p>
                <p className="text-lg font-black text-red-500 tracking-tighter">- Rp {Math.round(totalDiscount).toLocaleString('id-ID')}</p>
             </div>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-[28px] shadow-sm flex items-center gap-4">
             <div className="size-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><Package className="size-5"/></div>
             <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Items Sold</p>
                <p className="text-lg font-black text-gray-900 tracking-tighter">{data.reduce((sum, it:any) => sum + it.qty, 0)} Pcs</p>
             </div>
          </div>
      </div>

      {/* TABLE DATA SECTION */}
      <Card className="rounded-[40px] border-none shadow-[0_10px_60px_rgba(0,0,0,0.04)] bg-white overflow-hidden">
        <CardHeader className="p-8 pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center text-gray-400">
            <Package className="mr-3 size-4 text-orange-600"/> Master Product Performance
          </CardTitle>
          
          {/* PAGINATION CONTROLS */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Page {currentPage} / {totalPages || 1}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="size-9 rounded-xl bg-gray-50 border border-gray-100" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="size-4 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="size-9 rounded-xl bg-gray-50 border border-gray-100" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="size-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[calc(100vh-450px)] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <th className="px-10 py-6">Nama Menu Produk</th>
                  <th className="px-8 py-6 text-center">Volume (Qty)</th>
                  <th className="px-8 py-6 text-right">Omzet Bruto</th>
                  <th className="px-10 py-6 text-right">Profit Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-32"><Loader2 className="size-10 text-orange-600 animate-spin mx-auto mb-4" /><p className="font-black text-[10px] uppercase tracking-widest text-gray-400 animate-pulse">Sinkronisasi Laba...</p></td></tr>
                ) : currentRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-32 text-gray-300 font-black uppercase tracking-widest italic text-[10px]">Belum ada aktivitas penjualan di periode ini.</td></tr>
                ) : currentRows.map((item: any, i) => {
                   const isFirst = i === 0 && currentPage === 1;
                   return (
                    <tr key={i} className="hover:bg-orange-50/20 transition-all group">
                      <td className="px-10 py-5">
                        <div className="flex items-center gap-4">
                          <span className={cn("text-[10px] font-black w-6", isFirst ? "text-orange-500" : "text-gray-300")}>{(currentPage - 1) * rowsPerPage + i + 1}</span>
                          <span className="font-black text-gray-900 uppercase text-xs italic tracking-tight">{item.name}</span>
                          {isFirst && <Award className="size-4 text-orange-500 fill-orange-500" />}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <Badge className={cn("font-black text-[11px] px-4 py-1 rounded-lg border-none shadow-sm", isFirst ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-500")}>
                          {item.qty}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-gray-400 text-xs tracking-tighter italic">Rp {Math.round(item.revenue).toLocaleString('id-ID')}</td>
                      <td className="px-10 py-5 text-right">
                        <div className="flex flex-col items-end">
                           <span className="font-black text-emerald-600 text-base tracking-tighter italic">Rp {Math.round(item.profit).toLocaleString('id-ID')}</span>
                           <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none mt-1">Earnings Captured</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center px-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">
        <p>Total {data.length} SKU Active in Reports</p>
        <p className="italic">WuzPay</p>
      </div>
    </div>
  );
}