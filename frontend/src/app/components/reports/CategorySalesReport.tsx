import React, { useEffect, useState } from 'react';
import { Layers, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { reportsAPI } from '../../../services/api';
import { format, subDays } from 'date-fns';
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
      const res: any = await reportsAPI.getCategorySales(new Date(startDate), new Date(endDate));
      setData(res.data || []);
    } catch (error) {
      console.error('Gagal memuat laporan kategori:', error);
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
    // Jika 'custom', biarkan startDate & endDate tetap pada nilai terakhirnya
  };

  const totalRevenue = data.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Penjualan Per Kategori</h2>
          <p className="text-gray-500 text-sm">Rekap jumlah, omzet, dan profit berdasarkan kategori</p>
        </div>

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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-[10px] font-black text-gray-300">S/D</span>
              <input 
                type="date" 
                className="text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[115px] uppercase text-gray-700 cursor-pointer" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="bg-orange-600 text-white p-4 rounded-xl shadow-lg shadow-orange-100">
          <p className="text-[10px] uppercase font-bold opacity-80">Total Omzet Kategori</p>
          <p className="text-xl font-black">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center">
            <Layers className="mr-2 size-4 text-orange-500" />
            Ringkasan Penjualan Kategori
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left">Kategori</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-right">Omzet</th>
                <th className="px-6 py-4 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">Belum ada data di periode ini.</td></tr>
              ) : data.map((item, index) => (
                <tr key={`${item.category}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{item.category}</td>
                  <td className="px-6 py-4 text-center">{Number(item.qty || 0)}</td>
                  <td className="px-6 py-4 text-right">Rp {(Number(item.revenue) || 0).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">Rp {(Number(item.profit) || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
