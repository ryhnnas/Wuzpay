import React, { useState, useEffect } from 'react';
import { Package, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { reportsAPI } from '@/services/api';
import { format, endOfDay, startOfDay, parseISO, subDays } from 'date-fns';
import { cn } from '@/app/components/ui/utils';

export function ProductSalesReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('today'); // today, week, month, custom
  const [netProfitFromDB, setNetProfitFromDB] = useState(0);
  const [grossRevenueFromDB, setGrossRevenueFromDB] = useState(0);
  const [discountFromDB, setDiscountFromDB] = useState(0);
  
  // State Tanggal
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  const loadData = async () => {
    setLoading(true);
    try {
      const rangeStart = startOfDay(parseISO(startDate));
      const rangeEnd = endOfDay(parseISO(endDate));

      const [salesRes, summaryRes] = await Promise.all([
        reportsAPI.getProductSales(rangeStart, rangeEnd),
        reportsAPI.getSummary(rangeStart, rangeEnd)
      ]);

      setData(salesRes.data || []);
      
      // Ambil nilai ringkasan dari summary
      setNetProfitFromDB(summaryRes.totalProfit || 0); 
      setGrossRevenueFromDB(summaryRes.totalGrossRevenue || 0);
      setDiscountFromDB(summaryRes.totalDiscount || 0);

      setCurrentPage(1);
    } catch (err) {
      console.error("Gagal sinkronisasi data:", err);
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
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'week') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (type === 'month') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    }
  };

  // Logika Kalkulasi Ringkasan & Pagination
  const totalGrossRevenueFromTable = data.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0);
  const totalGrossRevenue = grossRevenueFromDB || totalGrossRevenueFromTable;

  // Profit Neto 
  const totalNetProfit = netProfitFromDB; 

  // Diskon (langsung dari ringkasan transaksi)
  const totalDiscount = discountFromDB;

  // 4. SORTING (Tetap dipertahankan biar yang paling laris di atas)
  const sortedData = [...data].sort((a: any, b: any) => b.qty - a.qty);
  
  // 5. PAGINATION (Tetap dipertahankan)
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {/* KIRI: JUDUL */}
        <div className="min-w-[200px]">
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic underline decoration-orange-500 underline-offset-4">Analisa Keuntungan</h2>
          <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">Berdasarkan cost_at_sale</p>
        </div>
        
        {/* TENGAH: QUICK FILTERS */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'week', label: 'Minggu Ini' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'custom', label: 'Custom' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => handleFilterClick(f.id)}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeFilter === f.id 
                  ? "bg-white text-orange-600 shadow-md scale-105" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {f.label}
            </button>
          ))}

          {/* INPUT TANGGAL (Hanya muncul jika custom) */}
          {activeFilter === 'custom' && (
            <div className="flex items-center gap-2 px-3 animate-in slide-in-from-left-2 duration-300 border-l border-gray-300 ml-2">
              <input 
                type="date" 
                className="text-xs font-black bg-transparent border-none p-0 focus:ring-0 w-[115px] uppercase" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-[10px] font-black text-gray-400">S/D</span>
              <input 
                type="date" 
                className="text-xs font-black bg-transparent border-none p-0 focus:ring-0 w-[115px] uppercase" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* KANAN: BADGE PROFIT GANDA */}
        <div className="flex flex-col gap-2 min-w-[240px]">
          {/* Profit Bersih (Wajib Sama dengan Dashboard) */}
          <div className="bg-green-600 text-white p-4 rounded-[24px] shadow-xl border-b-4 border-green-800 flex flex-col items-end">
              <div className="flex justify-between w-full items-center mb-1">
                <span className="text-[8px] bg-green-700 px-2 py-0.5 rounded-full font-black italic">NETO</span>
                <p className="text-[9px] uppercase font-black opacity-80 tracking-widest">Profit Bersih (Dashboard)</p>
              </div>
              {/* Pakai Math.round biar koma .5 atau .11 ilang */}
              <p className="text-2xl font-black italic">
                Rp {Math.round(totalNetProfit).toLocaleString('id-ID')}
              </p>
            </div>

          {/* Info Tambahan: Bruto & Diskon */}
          <div className="bg-white border border-gray-100 p-3 rounded-2xl flex justify-between shadow-sm">
            <div className="text-left">
              <p className="text-[8px] font-black text-gray-400 uppercase">Bruto (Barang)</p>
              <p className="text-[11px] font-black text-gray-700">
                Rp {Math.round(totalGrossRevenue).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-right border-l pl-4">
              <p className="text-[8px] font-black text-red-400 uppercase">Potongan/Diskon</p>
              <p className="text-[11px] font-black text-red-500">
                - Rp {Math.round(totalDiscount).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card className="border-none shadow-2xl shadow-gray-100 rounded-[30px] overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 flex flex-row items-center justify-between px-8 py-6">
          <CardTitle className="text-[10px] font-black uppercase flex items-center text-gray-400 tracking-[0.3em]">
            <Package className="mr-3 size-4 text-orange-500"/> List Penjualan Produk
          </CardTitle>
          
          {/* PAGINATION CONTROLS */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-400 uppercase">Hal {currentPage} / {totalPages || 1}</span>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="size-8 rounded-lg"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="size-8 rounded-lg"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-[32px] border border-gray-100 bg-white shadow-2xl shadow-gray-100 overflow-auto max-h-[calc(100vh-250px)]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                <tr className="bg-gray-200/80 backdrop-blur-md text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <th className="px-8 py-5 text-left rounded-tl-[32px]">Nama Produk</th>
                  <th className="px-8 py-5 text-center">Qty Terjual</th>
                  <th className="px-8 py-5 text-right font-orange-600">Omzet Bruto</th>
                  <th className="px-8 py-5 text-right rounded-tr-[32px]">Profit Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-24 animate-pulse font-black text-gray-300 uppercase text-xs tracking-[0.5em]">Mengkalkulasi Data...</td></tr>
                ) : currentRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-24 text-gray-400 italic font-medium">Belum ada transaksi di periode ini.</td></tr>
                ) : currentRows.map((item: any, i) => (
                  <tr key={i} className="hover:bg-orange-50/30 transition-all group">
                    <td className="px-8 py-4">
                      <div className="flex items-center">
                        <span className="text-[10px] font-black text-gray-300 mr-4 group-hover:text-orange-500 transition-colors">
                          {(currentPage - 1) * rowsPerPage + i + 1}
                        </span>
                        <span className="font-bold text-gray-700 uppercase tracking-tighter text-sm">{item.name}</span>
                      </div>
                    </td>
                      <td className="px-8 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl font-black text-[10px] transition-all",
                          i === 0 && currentPage === 1 
                            ? "bg-orange-600 text-white shadow-lg" // Juara 1 dapet warna Orange Mledak
                            : "bg-gray-100 text-gray-500 group-hover:bg-white"
                        )}>
                          {item.qty}
                        </span>
                      </td>
                    <td className="px-8 py-4 text-right text-gray-400 font-medium">Rp {item.revenue.toLocaleString()}</td>
                    <td className="px-8 py-4 text-right">
                      <span className="font-black text-green-600 italic text-base">Rp {item.profit.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* FOOTER INFO */}
      <div className="flex justify-between items-center px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
        <p>Total {data.length} Produk Terjual</p>
        <p>Nexera POS v3.0</p>
      </div>
    </div>
  );
}