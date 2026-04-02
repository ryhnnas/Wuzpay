import React, { useEffect, useState } from 'react';
import { Layers, Calendar, Loader2, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { reportsAPI } from '../../../services/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../ui/utils';

export function CategorySalesReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeFilter, setActiveFilter] = useState('today');

  const loadData = async () => {
    setLoading(true);
    try {
      // SINKRONISASI TIMEZONE: Paksa jam 00:00:00 di awal dan 23:59:59 di akhir
      // Pakai format ISO String agar MongoDB Atlas ngerti range-nya
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);

      const res: any = await reportsAPI.getCategorySales(sDate.toISOString(), eDate.toISOString());
      
      // Ambil array data dari .data atau .report atau langsung res
      const reportData = res?.data || res?.report || (Array.isArray(res) ? res : []);
      setData(reportData);
    } catch (error) {
      console.error('DATABASE ERROR:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleFilterClick = (type: string) => {
    setActiveFilter(type);
    const today = new Date();
    
    if (type === 'today') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (type === 'week') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (type === 'month') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  // Kalkulasi total dari data yang sudah difilter di MongoDB
  const totalRevenue = data.reduce((sum, item) => sum + (Number(item.revenue || item.total_amount) || 0), 0);
  const totalProfit = data.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-orange-600 uppercase italic">
            Category <span className="text-orange-600">Sales</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic underline decoration-orange-500 decoration-2">
            Real-time Aggregation Module v3.0
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white p-2 rounded-[22px] shadow-sm border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar">
            {['today', 'week', 'month', 'custom'].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterClick(f)}
                className={cn(
                  "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                  activeFilter === f 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-100" 
                    : "text-gray-400 hover:text-orange-600"
                )}
              >
                {f === 'today' ? 'Hari Ini' : f === 'week' ? '7 Hari' : f === 'month' ? '30 Hari' : 'Kustom'}
              </button>
            ))}

            {activeFilter === 'custom' && (
              <div className="flex items-center gap-3 px-4 border-l border-gray-100 ml-2 animate-in slide-in-from-left-2">
                <input type="date" className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[110px] uppercase text-gray-700" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span className="text-[10px] font-black text-gray-300">TO</span>
                <input type="date" className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[110px] uppercase text-gray-700" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          <div className="bg-orange-600 text-white p-5 rounded-[28px] shadow-2xl flex items-center gap-6 min-w-[280px]">
            <div className="size-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20 shrink-0">
               <ArrowUpRight className="size-6 text-white" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-black tracking-widest text-gray-500 mb-1 leading-none">Net Revenue</p>
              <p className="text-2xl font-black tracking-tighter leading-none">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-[40px] border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
        <CardHeader className="p-8 pb-4 border-b border-gray-50 flex flex-row items-center justify-between bg-gray-50/30">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center text-gray-400">
            <Layers className="mr-3 size-4 text-orange-600" />
            Category Summary Report
          </CardTitle>
          <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full">
            EST. PROFIT: Rp {totalProfit.toLocaleString('id-ID')}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Kategori</th>
                  <th className="px-6 py-6 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Qty Terjual</th>
                  <th className="px-6 py-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Omzet Bruto</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Laba Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="py-32 text-center"><Loader2 className="size-10 text-orange-600 animate-spin mx-auto mb-4" /><p className="font-black text-[10px] uppercase tracking-widest text-gray-400 animate-pulse">Syncing Database...</p></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={4} className="py-32 text-center"><Layers className="size-12 text-gray-100 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-gray-300">ZonK! Tidak ada data di periode ini.</p></td></tr>
                ) : data.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-orange-50/20 transition-all group">
                    <td className="px-10 py-6 font-black text-gray-800 uppercase text-xs italic tracking-tight">{item.category || item.name || 'Umum'}</td>
                    <td className="px-6 py-6 text-center">
                       <Badge variant="outline" className="font-black text-[11px] px-3 border-gray-200 bg-white text-gray-500 shadow-sm">
                          {Number(item.qty || item.total_qty || 0)} UNIT
                       </Badge>
                    </td>
                    <td className="px-6 py-6 text-right font-black text-orange-600 text-sm tracking-tighter">
                      Rp {(Number(item.revenue || item.total_amount) || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex flex-col items-end">
                          <span className="font-black text-emerald-600 text-sm tracking-tighter italic">
                             Rp {(Number(item.profit) || 0).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Earnings</span>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="p-8 rounded-[32px] bg-orange-50/50 border border-orange-100/50 border-dashed text-center">
         <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em]">WUZPAY SECURE REPORTING MODULE</p>
      </div>
    </div>
  );
}