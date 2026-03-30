import React, { useState, useEffect } from 'react';
import { 
  QrCode, Calendar, Search, FileText, 
  ChevronRight, Filter, Download 
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { reportsAPI } from '@/services/api';
import { format, subDays } from 'date-fns';
import { cn } from '../ui/utils';

export function QrisReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeFilter, setActiveFilter] = useState('today');
  
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const fetchQRIS = async () => {
    setLoading(true);
    try {
      // Karena startDate sekarang string, kita bungkus new Date() saat kirim ke API
      const res = await reportsAPI.getQrisReports(new Date(startDate), new Date(endDate), limit);
      setData(res.data || []); 
    } catch (err) {
      console.error("Gagal fetch QRIS:", err);
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => { 
        fetchQRIS(); 
    }, [limit, startDate, endDate]);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Laporan QRIS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-orange-600 text-white">
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase opacity-70">Total QRIS Masuk</p>
                <h3 className="text-2xl font-black">
                  Rp {data.reduce((acc, curr) => acc + curr.total_amount, 0).toLocaleString()}
                </h3>
              </CardContent>
            </Card>
          </div>
          <p className="text-gray-500 text-sm">Pantau pembayaran non-tunai (Midtrans / Gopay)</p>
        </div>
        <div className="flex gap-2">
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
          <select 
            className="border rounded-md px-3 py-1 text-sm"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10 Data</option>
            <option value={20}>20 Data</option>
            <option value={50}>50 Data</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th className="px-6 py-3">Waktu</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Ref ID</th>
                <th className="px-6 py-3">Nominal</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada transaksi QRIS hari ini.</td></tr>
              ) : data.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTx(tx)}>
                  <td className="px-6 py-4">{format(new Date(tx.created_at), 'HH:mm')}</td>
                  <td className="px-6 py-4 font-medium">{tx.customers?.name || 'Umum'}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    <span className="text-[11px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-500 border border-gray-200">
                      {tx.reference_id || tx.id.slice(0, 8) || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-orange-600">Rp {tx.total_amount.toLocaleString()}</span>
                      {/* TAMBAHKAN INI: Biar tahu ini GoPay Manual atau Midtrans */}
                      <span className="text-[9px] text-gray-400 uppercase font-black">
                        via {tx.payment_method === 'gopay' ? 'GoPay Business' : 'Midtrans'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] uppercase font-bold">
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right"><ChevronRight className="size-4 text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL STRUK SEDERHANA */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm bg-white">
            <CardHeader className="text-center border-b italic">
              <CardTitle className="text-lg">SEBLAK MLEDAK</CardTitle>
              <p className="text-xs text-gray-400">Bukti Pembayaran QRIS</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4 font-mono text-sm">
              <div className="flex justify-between"><span>Waktu:</span> <span>{format(new Date(selectedTx.created_at), 'dd/MM/yy HH:mm')}</span></div>
              <div className="flex justify-between"><span>Ref ID:</span> <span className="text-[10px]">{selectedTx.reference_id || selectedTx.id.slice(0,8)}</span></div>
              <div className="border-t border-dashed pt-4 flex justify-between font-bold text-lg">
                <span>TOTAL</span> <span>Rp {selectedTx.total_amount.toLocaleString()}</span>
              </div>
              <div className="text-center bg-gray-100 py-2 rounded text-[10px]">PEMBAYARAN QRIS BERHASIL</div>
              <Button className="w-full" onClick={() => setSelectedTx(null)}>Tutup</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}