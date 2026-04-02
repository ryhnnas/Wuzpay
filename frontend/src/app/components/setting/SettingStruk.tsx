import React, { useState, useEffect, useRef } from 'react';
import { Store, MapPin, Save, Receipt, Image as ImageIcon, X, Printer, Type, AlignJustify, MoveHorizontal, Loader2, Activity } from 'lucide-react';
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
  const [isFetching, setIsFetching] = useState(true);
  
  // STATE KONFIGURASI WUZPAY
  const [config, setConfig] = useState({
    storeName: 'WUZPAY SINDANGSARI',
    address: 'Jl. Sindangsari No. 01, Bandung',
    footer: 'Makan Seblak Sampai Mledakkk!',
    showLogo: true,
    logo: null as string | null,
    
    // PENGATURAN HARDWARE
    paperSize: '58mm',
    autoPrint: true,
    maxChars: 32,
    fontFamily: 'monospace',
    fontSize: 12,
    marginHorizontal: 10,
    marginBottom: 20,
  });

  // 1. LOAD SETTINGS DARI CLOUD DATABASE
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsFetching(true);
        const data = await settingsAPI.getReceiptSettings();
        if (data) {
          setConfig({
            storeName: data.store_name || 'WUZPAY SINDANGSARI',
            address: data.address || '',
            footer: data.footer_text || '',
            showLogo: data.show_logo ?? true,
            logo: data.logo_url || null,
            paperSize: data.paper_size || '58mm',
            autoPrint: data.auto_print ?? true,
            maxChars: data.max_chars || 32,
            fontFamily: data.font_family || 'monospace',
            fontSize: data.font_size || 12,
            marginHorizontal: data.margin_h ?? 10,
            marginBottom: data.margin_b ?? 20,
          });
        }
      } catch (e) {
        console.error("Fetch Settings Error:", e);
      } finally {
        setIsFetching(false);
      }
    };
    loadSettings();
  }, []);

  // 2. SIMPAN KE DATABASE PUSAT
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
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
      };
      
      await settingsAPI.updateReceiptSettings(payload);
      toast.success("KONFIGURASI STRUK WUZPAY TERSIMPAN!");
    } catch (error) {
      toast.error("GAGAL UPDATE CLOUD DATABASE");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500000) return toast.error("Ukuran logo max 500KB");
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, logo: reader.result as string });
        toast.success("Logo diperbarui");
      };
      reader.readAsDataURL(file);
    }
  };

  if (isFetching) return (
    <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
      <Loader2 className="size-12 text-orange-600 animate-spin" />
      <p className="font-black text-gray-400 uppercase text-xs tracking-widest animate-pulse">Syncing Receipt Engine...</p>
    </div>
  );

  return (
    <div className="p-8 grid lg:grid-cols-12 gap-10 animate-in fade-in duration-700 font-sans pb-24 bg-slate-50/50 min-h-screen">
      
      {/* COLUMN LEFT: SETTINGS FORM (Col 7) */}
      <div className="lg:col-span-7 space-y-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-black text-4xl uppercase tracking-tighter italic text-orange-600">
              Receipt <span className="text-orange-600">Designer</span>
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
              <Activity className="size-3 text-emerald-500 animate-pulse" />
              Customize WuzPay Output Layout
            </p>
          </div>
        </div>

        <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
          <CardHeader className="bg-orange-600 text-white p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
              <Printer className="size-5 text-orange-600" /> System Branding & Hardware Link
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-10 space-y-10">
            {/* LOGO & NAME SECTION */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Brand Icon</Label>
                <div className="p-6 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-4 group hover:border-orange-200 transition-all">
                  <div className="size-24 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden relative">
                    {config.logo ? (
                      <img src={config.logo} className="size-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="size-8 text-gray-200" />
                    )}
                    <input type="file" ref={fileInputRef} hidden onChange={handleLogoChange} />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 rounded-xl font-black text-[9px] uppercase bg-orange-600 text-white hover:bg-orange-600 transition-all">
                      Update Logo
                    </Button>
                    <div className="flex items-center gap-3 mt-1">
                      <Switch checked={config.showLogo} onCheckedChange={(v) => setConfig({...config, showLogo: v})} className="data-[state=checked]:bg-orange-600" />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Visible</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Store Brand Name</Label>
                  <Input 
                    value={config.storeName} 
                    onChange={(e) => setConfig({...config, storeName: e.target.value.toUpperCase()})} 
                    className="h-14 rounded-2xl bg-gray-50 border-none font-black text-lg focus:ring-2 focus:ring-orange-500 shadow-inner px-6" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest">Address Line</Label>
                  <Input 
                    value={config.address} 
                    onChange={(e) => setConfig({...config, address: e.target.value})} 
                    className="h-14 rounded-2xl bg-gray-50 border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 shadow-inner px-6 italic" 
                  />
                </div>
              </div>
            </div>

            {/* HARDWARE DIMENSIONS */}
            <div className="grid md:grid-cols-3 gap-6 pt-10 border-t border-gray-100">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-2">
                    <Receipt className="size-3 text-orange-600" /> Paper Size
                  </Label>
                  <Select value={config.paperSize} onValueChange={(v) => setConfig({...config, paperSize: v})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-none font-black text-[11px] uppercase px-6">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      <SelectItem value="47mm" className="font-black text-[10px] uppercase">47mm Pocket</SelectItem>
                      <SelectItem value="58mm" className="font-black text-[10px] uppercase">58mm Mobile</SelectItem>
                      <SelectItem value="80mm" className="font-black text-[10px] uppercase">80mm Desktop</SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center block">Auto-Print</Label>
                  <div className="h-14 flex items-center justify-between bg-gray-50 rounded-2xl px-6 border border-gray-100/50 shadow-inner">
                    <span className="text-[9px] font-black text-gray-400 uppercase">{config.autoPrint ? 'ENABLED' : 'DISABLED'}</span>
                    <Switch checked={config.autoPrint} onCheckedChange={(v) => setConfig({...config, autoPrint: v})} className="data-[state=checked]:bg-emerald-500" />
                  </div>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-2">
                    <AlignJustify className="size-3 text-orange-600" /> Line Length
                  </Label>
                  <Input 
                    type="number" 
                    value={config.maxChars} 
                    onChange={(e) => setConfig({...config, maxChars: parseInt(e.target.value)})}
                    className="h-14 rounded-2xl bg-gray-50 border-none font-black text-center shadow-inner"
                  />
               </div>
            </div>

            {/* TYPOGRAPHY & SPACING */}
            <div className="grid md:grid-cols-2 gap-10 pt-10 border-t border-gray-100">
                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-2">
                    <Type className="size-4 text-orange-600" /> Typography Matrix
                  </Label>
                  <div className="flex gap-3">
                    <Select value={config.fontFamily} onValueChange={(v) => setConfig({...config, fontFamily: v})}>
                      <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-none font-black text-[10px] flex-1 px-6 uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="monospace" className="font-bold">MONOSPACE</SelectItem>
                        <SelectItem value="'Courier New'" className="font-bold">COURIER</SelectItem>
                        <SelectItem value="sans-serif" className="font-bold">SANS SERIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="bg-gray-50 rounded-2xl flex items-center px-4 shadow-inner">
                       <Input 
                        type="number" 
                        value={config.fontSize} 
                        onChange={(e) => setConfig({...config, fontSize: parseInt(e.target.value)})}
                        className="h-14 w-12 bg-transparent border-none font-black text-center p-0"
                      />
                      <span className="text-[10px] font-black text-gray-300 ml-1 uppercase">PX</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-2">
                    <MoveHorizontal className="size-4 text-orange-600" /> Dimension Adjustment
                  </Label>
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-orange-600 uppercase italic">Horizontal: {config.marginHorizontal}px</span>
                        <Slider value={[config.marginHorizontal]} max={30} step={1} onValueChange={(v) => setConfig({...config, marginHorizontal: v[0]})} className="py-2" />
                      </div>
                      <div className="space-y-3">
                        <span className="text-[9px] font-black text-orange-600 uppercase italic">Bottom Cut: {config.marginBottom}px</span>
                        <Slider value={[config.marginBottom]} max={60} step={1} onValueChange={(v) => setConfig({...config, marginBottom: v[0]})} className="py-2" />
                      </div>
                  </div>
                </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="w-full h-20 bg-orange-600 hover:bg-orange-600 text-white rounded-[28px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 mt-4"
            >
              {loading ? <Loader2 className="animate-spin size-6" /> : <Save className="size-6 text-orange-500" />}
              Push Configuration to Cloud
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* COLUMN RIGHT: HARDWARE PREVIEW (Col 5) */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="sticky top-10 w-full max-w-[380px]">
          <div className="bg-orange-600 p-8 rounded-t-[40px] flex justify-between items-center border-b border-white/5">
             <div className="flex items-center gap-3">
                <div className="size-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Live Feed Preview</span>
             </div>
             <Printer className="size-5 text-gray-600" />
          </div>

          <div className="bg-gray-100 p-10 border-x border-gray-200 min-h-[500px] flex justify-center overflow-hidden">
             <div 
                className="bg-white shadow-[0_30px_60px_rgba(0,0,0,0.1)] transition-all duration-500"
                style={{ 
                  width: config.paperSize === '80mm' ? '320px' : config.paperSize === '47mm' ? '180px' : '240px',
                  paddingLeft: `${config.marginHorizontal}px`,
                  paddingRight: `${config.marginHorizontal}px`,
                  paddingBottom: `${config.marginBottom}px`,
                  fontFamily: config.fontFamily,
                  fontSize: `${config.fontSize}px`
                }}
              >
                 <ReceiptTemplate 
                    transaction={{
                      receipt_number: 'WUZ-PREVIEW-26',
                      items: [
                        { product_name: 'SEBLAK KOMPLIT CIKRUK', quantity: 2, price_at_sale: 18000 },
                        { product_name: 'TEH MANIS DINGIN', quantity: 1, price_at_sale: 5000 }
                      ],
                      total_amount: 41000,
                      payment_method: 'CASH',
                      paid_amount: 50000,
                      change_amount: 9000,
                      created_at: new Date()
                    }} 
                    settings={{
                      ...config,
                      store_name: config.storeName,
                      address: config.address,
                      footer_text: config.footer,
                      logo_url: config.logo
                    }} 
                 />
              </div>
          </div>

          <div className="bg-white p-6 rounded-b-[40px] border-x border-b border-gray-200 text-center">
             <p className="text-[10px] font-black text-gray-300 uppercase leading-relaxed tracking-widest px-4 italic">
               Hardware Simulation Interface
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}