import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Usb, 
  Bluetooth, 
  Settings2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Layout,
  HardDrive,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';
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

  // 1. LOAD SETTINGS WUZPAY
  useEffect(() => {
    const saved = localStorage.getItem('wuzpay_printer_config');
    if (saved) {
      setPrinterConfig(JSON.parse(saved));
    }
  }, []);

  // 2. FUNGSI SIMPAN KE CLOUD/LOCAL
  const handleSave = () => {
    setIsLoading(true);
    try {
      localStorage.setItem('wuzpay_printer_config', JSON.stringify(printerConfig));
      
      // Simulasi delay sinkronisasi hardware
      setTimeout(() => {
        setIsLoading(false);
        toast.success("HARDWARE CONFIGURATION UPDATED");
      }, 800);
    } catch (err) {
      toast.error("SYSTEM ERROR: GAGAL MENYIMPAN");
      setIsLoading(false);
    }
  };

  // 3. FUNGSI TEST PRINT (WUZPAY TEST PROTOCOL)
  const handleTestPrint = async () => {
    const toastId = toast.loading("MENGINISIASI TEST PRINT...");
    
    const dummyTransaction = {
      receipt_number: "WUZ-TEST-001",
      created_at: new Date().toISOString(),
      items: [
        { product_name: "WUZ TEST SEBLAK", quantity: 1, price_at_sale: 15000 },
        { product_name: "TOPPING TEST", quantity: 1, price_at_sale: 5000 },
      ],
      total_amount: 20000,
      payment_method: "SYSTEM_TEST",
      cashier_name: "Root Admin"
    };

    try {
      // Panggil global print dengan config extraFeed terbaru
      await handleGlobalPrint({
        ...dummyTransaction,
        store_name: "WUZPAY TEST UNIT",
        extra_feed: printerConfig.extraFeed
      });
      toast.success("PRINT COMMAND DISPATCHED", { id: toastId });
    } catch (err) {
      toast.error("HARDWARE ERROR: PRINTER OFFLINE", { id: toastId });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 font-sans pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-black text-4xl uppercase tracking-tighter text-gray-900 italic flex items-center gap-3">
             <HardDrive className="size-10 text-orange-600" />
             Printer <span className="text-orange-600">Interface</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
             <Activity className="size-3 text-emerald-500 animate-pulse" />
             Hardware Control Module v4.0
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* PANEL KONEKSI HARDWARE */}
        <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
          <CardHeader className="bg-gray-900 text-white p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
              <Settings2 className="size-5 text-orange-600" /> Link Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {[
              { id: 'usb', label: 'Wired Connection (USB)', desc: 'Ultra-Stable Data Pipeline', icon: Usb },
              { id: 'bluetooth', label: 'Wireless Protocol (BT)', desc: 'Mobile POS Connectivity', icon: Bluetooth }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setPrinterConfig({...printerConfig, connectionType: m.id})}
                className={cn(
                  "w-full flex items-center gap-5 p-6 rounded-[28px] border-2 transition-all duration-300 group",
                  printerConfig.connectionType === m.id 
                    ? "border-orange-600 bg-orange-50/50 shadow-lg shadow-orange-100/50" 
                    : "border-gray-50 bg-gray-50/30 hover:bg-gray-50 hover:border-gray-200"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm transition-all group-hover:scale-110",
                  printerConfig.connectionType === m.id ? "bg-orange-600 text-white shadow-orange-200" : "bg-white text-gray-400"
                )}>
                  <m.icon className="size-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-black uppercase tracking-tight italic", printerConfig.connectionType === m.id ? "text-orange-600" : "text-gray-800")}>{m.label}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{m.desc}</p>
                </div>
                {printerConfig.connectionType === m.id && (
                  <div className="bg-orange-600 rounded-full p-1 animate-in zoom-in duration-300">
                    <CheckCircle2 className="size-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* PANEL ENGINE FEATURES */}
        <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
          <CardHeader className="bg-orange-600 text-white p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
              <Printer className="size-5 text-white" /> Print Engine Options
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            
            {/* Auto Print Switch */}
            <div className="flex items-center justify-between p-6 bg-gray-50/80 rounded-[28px] border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-blue-50 transition-colors">
                  <RefreshCw className="size-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase text-gray-800 italic">Auto-Dispatch</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Cetak saat order sukses</p>
                </div>
              </div>
              <Switch 
                checked={printerConfig.autoPrint}
                onCheckedChange={(val) => setPrinterConfig({...printerConfig, autoPrint: val})}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

            {/* Extra Feed Switch */}
            <div className="flex items-center justify-between p-6 bg-gray-50/80 rounded-[28px] border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-emerald-50 transition-colors">
                  <Layout className="size-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[12px] font-black uppercase text-gray-800 italic">End-of-Paper Feed</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Spasi ekstra untuk sobek</p>
                </div>
              </div>
              <Switch 
                checked={printerConfig.extraFeed}
                onCheckedChange={(val) => setPrinterConfig({...printerConfig, extraFeed: val})}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex gap-4">
               <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
               <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase tracking-tighter italic">
                 Wajib menggunakan printer thermal standard 58mm (ESC/POS) untuk hasil cetak struk yang presisi.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col md:flex-row gap-4 pt-4">
        <Button 
          variant="ghost"
          onClick={handleTestPrint}
          className="flex-1 h-20 rounded-[32px] border-2 border-gray-100 bg-white font-black text-[11px] uppercase tracking-[0.3em] text-gray-500 hover:bg-gray-900 hover:text-white transition-all shadow-sm"
        >
          <Printer className="mr-3 size-5 text-orange-600" /> Dispatch Test Unit
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isLoading}
          className="flex-[1.5] h-20 bg-gray-900 hover:bg-orange-600 text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95"
        >
          {isLoading ? <RefreshCw className="animate-spin mr-3 size-5" /> : <CheckCircle2 className="mr-3 size-5 text-orange-500" />}
          Commit Configuration
        </Button>
      </div>

      <div className="text-center pt-8 border-t border-gray-100">
         <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.8em] italic">
           WUZPAY HARDWARE BRIDGE
         </p>
      </div>
    </div>
  );
}