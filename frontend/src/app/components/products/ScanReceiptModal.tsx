import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ScanLine, Upload, Sparkles, Eye, ArrowRight, ArrowLeft, Trash2, Plus, Save,
  Loader2, CheckCircle2, AlertTriangle, X, ImageIcon, FileText, Package
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';
import { aiAPI, productsAPI, ingredientsAPI } from '@/services/api';
import { toast } from 'sonner';

interface ScannedItem {
  id: string;
  nama_barang: string;
  kuantitas: number;
  harga_per_barang: number;
  matched_product_id: string | null;
  matched_product_name: string | null;
  is_new: boolean;
  confirmed_new: boolean;
}

interface ScanReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: () => void;
  ingredients: any[];
}

type Step = 'method' | 'upload' | 'processing' | 'results' | 'confirm-new' | 'saving' | 'done';
type ScanMethod = 'ocr' | 'vision';

export function ScanReceiptModal({ open, onOpenChange, onSaveSuccess, ingredients }: ScanReceiptModalProps) {
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<ScanMethod | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset saat modal dibuka/ditutup
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('method');
        setMethod(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setScannedItems([]);
        setRawData(null);
        setIsProcessing(false);
        setIsSaving(false);
        setSaveResult(null);
      }, 300);
    }
  }, [open]);

  // Fuzzy match product name
  const matchProduct = useCallback((name: string) => {
    if (!name || !ingredients.length) return null;
    const lower = name.toLowerCase().trim();

    // Exact match
    const exact = ingredients.find(p => p.name?.toLowerCase() === lower);
    if (exact) return exact;

    // Partial match (contains)
    const partial = ingredients.find(p =>
      p.name?.toLowerCase().includes(lower) || lower.includes(p.name?.toLowerCase())
    );
    if (partial) return partial;

    // Word-based match
    const words = lower.split(/\s+/);
    const wordMatch = ingredients.find(p => {
      const pWords = p.name?.toLowerCase().split(/\s+/) || [];
      return words.some((w: string) => w.length > 2 && pWords.some((pw: string) => pw.includes(w) || w.includes(pw)));
    });

    return wordMatch || null;
  }, [ingredients]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diterima');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Process receipt
  const handleProcess = async () => {
    if (!selectedFile || !method) return;

    setStep('processing');
    setIsProcessing(true);

    try {
      let result: any;
      if (method === 'ocr') {
        result = await aiAPI.scanReceiptOCR(selectedFile);
      } else {
        result = await aiAPI.scanReceiptVision(selectedFile);
      }

      setRawData(result);

      const data = result.data || result;
      const items: ScannedItem[] = (data.items || []).map((item: any, index: number) => {
        const matched = matchProduct(item.nama_barang);
        return {
          id: `scan-${index}-${Date.now()}`,
          nama_barang: item.nama_barang || '',
          kuantitas: item.kuantitas || 1,
          harga_per_barang: item.harga_per_barang || 0,
          matched_product_id: matched?._id || matched?.id || null,
          matched_product_name: matched?.name || null,
          is_new: !matched,
          confirmed_new: false,
        };
      });

      setScannedItems(items);
      setStep('results');
    } catch (error: any) {
      toast.error(`Gagal scan: ${error.message || 'Unknown error'}`);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update item field
  const updateItem = (id: string, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Re-match product when name changes
      if (field === 'nama_barang') {
        const matched = matchProduct(value);
        updated.matched_product_id = matched?._id || matched?.id || null;
        updated.matched_product_name = matched?.name || null;
        updated.is_new = !matched;
        updated.confirmed_new = false;
      }

      return updated;
    }));
  };

  // Manual product match
  const manualMatchProduct = (itemId: string, productId: string) => {
    const product = ingredients.find(p => (p._id || p.id) === productId);
    if (!product) return;

    setScannedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        matched_product_id: product._id || product.id,
        matched_product_name: product.name,
        is_new: false,
        confirmed_new: false,
      };
    }));
  };

  const removeItem = (id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id));
  };

  const addEmptyItem = () => {
    setScannedItems(prev => [...prev, {
      id: `manual-${Date.now()}`,
      nama_barang: '',
      kuantitas: 1,
      harga_per_barang: 0,
      matched_product_id: null,
      matched_product_name: null,
      is_new: true,
      confirmed_new: false,
    }]);
  };

  // Handle save: check for unconfirmed new items first
  const handleSave = async () => {
    const unconfirmedNew = scannedItems.filter(i => i.is_new && !i.confirmed_new);

    if (unconfirmedNew.length > 0) {
      setStep('confirm-new');
      return;
    }

    await executeSave();
  };

  const confirmNewItems = (confirmedIds: string[]) => {
    setScannedItems(prev => prev.map(item => ({
      ...item,
      confirmed_new: confirmedIds.includes(item.id) ? true : item.confirmed_new,
    })));
  };

  const executeSave = async () => {
    setStep('saving');
    setIsSaving(true);

    try {
      // Hanya simpan item yang valid
      const validItems = scannedItems.filter(i =>
        i.nama_barang.trim() &&
        i.kuantitas > 0 &&
        (!i.is_new || i.confirmed_new) // new items harus sudah dikonfirmasi
      );

      if (validItems.length === 0) {
        toast.error('Tidak ada item valid untuk disimpan');
        setStep('results');
        setIsSaving(false);
        return;
      }

      const payload = validItems.map(item => ({
        ingredient_id: item.matched_product_id,
        name: item.nama_barang,
        amount: item.kuantitas,
        price: item.harga_per_barang,
        is_new: item.is_new && item.confirmed_new,
      }));

      const result = await ingredientsAPI.saveOCR(payload);
      setSaveResult(result);
      setStep('done');
      toast.success(`Stok berhasil diperbarui! ${result.results?.updated || 0} diupdate, ${result.results?.created || 0} dibuat`);
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
      setStep('results');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== RENDER STEPS ====================

  const renderMethodStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 mb-4 shadow-xl shadow-orange-200">
          <ScanLine className="size-8 text-white" />
        </div>
        <h3 className="font-black text-xl uppercase tracking-tight">Pilih Metode Scan</h3>
        <p className="text-gray-400 text-xs mt-1 font-bold uppercase tracking-widest">Cara WuzPay membaca struk belanja</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* OCR Method Card */}
        <button
          onClick={() => setMethod('ocr')}
          className={cn(
            "relative p-6 rounded-3xl border-2 text-left transition-all duration-300 group hover:shadow-xl",
            method === 'ocr'
              ? "border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg shadow-orange-100"
              : "border-gray-100 bg-white hover:border-orange-200"
          )}
        >
          <div className={cn(
            "size-12 rounded-2xl flex items-center justify-center mb-4 transition-all",
            method === 'ocr' ? "bg-orange-500 shadow-lg shadow-orange-200" : "bg-gray-100 group-hover:bg-orange-100"
          )}>
            <FileText className={cn("size-6", method === 'ocr' ? "text-white" : "text-gray-400 group-hover:text-orange-500")} />
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight mb-1">OCR Engine</h4>
          <p className="text-[10px] text-gray-400 font-bold leading-relaxed">PaddleOCR + AI Parser. Teks diekstrak terlebih dahulu, lalu diproses AI.</p>
          {method === 'ocr' && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="size-5 text-orange-500" />
            </div>
          )}
        </button>

        {/* LLM Vision Card */}
        <button
          onClick={() => setMethod('vision')}
          className={cn(
            "relative p-6 rounded-3xl border-2 text-left transition-all duration-300 group hover:shadow-xl",
            method === 'vision'
              ? "border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg shadow-orange-100"
              : "border-gray-100 bg-white hover:border-orange-200"
          )}
        >
          <div className={cn(
            "size-12 rounded-2xl flex items-center justify-center mb-4 transition-all",
            method === 'vision' ? "bg-orange-500 shadow-lg shadow-orange-200" : "bg-gray-100 group-hover:bg-orange-100"
          )}>
            <Eye className={cn("size-6", method === 'vision' ? "text-white" : "text-gray-400 group-hover:text-orange-500")} />
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight mb-1">LLM Vision</h4>
          <p className="text-[10px] text-gray-400 font-bold leading-relaxed">AI langsung baca gambar. Lebih akurat untuk struk yang kompleks.</p>
          {method === 'vision' && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="size-5 text-orange-500" />
            </div>
          )}
        </button>
      </div>

      <Button
        disabled={!method}
        onClick={() => setStep('upload')}
        className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-200 transition-all disabled:opacity-40"
      >
        Lanjut Upload <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setStep('method'); setSelectedFile(null); setPreviewUrl(null); }}
          className="rounded-xl h-9 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600"
        >
          <ArrowLeft className="size-3 mr-1.5" /> Kembali
        </Button>
        <Badge className="bg-orange-100 text-orange-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-lg">
          {method === 'ocr' ? 'OCR Engine' : 'LLM Vision'}
        </Badge>
      </div>

      {!selectedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300",
            dragOver
              ? "border-orange-500 bg-orange-50 scale-[1.02]"
              : "border-gray-200 bg-gray-50/50 hover:border-orange-300 hover:bg-orange-50/30"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "size-20 rounded-3xl flex items-center justify-center transition-all",
              dragOver ? "bg-orange-500 shadow-xl shadow-orange-200" : "bg-gray-100"
            )}>
              <Upload className={cn("size-9", dragOver ? "text-white" : "text-gray-300")} />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-600">
                {dragOver ? 'Drop di sini!' : 'Upload Foto Struk'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">
                Drag & drop atau klik untuk pilih
              </p>
              <p className="text-[9px] text-gray-300 font-bold mt-2">PNG, JPG, JPEG — Max 10MB</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden border border-gray-100 shadow-lg">
            <img
              src={previewUrl!}
              alt="Preview struk"
              className="w-full max-h-[300px] object-contain bg-gray-50"
            />
            <button
              onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
              className="absolute top-3 right-3 size-8 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-all"
            >
              <X className="size-4 text-white" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
              <p className="text-white text-[10px] font-black uppercase tracking-widest truncate">
                <ImageIcon className="size-3 inline mr-1" />
                {selectedFile.name}
              </p>
            </div>
          </div>

          <Button
            onClick={handleProcess}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-200 transition-all"
          >
            <Sparkles className="mr-2 size-4" /> Proses Sekarang
          </Button>
        </div>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="size-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-2xl shadow-orange-200 animate-pulse">
          <ScanLine className="size-10 text-white animate-pulse" />
        </div>
        <div className="absolute -inset-4 rounded-full border-4 border-orange-200 animate-spin" style={{ borderTopColor: 'transparent', animationDuration: '2s' }} />
      </div>
      <div className="text-center">
        <h3 className="font-black text-lg uppercase tracking-tight animate-pulse">Memproses Struk...</h3>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">
          {method === 'ocr' ? 'PaddleOCR → AI Parser' : 'LLM Vision Processing'}
        </p>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('upload')}
            className="rounded-xl h-9 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600"
          >
            <ArrowLeft className="size-3 mr-1.5" /> Ubah Foto
          </Button>
          <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px] uppercase px-3 py-1 rounded-lg">
            {scannedItems.length} item ditemukan
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addEmptyItem}
          className="rounded-xl h-9 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600"
        >
          <Plus className="size-3 mr-1" /> Tambah Baris
        </Button>
      </div>

      {rawData?.data?.tanggal && (
        <div className="p-3 rounded-2xl bg-gray-50 flex items-center gap-3">
          <Badge variant="outline" className="text-[9px] font-black uppercase border-gray-200 text-gray-400">Tanggal</Badge>
          <span className="text-xs font-bold text-gray-600">{rawData.data.tanggal}</span>
          {rawData.data.total_belanja && (
            <>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-gray-200 text-gray-400 ml-auto">Total</Badge>
              <span className="text-xs font-bold text-orange-600">Rp {rawData.data.total_belanja?.toLocaleString('id-ID')}</span>
            </>
          )}
        </div>
      )}

      <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 sticky top-0 z-10">
            <tr className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-4 py-3">Nama Barang</th>
              <th className="px-3 py-3 text-center w-20">Qty</th>
              <th className="px-3 py-3 w-32">Harga</th>
              <th className="px-3 py-3 text-center w-28">Status</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {scannedItems.map((item) => (
              <tr key={item.id} className="hover:bg-orange-50/20 transition-all group">
                <td className="px-4 py-3">
                  <Input
                    value={item.nama_barang}
                    onChange={(e) => updateItem(item.id, 'nama_barang', e.target.value)}
                    className="h-9 border-none bg-transparent font-bold text-xs focus-visible:ring-1 focus-visible:ring-orange-300 rounded-xl px-2"
                    placeholder="Nama produk..."
                  />
                  {item.matched_product_name && (
                    <p className="text-[8px] font-black text-emerald-600 mt-0.5 px-2 uppercase tracking-wide">
                      ✓ Match: {item.matched_product_name}
                    </p>
                  )}
                  {item.is_new && item.nama_barang && (
                    <div className="mt-1 px-2">
                      <select
                        className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) manualMatchProduct(item.id, e.target.value);
                        }}
                      >
                        <option value="">Pilih produk yang cocok...</option>
                        {ingredients.map(p => (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.name} (Stok: {p.stock_quantity || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <Input
                    type="number"
                    min={0}
                    value={item.kuantitas}
                    onChange={(e) => updateItem(item.id, 'kuantitas', parseInt(e.target.value) || 0)}
                    className="h-9 w-16 border-none bg-transparent font-black text-sm text-center focus-visible:ring-1 focus-visible:ring-orange-300 rounded-xl mx-auto"
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    min={0}
                    value={item.harga_per_barang}
                    onChange={(e) => updateItem(item.id, 'harga_per_barang', parseInt(e.target.value) || 0)}
                    className="h-9 border-none bg-transparent font-bold text-xs focus-visible:ring-1 focus-visible:ring-orange-300 rounded-xl px-2"
                  />
                </td>
                <td className="px-3 py-3 text-center">
                  {item.is_new ? (
                    <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[8px] uppercase px-2 py-0.5 rounded-md">
                      <AlertTriangle className="size-2.5 mr-1" /> Baru
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[8px] uppercase px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="size-2.5 mr-1" /> Match
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="size-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        onClick={handleSave}
        disabled={scannedItems.length === 0}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 transition-all disabled:opacity-40"
      >
        <Save className="mr-2 size-4" /> Simpan ke Inventory
      </Button>
    </div>
  );

  const renderConfirmNewStep = () => {
    const newItems = scannedItems.filter(i => i.is_new && !i.confirmed_new);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-amber-100 mb-4">
            <AlertTriangle className="size-8 text-amber-600" />
          </div>
          <h3 className="font-black text-lg uppercase tracking-tight">Produk Baru Terdeteksi</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            {newItems.length} item belum ada di database
          </p>
        </div>

        <div className="space-y-3 max-h-[250px] overflow-y-auto">
          {newItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-amber-100 bg-amber-50/30">
              <div>
                <p className="font-black text-sm text-gray-800">{item.nama_barang}</p>
                <p className="text-[10px] text-gray-400 font-bold">
                  {item.kuantitas} pcs × Rp {item.harga_per_barang?.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Kembali ke edit, skip item ini
                    removeItem(item.id);
                    if (newItems.length <= 1) {
                      setStep('results');
                    }
                  }}
                  className="h-9 rounded-xl text-[10px] font-black uppercase border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200"
                >
                  Hapus
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    confirmNewItems([item.id]);
                    // Check if semua sudah dikonfirmasi
                    const remaining = newItems.filter(i => i.id !== item.id);
                    if (remaining.length === 0) {
                      // Semua dikonfirmasi, lanjut save
                      setTimeout(() => executeSave(), 100);
                    }
                  }}
                  className="h-9 rounded-xl text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <Package className="size-3 mr-1" /> Tambah Produk
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep('results')}
            className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-200 text-gray-400 hover:text-orange-600"
          >
            <ArrowLeft className="size-3 mr-2" /> Kembali Edit
          </Button>
          <Button
            onClick={() => {
              // Hapus semua item baru yang belum dikonfirmasi, simpan sisanya
              setScannedItems(prev => prev.filter(i => !i.is_new || i.confirmed_new));
              setTimeout(() => executeSave(), 100);
            }}
            className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-orange-600 hover:bg-orange-700 text-white shadow-xl"
          >
            Skip Semua & Simpan
          </Button>
        </div>
      </div>
    );
  };

  const renderSavingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="size-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-200 animate-pulse">
        <Save className="size-9 text-white" />
      </div>
      <div className="text-center">
        <h3 className="font-black text-lg uppercase tracking-tight animate-pulse">Menyimpan ke Database...</h3>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Updating inventory WuzPay</p>
      </div>
    </div>
  );

  const renderDoneStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="size-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-200">
        <CheckCircle2 className="size-10 text-white" />
      </div>
      <div className="text-center">
        <h3 className="font-black text-xl uppercase tracking-tight text-emerald-700">Berhasil!</h3>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">
          {saveResult?.results?.updated || 0} stok diperbarui • {saveResult?.results?.created || 0} produk baru
        </p>
      </div>
      <Button
        onClick={() => {
          onOpenChange(false);
          onSaveSuccess();
        }}
        className="h-14 px-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-200"
      >
        Selesai & Refresh
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl bg-white p-8">
        <DialogHeader>
          <DialogTitle className="font-black text-xs uppercase tracking-[0.3em] text-gray-300">
            {step === 'method' && 'SCAN RESI'}
            {step === 'upload' && 'UPLOAD STRUK'}
            {step === 'processing' && 'MEMPROSES'}
            {step === 'results' && 'HASIL SCAN'}
            {step === 'confirm-new' && 'KONFIRMASI'}
            {step === 'saving' && 'MENYIMPAN'}
            {step === 'done' && 'SELESAI'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Scan struk belanja untuk menambahkan stok inventory secara otomatis
          </DialogDescription>
        </DialogHeader>

        {step === 'method' && renderMethodStep()}
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'results' && renderResultsStep()}
        {step === 'confirm-new' && renderConfirmNewStep()}
        {step === 'saving' && renderSavingStep()}
        {step === 'done' && renderDoneStep()}
      </DialogContent>
    </Dialog>
  );
}
