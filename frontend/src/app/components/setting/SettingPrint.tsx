import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Usb, 
  Bluetooth, 
  Settings2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Layout
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';
// Import handler print yang sudah kita buat sebelumnya
import { handleGlobalPrint } from '../utils/printHandler';

export default function SettingPrint() {
  const [isLoading, setIsLoading] = useState(false);
  const [printerConfig, setPrinterConfig] = useState({
    connectionType: 'usb', 
    paperSize: '58mm',     
    autoPrint: true,
    extraFeed: true, 
    printerName: 'XP-58 Thermal Printer'
  });

  // 1. LOAD SETTINGS
  useEffect(() => {
    const saved = localStorage.getItem('printer_config');
    if (saved) {
      setPrinterConfig(JSON.parse(saved));
    }
  }, []);

  // 2. FUNGSI SIMPAN
  const handleSave = () => {
    setIsLoading(true);
    try {
      localStorage.setItem('printer_config', JSON.stringify(printerConfig));
      // Simpan juga ke database via API jika diperlukan agar sinkron antar device
      // settingsAPI.updatePrinterSettings(printerConfig); 
      
      setTimeout(() => {
        setIsLoading(false);
        toast.success("KONFIGURASI PRINTER DISIMPAN");
      }, 500);
    } catch (err) {
      toast.error("GAGAL MENYIMPAN");
      setIsLoading(false);
    }
  };

  // 3. FUNGSI TEST PRINT (Beneran nembak ke Printer)
  const handleTestPrint = async () => {
    const toastId = toast.loading("MENCOBA TEST PRINT...");
    
    // Data dummy untuk ngetes layout struk
    const dummyTransaction = {
      receipt_number: "TEST-001",
      created_at: new Date().toISOString(),
      items: [
        { product_name: "TEST SEBLAK ORI", quantity: 1, price_at_sale: 15000 },
        { product_name: "TEST KERUPUK", quantity: 2, price_at_sale: 5000 },
      ],
      total_amount: 25000,
      payment_method: "CASH"
    };

    try {
      // Kita panggil fungsi print global kita
      // Fungsi ini harus sudah mendukung pembacaan 'extraFeed' dari config
      await handleGlobalPrint(dummyTransaction);
      toast.success("PERINTAH TEST PRINT TERKIRIM", { id: toastId });
    } catch (err) {
      toast.error("PRINTER TIDAK MERESPON", { id: toastId });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="mb-2">
        <h2 className="font-black text-2xl uppercase tracking-tighter text-gray-800">Pengaturan Printer</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Hardware Control Seblak Mledak</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* PANEL KONEKSI */}
        <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-gray-900 text-white p-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings2 className="size-4 text-orange-600" /> Metode Koneksi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {[
              { id: 'usb', label: 'USB (KABEL)', desc: 'Stabil & Direkomendasikan', icon: Usb },
              { id: 'bluetooth', label: 'BLUETOOTH', desc: 'Untuk Android / Tablet POS', icon: Bluetooth }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setPrinterConfig({...printerConfig, connectionType: m.id})}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                  printerConfig.connectionType === m.id 
                    ? "border-orange-600 bg-orange-50/30" 
                    : "border-gray-50 bg-gray-50/50 hover:bg-gray-100"
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl shadow-sm transition-colors",
                  printerConfig.connectionType === m.id ? "bg-orange-600 text-white" : "bg-white text-gray-400"
                )}>
                  <m.icon className="size-5" />
                </div>
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-tight", printerConfig.connectionType === m.id ? "text-orange-600" : "text-gray-700")}>{m.label}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{m.desc}</p>
                </div>
                {printerConfig.connectionType === m.id && <CheckCircle2 className="size-5 text-orange-600 ml-auto" />}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* PANEL FITUR */}
        <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-orange-600 text-white p-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Printer className="size-4" /> Fitur Cetak 58mm
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            {/* Switch Auto Print */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <RefreshCw className="size-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-gray-700">Cetak Otomatis</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Print saat bayar sukses</p>
                </div>
              </div>
              <Switch 
                checked={printerConfig.autoPrint}
                onCheckedChange={(val) => setPrinterConfig({...printerConfig, autoPrint: val})}
              />
            </div>

            {/* Switch Extra Feed */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Layout className="size-4 text-green-500" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-gray-700">Jarak Kertas (Feed)</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Memudahkan sobek manual</p>
                </div>
              </div>
              <Switch 
                checked={printerConfig.extraFeed}
                onCheckedChange={(val) => setPrinterConfig({...printerConfig, extraFeed: val})}
              />
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3">
               <AlertCircle className="size-4 text-blue-500 shrink-0 mt-0.5" />
               <p className="text-[9px] text-blue-600 font-bold leading-relaxed uppercase tracking-tight">
                 Pastikan driver printer thermal sudah terpasang di sistem operasi agar koneksi USB berjalan lancar.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col md:flex-row gap-3 pt-2">
        <Button 
          variant="outline"
          onClick={handleTestPrint}
          className="flex-1 h-14 rounded-2xl border-2 border-gray-200 font-black text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-900 hover:text-white transition-all"
        >
          <Printer className="mr-2 size-4" /> Jalankan Test Print
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isLoading}
          className="flex-[1.5] h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-100 transition-all active:scale-95"
        >
          {isLoading ? <RefreshCw className="animate-spin mr-2 size-4" /> : <CheckCircle2 className="mr-2 size-4 text-white" />}
          Simpan Konfigurasi
        </Button>
      </div>
    </div>
  );
}