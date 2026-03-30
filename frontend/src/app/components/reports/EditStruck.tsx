import { useState, useEffect, useRef } from 'react';
import { X, Pencil, Trash2, Check, Printer, Save, Download, Eye, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { productsAPI, transactionsAPI, settingsAPI } from '@/services/api'; 
import { toast } from 'sonner';
import { ReceiptTemplate } from '../utils/ReceiptTemplate';
import { handleGlobalPrint } from '../utils/printHandler';
import { cn } from '@/app/components/ui/utils';
import { Badge } from "@/app/components/ui/badge";

export function EditStruk({ transactionId, onClose }: { transactionId: string, onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [receiptConfig, setReceiptConfig] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ==================== 1. LOAD SETTING & DATA ====================
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [transData, prodData, settingsData] = await Promise.all([
          transactionsAPI.getById(transactionId),
          productsAPI.getAll(),
          settingsAPI.getReceiptSettings()
        ]);

        // MAPPING ULANG UNTUK MONGODB SCHEMA
        const mappedItems = (transData.items || []).map((item: any) => {
          const findProduct = (prodData || []).find((p: any) => (p._id || p.id) === item.product_id);
          return {
            ...item,
            id: item._id || item.id, // Pastikan ada ID untuk key React
            product_name: item.product_name || findProduct?.name || 'Menu WuzPay'
          };
        });

        setTransaction(transData);
        setItems(mappedItems);
        setProducts(prodData || []);
        if (settingsData) setReceiptConfig(settingsData);
      } catch (e) {
        toast.error("Gagal sinkronisasi data struk");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [transactionId]);

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-12 text-orange-600 animate-spin" />
        <p className="font-black text-white uppercase text-xs tracking-widest animate-pulse">Mengambil Data Struk...</p>
      </div>
    </div>
  );

  if (!transaction) return null;

  // Hitung total belanja secara real-time
  const currentTotal = items.reduce((sum, it) => sum + (it.quantity * (it.price_at_sale || 0)), 0);

  // ==================== 2. DOWNLOAD JPG ====================
  const downloadReceipt = async () => {
    if (receiptRef.current === null) return;
    const toastId = toast.loading("MENYIAPKAN GAMBAR...");
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toJpeg(receiptRef.current, { 
        quality: 1.0, 
        backgroundColor: '#ffffff', 
        pixelRatio: 3 // Kualitas lebih tajam untuk WuzPay
      });
      const link = document.createElement('a');
      link.download = `WUZPAY-${transaction.receipt_number}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("STRUK BERHASIL DIUNDUH", { id: toastId });
    } catch (err) {
      toast.error("GAGAL MENGUNDUH", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // ==================== 3. SIMPAN KE DATABASE ====================
  const handleSave = async () => {
    const toastId = toast.loading("MENYIMPAN KE CLOUD...");
    try {
      const updatedPayload = {
        ...transaction,           
        items: items.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          price_at_sale: it.price_at_sale,
          subtotal: it.quantity * it.price_at_sale
        })),             
        total_amount: currentTotal 
      };

      await transactionsAPI.updateItems(transactionId, updatedPayload);
      
      toast.success("DATA WUZPAY BERHASIL DIPERBARUI", { id: toastId });
      setTimeout(() => onClose(), 500);
    } catch (err) {
      toast.error("GAGAL UPDATE DATABASE", { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-lg z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500 font-sans">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[48px] overflow-hidden flex shadow-2xl border border-white/10">
        
        {/* PANEL KIRI: LIST ITEM EDITOR */}
        <div className="flex-[1.2] flex flex-col border-r border-gray-100 bg-white relative">
          <div className="p-10 border-b flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-black text-3xl uppercase tracking-tighter italic text-gray-900">Editor <span className="text-orange-600">Struk</span></h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2 italic">Ref: {transaction.receipt_number || 'WUZ-NEW'}</p>
            </div>
            <Button variant="ghost" onClick={onClose} className="rounded-2xl size-12 hover:bg-red-50 hover:text-red-600 transition-all">
              <X className="size-6" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50">
                <tr>
                  <th className="pb-6">NAMA MENU</th>
                  <th className="pb-6 w-24 text-center">QTY</th>
                  <th className="pb-6 text-right">SUBTOTAL</th>
                  <th className="pb-6 text-right pr-4">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const itemId = item._id || item.id;
                return (
                  <tr key={itemId} className="group hover:bg-orange-50/30 transition-all">
                    <td className="py-5"> 
                      {editingId === itemId ? (
                        <select 
                          className="w-full h-12 rounded-2xl border-none bg-gray-100 text-[11px] font-black uppercase px-4 focus:ring-2 focus:ring-orange-500 transition-all"
                          value={item.product_id}
                          onChange={(e) => {
                            const p = products.find(prod => (prod._id || prod.id) === e.target.value);
                            setItems(items.map(it => (it._id || it.id) === itemId ? { 
                              ...it, product_id: (p._id || p.id), product_name: p.name, price_at_sale: p.price 
                            } : it));
                          }}
                        >
                          {products.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 uppercase text-xs tracking-tight italic">{item.product_name || 'Item WuzPay'}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">ID: {String(item.product_id).substring(18)}</span>
                        </div>
                      )}
                    </td>
                    
                    <td className="py-5 text-center">
                      {editingId === itemId ? (
                        <Input 
                          type="number" 
                          className="h-12 w-20 mx-auto text-center font-black bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-orange-500" 
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setItems(items.map(it => (it._id || it.id) === itemId ? { ...it, quantity: val } : it));
                          }}
                        />
                      ) : (
                        <Badge className="bg-orange-600 text-white font-black text-[10px] px-3 py-1 rounded-lg italic">x{item.quantity}</Badge>
                      )}
                    </td>
                    
                    <td className="py-5 text-right font-black text-gray-900 text-sm tracking-tighter italic">
                      {new Intl.NumberFormat('id-ID').format(item.quantity * (item.price_at_sale || 0))}
                    </td>
                    
                    <td className="py-5 text-right pr-4">
                      <div className="flex justify-end gap-2">
                        {editingId === itemId ? (
                          <Button size="icon" className="size-9 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all" onClick={() => setEditingId(null)}>
                            <Check className="size-4 stroke-[3px]" />
                          </Button>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="size-9 text-blue-500 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-xl transition-all" onClick={() => setEditingId(itemId)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-9 text-red-400 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl transition-all" onClick={() => {
                                if(confirm('Hapus menu ini dari struk?')) {
                                  setItems(items.filter(it => (it._id || it.id) !== itemId));
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* AREA KONTROL BAWAH */}
          <div className="p-10 bg-gray-50/50 border-t space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => handleGlobalPrint({...transaction, items, total_amount: currentTotal})}
                className="bg-orange-600 hover:bg-orange-700 text-white font-black rounded-[24px] h-16 uppercase tracking-widest text-[10px] shadow-xl shadow-orange-100 transition-all active:scale-95"
              >
                <Printer className="mr-3 size-5" /> Cetak Thermal
              </Button>

              <Button 
                variant="outline"
                disabled={isProcessing}
                onClick={downloadReceipt} 
                className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-[24px] font-black h-16 uppercase tracking-widest text-[10px] transition-all"
              >
                <Download className="mr-3 size-5" /> {isProcessing ? 'Processing...' : 'Simpan ke Galeri'}
              </Button>
            </div>

            <Button 
              onClick={handleSave}
              className="w-full bg-gray-900 hover:bg-orange-600 text-white font-black rounded-[24px] h-20 shadow-2xl uppercase tracking-[0.4em] text-xs transition-all active:scale-95 flex items-center justify-center gap-4"
            >
              <Save className="size-6 text-orange-500" /> Sinkronkan Perubahan
            </Button>
          </div>
        </div>

        {/* PANEL KANAN: LIVE PREVIEW */}
        <div className="flex-1 bg-gray-100 p-12 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar">
          <div className="mb-8 bg-gray-900 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3">
             <Eye className="size-4 text-orange-500 animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-[0.4em]">Live Struk Preview</span>
          </div>

          <div className="relative group transition-all duration-700 hover:scale-[1.03] origin-top h-fit">
            <div className="absolute inset-0 bg-black/10 rounded-sm blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div 
              ref={receiptRef} 
              className="relative bg-white p-3 rounded-sm shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)]"
              style={{ width: 'fit-content' }}
            >
              <ReceiptTemplate 
                transaction={{...transaction, items, total_amount: currentTotal}} 
                settings={receiptConfig} 
              />
            </div>
          </div>
          
          <p className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] italic">WuzPay Engine 2026</p>
        </div>

      </div>
    </div>
  );
}