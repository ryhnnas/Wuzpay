import React, { useState, useEffect, useRef } from 'react';
import { Store, MapPin, Save, Receipt, Image as ImageIcon, UploadCloud, X, Printer, Type, AlignJustify, MoveHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Slider } from '@/app/components/ui/slider';
import { toast } from 'sonner';
import { ReceiptTemplate } from '../utils/ReceiptTemplate';
import { settingsAPI } from '@/services/api'; 
import { cn } from '@/app/components/ui/utils';

export default function SettingStruk() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  
  // STATE LENGKAP UNTUK KONTROL PRINTER
  const [config, setConfig] = useState({
    storeName: 'SEBLAK MLEDAK',
    address: 'Jl. Pedas Membara No. 69, Bandung',
    footer: 'Terima kasih! Ditunggu mledak selanjutnya.',
    showLogo: true,
    logo: null as string | null,
    
    // PENGATURAN HARDWARE (PRINTER)
    paperSize: '58mm',      // Pilihan kertas
    autoPrint: true,        // Auto print setelah bayar
    maxChars: 32,           // Panjang karakter per baris
    fontFamily: 'monospace',// Jenis font
    fontSize: 12,           // Ukuran font (px)
    marginHorizontal: 10,   // Margin kiri kanan (px)
    marginBottom: 20,       // Jarak potong bawah (px)
  });

  // 1. LOAD DATA DARI DATABASE (BIAR SINKRON SEMUA LAPTOP)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsAPI.getReceiptSettings();
        if (data) {
          // Kita mapping dari snake_case (DB) ke CamelCase (State UI)
          setConfig({
            storeName: data.store_name || 'SEBLAK MLEDAK',
            address: data.address || '',
            footer: data.footer_text || '',
            showLogo: data.show_logo ?? true,
            logo: data.logo_url || null,
            paperSize: data.paper_size || '58mm',
            autoPrint: data.auto_print ?? true,
            maxChars: data.max_chars || 32,
            fontFamily: data.font_family || 'monospace',
            fontSize: data.font_size || 12,
            // Pastikan mapping margin sesuai dengan API kamu (h dan b)
            marginHorizontal: data.margin_h ?? 10,
            marginBottom: data.margin_b ?? 20,
          });
        }
      } catch (e) {
        console.error("Error loading settings:", e);
        // Jangan tampilkan toast error terus-menerus kalau cuma gagal ambil 1 data
      }
    };
    loadSettings();
  }, []);

  // 2. LOGIKA SIMPAN KE DATABASE
  const handleSave = async () => {
    setLoading(true);
    try {
      // Pastikan data dikirim sesuai nama kolom di PostgreSQL kamu
      await settingsAPI.updateReceiptSettings({
        store_name: config.storeName,
        address: config.address,
        footer_text: config.footer,
        show_logo: config.showLogo,
        logo_url: config.logo,
        paper_size: config.paperSize,
        auto_print: config.autoPrint,
        max_chars: config.maxChars,
        font_family: config.fontFamily,
        font_size: config.fontSize,
        margin_h: config.marginHorizontal,
        margin_b: config.marginBottom
      });
      toast.success("PENGATURAN STRUK PUSAT BERHASIL DISIMPAN!");
    } catch (error) {
      toast.error("Gagal menyimpan ke database");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, logo: reader.result as string });
        toast.success("Logo dimuat ke preview");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 grid lg:grid-cols-12 gap-8 animate-in fade-in duration-500 font-sans">
      
      {/* KIRI: FORM PENGATURAN (Col 8) */}
      <div className="lg:col-span-8 space-y-6 pb-20">
        <Card className="rounded-[35px] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-gray-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
              <Printer className="size-4 text-orange-500" /> Konfigurasi Hardware & Struk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            
            {/* GRUP 1: IDENTITAS TOKO */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-gray-400 italic tracking-widest">Identitas Visual</Label>
                <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-100">
                  <div className="size-16 bg-white rounded-xl border flex items-center justify-center overflow-hidden relative group">
                    {config.logo ? (
                      <img src={config.logo} className="size-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="size-6 text-gray-200" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input type="file" ref={fileInputRef} hidden onChange={handleLogoChange} />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-lg font-black text-[9px] uppercase">Upload Logo</Button>
                    <div className="flex items-center gap-2">
                      <Switch checked={config.showLogo} onCheckedChange={(v) => setConfig({...config, showLogo: v})} />
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Tampilkan</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Nama Outlet</Label>
                    <Input value={config.storeName} onChange={(e) => setConfig({...config, storeName: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-gray-50 border-none font-black" />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Alamat</Label>
                    <Input value={config.address} onChange={(e) => setConfig({...config, address: e.target.value})} className="h-12 rounded-xl bg-gray-50 border-none font-bold" />
                 </div>
              </div>
            </div>

            {/* GRUP 2: SETTING PRINTER (KERTAS & AUTO PRINT) */}
            <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <Receipt className="size-3" /> Ukuran Kertas
                  </Label>
                  <Select value={config.paperSize} onValueChange={(v) => setConfig({...config, paperSize: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-none font-black text-xs uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="47mm">47 mm (Mini)</SelectItem>
                      <SelectItem value="58mm">58 mm (Standard)</SelectItem>
                      <SelectItem value="80mm">80 mm (Besar)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-3 text-center">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Auto-Print</Label>
                  <div className="h-12 flex items-center justify-center bg-gray-50 rounded-xl px-4 gap-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{config.autoPrint ? 'AKTIF' : 'NON-AKTIF'}</span>
                    <Switch checked={config.autoPrint} onCheckedChange={(v) => setConfig({...config, autoPrint: v})} />
                  </div>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <AlignJustify className="size-3" /> Lebar Karakter
                  </Label>
                  <Input 
                    type="number" 
                    value={config.maxChars} 
                    onChange={(e) => setConfig({...config, maxChars: parseInt(e.target.value)})}
                    className="h-12 rounded-xl bg-gray-50 border-none font-black"
                    placeholder="Contoh: 32"
                  />
               </div>
            </div>

            {/* GRUP 3: TYPOGRAPHY & MARGIN */}
            <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <Type className="size-3" /> Jenis & Ukuran Font
                  </Label>
                  <div className="flex gap-2">
                    <Select value={config.fontFamily} onValueChange={(v) => setConfig({...config, fontFamily: v})}>
                      <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none font-black text-[10px] flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monospace">MONOSPACE (Standard)</SelectItem>
                        <SelectItem value="'Courier New'">COURIER NEW</SelectItem>
                        <SelectItem value="sans-serif">SANS SERIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      value={config.fontSize} 
                      onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})}
                      className="h-11 w-20 rounded-xl bg-gray-50 border-none font-black text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                      <MoveHorizontal className="size-3" /> Margin Horizontal & Bawah
                    </Label>
                    <div className="flex gap-4">
                       <div className="flex-1 space-y-2">
                          <span className="text-[9px] font-bold text-gray-300 uppercase">Samping: {config.marginHorizontal}px</span>
                          <Slider value={[config.marginHorizontal]} max={30} step={1} onValueChange={(v) => setConfig({...config, marginHorizontal: v[0]})} />
                       </div>
                       <div className="flex-1 space-y-2">
                          <span className="text-[9px] font-bold text-gray-300 uppercase">Bawah: {config.marginBottom}px</span>
                          <Slider value={[config.marginBottom]} max={50} step={1} onValueChange={(v) => setConfig({...config, marginBottom: v[0]})} />
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="w-full h-16 bg-orange-600 hover:bg-orange-700 rounded-[22px] font-black text-white shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save className="size-5" />}
              SIMPAN KE DATABASE PUSAT (SINKRON SEMUA DEVICE)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* KANAN: LIVE PREVIEW (Col 4) */}
      <div className="lg:col-span-4 flex flex-col items-center">
          <div className="sticky top-10 w-full flex flex-col items-center">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-[0.3em] flex items-center gap-3 italic">
                <div className="size-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" /> 
                Real-Time Hardware Preview
            </div>
            
            {/* Template struk akan menyesuaikan style config secara langsung */}
            <div 
              className="bg-white shadow-2xl p-4 transition-all duration-500"
              style={{ 
                width: config.paperSize === '80mm' ? '300px' : config.paperSize === '47mm' ? '180px' : '230px',
                paddingLeft: `${config.marginHorizontal}px`,
                paddingRight: `${config.marginHorizontal}px`,
                paddingBottom: `${config.marginBottom}px`,
                fontFamily: config.fontFamily,
                fontSize: `${config.fontSize}px`
              }}
            >
               <ReceiptTemplate 
                  transaction={{
                    receipt_number: 'NEX-PREVIEW-2026',
                    items: [
                      { product_name: 'SEBLAK KOMPLIT LV.5', quantity: 2, price_at_sale: 15000 },
                      { product_name: 'ES TEH MANIS JUMBO', quantity: 1, price_at_sale: 5000 }
                    ],
                    total_amount: 35000,
                    payment_method: 'CASH',
                    amount_paid: 50000,
                    change_amount: 15000,
                    created_at: new Date()
                  }} 
                  settings={{
                    ...config,
                    store_name: config.storeName,
                    footer_text: config.footer,
                    logo_url: config.logo
                  }} 
               />
            </div>
            
            <p className="mt-8 text-[9px] font-black text-gray-300 uppercase text-center leading-relaxed tracking-widest px-10">
              Preview di atas mensimulasikan hasil cetak fisik pada printer thermal {config.paperSize}.
            </p>
          </div>
      </div>
    </div>
  );
}

// Tambahan Komponen Loader untuk Tombol
function Loader2({ className }: { className?: string }) {
  return <div className={cn("animate-spin rounded-full border-2 border-white/20 border-t-white size-5", className)} />;
}