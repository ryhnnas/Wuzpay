import { useState, useEffect, useRef } from 'react';
import { X, Pencil, Trash2, Check, Printer, Save, Download, Eye } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { productsAPI, transactionsAPI, settingsAPI } from '@/services/api'; 
import { toast } from 'sonner';
import { ReceiptTemplate } from '../utils/ReceiptTemplate';
import { handleGlobalPrint } from '../utils/printHandler';
import { cn } from '@/app/components/ui/utils';

export function EditStruk({ transactionId, onClose }: { transactionId: string, onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [receiptConfig, setReceiptConfig] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // ==================== 1. LOAD SETTING DARI DATABASE (BIAR SINKRON) ====================
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsAPI.getReceiptSettings();
        if (data) {
          setReceiptConfig(data);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi setting pusat");
      }
    };
    loadSettings();
  }, []);

  // ==================== 2. LOAD DATA TRANSAKSI & PRODUK ====================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transData, prodData] = await Promise.all([
          transactionsAPI.getById(transactionId),
          productsAPI.getAll(),
        ]);

        // MAPPING ULANG: Kita isi product_name yang NULL itu pake nama asli dari tabel produk
        const mappedItems = (transData.items || []).map((item: any) => {
          // Cari produk yang ID-nya sama di daftar produk (prodData)
          const findProduct = (prodData || []).find((p: any) => p.id === item.product_id);
          
          return {
            ...item,
            // Kalo product_name di DB null, ambil p.name dari daftar produk
            product_name: item.product_name || findProduct?.name || 'Menu Tidak Terdaftar'
          };
        });

        setTransaction(transData);
        setItems(mappedItems); // <--- Sekarang items udah ada namanya!
        setProducts(prodData || []);
      } catch (e) {
        toast.error("Gagal memuat data transaksi");
      }
    };
    fetchData();
  }, [transactionId]);

  if (!transaction) return null;

  // Hitung total belanja secara real-time saat item diubah
  const currentTotal = items.reduce((sum, it) => sum + (it.quantity * (it.price_at_sale || 0)), 0);

  // ==================== 3. FUNGSI DOWNLOAD STRUK JPG ====================
  const downloadReceipt = async () => {
    if (receiptRef.current === null) return;
    const toastId = toast.loading("MENGONVERSI STRUK...");
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      const dataUrl = await toJpeg(receiptRef.current, { 
        quality: 1.0, 
        backgroundColor: '#ffffff', 
        pixelRatio: 2 
      });
      const link = document.createElement('a');
      link.download = `STRUK-${transaction.receipt_number}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("STRUK BERHASIL DIUNDUH", { id: toastId });
    } catch (err) {
      toast.error("GAGAL MENGUNDUH", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // ==================== 4. FUNGSI SIMPAN PERUBAHAN KE DATABASE ====================
  const handleSave = async () => {
    const toastId = toast.loading("MENYIMPAN PERUBAHAN...");
    try {
      // 1. Siapkan payload lengkap
      const updatedPayload = {
        ...transaction,           
        items: items,             
        total_amount: currentTotal 
      };

      // 2. Kirim ke API (Panggil fungsi .update yang baru kita ganti namanya)
      await transactionsAPI.updateItems(transactionId, updatedPayload);
      
      toast.success("BERHASIL DISIMPAN KE DATABASE", { id: toastId });
      setTimeout(() => onClose(), 500);
    } catch (err) {
      console.error("Detail Error Simpan:", err); 
      toast.error("GAGAL MENYIMPAN", { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[40px] overflow-hidden flex shadow-2xl border border-white/20">
        
        {/* ================= PANEL KIRI: EDITOR & KONTROL ================= */}
        <div className="flex-[1.4] flex flex-col border-r border-gray-100 bg-gray-50/50 relative">
          {/* Header Panel Kiri */}
          <div className="p-8 border-b bg-white flex justify-between items-center">
            <div>
              <h3 className="font-black text-2xl uppercase tracking-tighter italic text-gray-900">Editor Struk</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest italic shadow-sm shadow-orange-100 animate-pulse">Live</span>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{transaction.receipt_number}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} className="rounded-full size-12 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 p-0">
              <X className="size-6" />
            </Button>
          </div>

          {/* Area Tabel Item */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <table className="w-full text-left">
              <thead className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <tr>
                  <th className="pb-4 text-left">Nama Menu</th>
                  <th className="pb-4 w-20 text-center">Qty</th>
                  <th className="pb-4 text-right">Subtotal</th>
                  <th className="pb-4 text-right px-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="group bg-white/40 hover:bg-white transition-all">
                  <td className="py-2.5 px-2"> 
                    {editingId === item.id ? (
                      <select 
                        className="w-full h-10 rounded-xl border-none bg-white shadow-sm text-[11px] font-black uppercase px-3 focus:ring-2 focus:ring-orange-500"
                        value={item.product_id}
                        onChange={(e) => {
                          const p = products.find(prod => prod.id === e.target.value);
                          setItems(items.map(it => it.id === item.id ? { 
                            ...it, product_id: p.id, product_name: p.name, price_at_sale: p.price 
                          } : it));
                        }}
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                      </select>
                    ) : (
                      <p className="text-[11px] font-black uppercase text-gray-700 tracking-tight leading-none pl-2">{item.product_name || item.name || item.nama_produk || 'Menu Kosong'}</p>
                    )}
                  </td>
                  
                  <td className="py-2.5 text-center">
                    {editingId === item.id ? (
                      <Input 
                        type="number" 
                        className="h-10 w-16 mx-auto text-center font-black bg-white border-none rounded-xl focus:ring-2 focus:ring-orange-500 shadow-sm" 
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setItems(items.map(it => it.id === item.id ? { ...it, quantity: val } : it));
                        }}
                      />
                    ) : (
                      <span className="font-black text-orange-600 bg-orange-100/50 px-3 py-1.5 rounded-lg text-[9px]">{item.quantity}X</span>
                    )}
                  </td>
                  
                  <td className="py-2.5 text-right font-black text-gray-900 text-xs tracking-tighter italic">
                    {new Intl.NumberFormat('id-ID').format(item.quantity * (item.price_at_sale || 0))}
                  </td>
                  
                  <td className="py-2.5 text-right px-4">
                    <div className="flex justify-end gap-1.5">
                      {editingId === item.id ? (
                        <Button 
                          size="icon" 
                          className="size-8 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all active:scale-90" 
                          onClick={() => setEditingId(null)}
                        >
                          <Check className="size-4" />
                        </Button>
                      ) : (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="size-8 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all" 
                            onClick={() => setEditingId(item.id)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="size-8 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-all" 
                            onClick={() => {
                              if(confirm('Hapus menu ini dari struk?')) {
                                setItems(items.filter(it => it.id !== item.id));
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {/* AREA 3 TOMBOL: CONTROL CENTER */}
          <div className="p-8 bg-white border-t space-y-3 shadow-[0_-20px_40px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleGlobalPrint(transaction)} // Kirim data transaksi terbaru
                className="bg-orange-600 hover:bg-orange-700 text-white font-black rounded-[18px] h-14 uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-orange-100 transition-all active:scale-95"
              >
                <Printer className="mr-2 size-4" /> Cetak Thermal
              </Button>

              <Button 
                variant="outline"
                disabled={isProcessing}
                onClick={downloadReceipt} 
                className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-[18px] font-black h-14 uppercase tracking-[0.2em] text-[10px] transition-all"
              >
                <Download className="mr-2 size-4" /> {isProcessing ? 'Proses...' : 'Unduh JPG'}
              </Button>
            </div>

            <Button 
              onClick={handleSave}
              className="w-full bg-gray-600 hover:bg-black text-white font-black rounded-[18px] h-16 shadow-2xl uppercase tracking-[0.3em] text-xs transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Save className="size-5 text-orange-500" /> Simpan Perubahan
            </Button>
          </div>
        </div>

        {/* ================= PANEL KANAN: LIVE PREVIEW ================= */}
        <div className="flex-1 bg-gray-200/50 p-12 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar">
          <div className="mb-6 flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full border border-gray-200 shadow-sm backdrop-blur-sm">
             <Eye className="size-3 text-gray-400" />
             <span className="text-[8px] font-black uppercase text-gray-400 tracking-[0.3em]">Live Preview Area</span>
          </div>

          {/* Receipt Preview */}
          <div className="relative group transition-all duration-500 hover:scale-[1.02] origin-top h-fit">
            <div className="absolute inset-0 bg-black/5 rounded-sm blur-2xl group-hover:bg-black/10 transition-colors" />
            <div 
              ref={receiptRef} 
              className="relative bg-white p-2 rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5"
              style={{ width: 'fit-content' }}
            >
              <ReceiptTemplate 
                transaction={{...transaction, items, total_amount: currentTotal}} 
                settings={receiptConfig} 
              />
            </div>
          </div>
          
          <div className="mt-10 opacity-30 flex flex-col items-center">
             <div className="h-20 w-px bg-gradient-to-b from-gray-400 to-transparent" />
             <p className="text-[9px] font-black text-gray-400 mt-2 uppercase tracking-[0.5em] italic">Seblak Mledak POS v3.0</p>
          </div>
        </div>

      </div>
    </div>
  );
}