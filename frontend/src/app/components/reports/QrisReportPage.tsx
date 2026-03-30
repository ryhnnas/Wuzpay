import React, { useEffect, useState } from 'react';
import { QrCode, Calendar, Loader2, ArrowUpRight, Search, Download, AlertCircle, Eye, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button'; // <--- BIANG KEROKNYA KETEMU MANG!
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog"; // <--- BIAR GAK CRASH PAS KLIK DETAIL
import { reportsAPI } from '@/services/api';
import { format, subDays, isValid } from 'date-fns';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';

export function QrisReportPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeFilter, setActiveFilter] = useState('today');
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const fetchQRIS = async () => {
    setLoading(true);
    try {
      const res: any = await reportsAPI.getQrisReports(startDate, endDate);
      setTransactions(res?.data || []);
      setSummary(res?.summary || { totalAmount: 0, count: 0 });
    } catch (error) {
      toast.error("Gagal memuat mutasi QRIS");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRIS();
  }, [startDate, endDate]);

  const handleFilter = (type: string) => {
    setActiveFilter(type);
    const today = new Date();
    if (type === 'today') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (type === 'week') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const formatSafeDate = (dateStr: any) => {
    try {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return isValid(date) ? format(date, 'dd MMM yyyy, HH:mm') : "-";
    } catch (e) { return "-"; }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">
            QRIS <span className="text-orange-600">Settlement</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Monitoring Pembayaran Digital WuzPay</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-[22px] shadow-sm border border-gray-100">
          {['today', 'week', 'custom'].map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeFilter === f ? "bg-orange-600 text-white shadow-lg" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              {f === 'today' ? 'Hari Ini' : f === 'week' ? '7 Hari' : 'Kustom'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[32px] border-none shadow-2xl bg-gray-900 text-white p-2 relative overflow-hidden group">
          <CardContent className="pt-6 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Total QRIS Masuk</p>
            <h3 className="text-3xl font-black italic tracking-tighter text-orange-500">
              Rp {summary.totalAmount.toLocaleString('id-ID')}
            </h3>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-none shadow-sm bg-white p-2">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Transaksi</p>
            <h3 className="text-3xl font-black italic tracking-tighter text-gray-900">{summary.count} TX</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Waktu & Vendor</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">No. Struk</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Nominal</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin size-8 mx-auto text-orange-600" /></td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-gray-300">Tidak ada mutasi QRIS</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-orange-50/10 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-gray-500 italic">{formatSafeDate(tx.createdAt)}</span>
                      <div className="flex mt-1">
                        <Badge className={cn(
                          "text-[8px] font-black uppercase px-2 py-0 border-none",
                          tx.qris_vendor === 'gopay' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                        )}>
                          {tx.qris_vendor === 'gopay' ? 'GoPay' : 'Midtrans'}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-black text-xs text-gray-800 uppercase italic">
                    {tx.receipt_number || "NO-STRUK"}
                  </td>
                  <td className="px-8 py-5 text-right font-black text-orange-600 text-sm">
                    Rp {tx.total_amount?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTx(tx)} className="size-8 p-0 rounded-full hover:bg-orange-600 hover:text-white">
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DIALOG DETAIL */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl bg-white max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
              Payment <span className="text-orange-600">Summary</span>
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-6 pt-4 font-sans">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Receipt</p>
                  <p className="font-black text-gray-900 uppercase italic">{selectedTx.receipt_number}</p>
                </div>
                <Badge className="bg-orange-600 text-white font-black text-[9px] uppercase px-3 py-1">SUCCESS</Badge>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Items</p>
                {selectedTx.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs font-black uppercase italic">
                    <span className="text-gray-500">{item.quantity}x {item.name}</span>
                    <span>Rp {(item.quantity * item.price_at_sale).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Settlement</p>
                   <p className="text-3xl font-black italic tracking-tighter text-orange-600 leading-none">
                     Rp {selectedTx.total_amount?.toLocaleString('id-ID')}
                   </p>
                </div>
              </div>
              <Button onClick={() => setSelectedTx(null)} className="w-full h-12 bg-gray-900 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px]">
                Close Record
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}