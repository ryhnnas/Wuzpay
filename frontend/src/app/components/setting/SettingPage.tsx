import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Database, 
  Cpu, 
  Wallet, 
  Zap, 
  ChevronRight, 
  Printer, 
  ShieldCheck,
  Save,
  Server,
  Cloud
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsPageProps {
  onLogout: () => void;
}

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    geminiKey: '',
    openaiKey: '',
    paymentProvider: 'Midtrans',
    merchantId: '',
    n8nWebhook: ''
  });

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem('wuzpay_global_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSaveAll = () => {
    setIsSaving(true);
    // Simulasi sinkronisasi ke cloud WuzPay
    setTimeout(() => {
      localStorage.setItem('wuzpay_global_config', JSON.stringify(config));
      setIsSaving(false);
      toast.success("SEMUA KONFIGURASI WUZPAY BERHASIL DISIMPAN");
    }, 1000);
  };

  return (
    <div className="space-y-8 p-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="font-black text-4xl uppercase tracking-tighter text-orange-600 italic flex items-center gap-3">
             <Server className="size-10 text-orange-600" />
             Konfigurasi <span className="text-orange-600">Sistem</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">WuzPay Core Engine & Integration Protocol</p>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-orange-600 hover:bg-orange-600 text-white px-8 py-4 rounded-[22px] flex items-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-gray-200"
        >
          {isSaving ? <span className="animate-spin text-lg">●</span> : <Save className="size-5 text-orange-500" />}
          Commit All Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ================= COLUMN LEFT: ACCESS & STATUS ================= */}
        <div className="space-y-8">
          
          {/* USER SESSION CARD */}
          <div className="rounded-[40px] border-none bg-white p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100">
            <h3 className="mb-8 font-black text-[10px] uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
              <ShieldCheck className="size-5 text-orange-600" /> Security Perimeter
            </h3>
            
            <div className="flex items-center justify-between p-6 bg-red-50/50 rounded-[28px] border border-red-100/50 group hover:bg-red-50 transition-colors">
              <div>
                <p className="font-black text-sm text-red-900 uppercase italic">Terminasi Sesi</p>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight mt-1">
                  Keluar dari akun {localStorage.getItem('user_role') || 'Active Staff'}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="rounded-2xl bg-red-600 p-4 text-white hover:bg-red-700 transition-all active:scale-90 shadow-xl shadow-red-100 group-hover:rotate-12"
              >
                <LogOut className="size-6" />
              </button>
            </div>

            {/* QUICK LINK KE PRINTER */}
            <div className="mt-6 p-6 bg-orange-600 rounded-[32px] flex items-center justify-between group cursor-pointer hover:bg-orange-700 transition-all shadow-xl shadow-gray-200">
               <div className="flex items-center gap-5">
                  <div className="p-4 bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-transform">
                    <Printer className="size-6" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm uppercase italic">Hardware Interface</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Thermal Printer Setup</p>
                  </div>
               </div>
               <ChevronRight className="text-gray-700 group-hover:text-white transition-colors size-6" />
            </div>
          </div>

          {/* BACKEND INFRASTRUCTURE STATUS */}
          <div className="rounded-[40px] border-none bg-white p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100">
            <h3 className="mb-8 font-black text-[10px] uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
              <Cloud className="size-5 text-orange-600" /> Infrastructure Node
            </h3>
            <div className="space-y-4 font-mono text-[11px] bg-gray-50 p-8 rounded-[32px] border border-gray-100">
              <div className="flex justify-between items-center border-b border-gray-200/50 pb-3">
                <span className="text-gray-400 font-bold uppercase">Primary DB</span>
                <span className="text-emerald-500 font-black tracking-widest uppercase italic flex items-center gap-2">
                  <div className="size-2 bg-emerald-500 rounded-full animate-ping" />
                  MongoDB Atlas Online
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200/50 pb-3">
                <span className="text-gray-400 font-bold uppercase">Compute Engine</span>
                <span className="text-gray-800 font-black tracking-widest uppercase italic">Deno / Hono Framework</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200/50 pb-3">
                <span className="text-gray-400 font-bold uppercase">Auth Service</span>
                <span className="text-gray-800 font-black tracking-widest uppercase italic">JWT (Native WuzPay)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase">API Endpoint</span>
                <span className="text-orange-600 font-black tracking-widest uppercase italic">v4.1.0-stable</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= COLUMN RIGHT: CONFIGURATION ================= */}
        <div className="space-y-8">
          
          {/* AI INTELLIGENCE CONFIG */}
          <div className="rounded-[40px] border-none bg-white p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100">
            <h3 className="mb-8 font-black text-[10px] uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
              <Cpu className="size-5 text-orange-600" /> WuzPay AI Intelligence
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-4 tracking-[0.2em]">Gemini Pro API Key</label>
                <input
                  type="password"
                  value={config.geminiKey}
                  onChange={(e) => setConfig({...config, geminiKey: e.target.value})}
                  className="w-full rounded-[24px] border-none bg-gray-50 px-6 py-5 text-sm font-black focus:ring-2 focus:ring-orange-600 outline-none placeholder:text-gray-200 shadow-inner transition-all"
                  placeholder="Paste WuzPay AI Key..."
                />
              </div>
              <div className="space-y-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-4 tracking-[0.2em]">OpenAI Bridge (Optional)</label>
                <input
                  type="password"
                  value={config.openaiKey}
                  onChange={(e) => setConfig({...config, openaiKey: e.target.value})}
                  className="w-full rounded-[24px] border-none bg-gray-50 px-6 py-5 text-sm font-black focus:ring-2 focus:ring-orange-600 outline-none placeholder:text-gray-200 shadow-inner transition-all"
                  placeholder="Skp-..."
                />
              </div>
            </div>
          </div>

          {/* FINANCIAL GATEWAY CONFIG */}
          <div className="rounded-[40px] border-none bg-white p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100">
            <h3 className="mb-8 font-black text-[10px] uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
              <Wallet className="size-5 text-emerald-600" /> Financial Gateway
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-4 tracking-[0.2em]">QRIS Provider Utama</label>
                <div className="relative">
                  <select 
                    value={config.paymentProvider}
                    onChange={(e) => setConfig({...config, paymentProvider: e.target.value})}
                    className="w-full rounded-[24px] border-none bg-gray-50 px-6 py-5 text-xs font-black outline-none focus:ring-2 focus:ring-orange-600 appearance-none shadow-inner cursor-pointer"
                  >
                    <option>Midtrans (Auto-Check)</option>
                    <option>GoPay Business (Manual)</option>
                    <option>Xendit Protocol</option>
                  </select>
                  <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-gray-300 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-4 tracking-[0.2em]">WuzPay Merchant ID</label>
                <input
                  type="text"
                  value={config.merchantId}
                  onChange={(e) => setConfig({...config, merchantId: e.target.value})}
                  className="w-full rounded-[24px] border-none bg-gray-50 px-6 py-5 text-xs font-black outline-none focus:ring-2 focus:ring-orange-600 shadow-inner"
                  placeholder="M-WUZ-XXXXX"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WORKFLOW AUTOMATION SECTION (n8n Integration) */}
      <div className="rounded-[48px] border-none bg-white p-12 shadow-[0_20px_80px_rgba(0,0,0,0.04)] relative overflow-hidden group border border-gray-100">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
           <Zap className="size-48 text-orange-600" />
        </div>
        <h3 className="mb-10 font-black text-xs uppercase tracking-[0.4em] text-gray-400 flex items-center gap-3">
          <Zap className="size-5 text-orange-600 animate-pulse" /> Workflow Automation Hub
        </h3>
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="font-black text-[9px] uppercase text-gray-400 ml-6 tracking-[0.3em]">n8n Webhook Target URL</label>
            <input
              type="url"
              value={config.n8nWebhook}
              onChange={(e) => setConfig({...config, n8nWebhook: e.target.value})}
              placeholder="https://n8n.wuzpay.id/webhook/..."
              className="w-full rounded-[32px] border-none bg-orange-600 text-orange-400 px-8 py-6 text-xs font-mono outline-none focus:ring-4 focus:ring-orange-600/20 shadow-2xl"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {['WhatsApp Alerts', 'Daily PDF Reports', 'Cloud Auto Backup', 'Inventory Monitor'].map(item => (
               <div key={item} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3 hover:bg-orange-50 transition-colors cursor-help group/item">
                 <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <span className="text-[9px] font-black uppercase text-gray-600 tracking-tighter group-hover/item:text-orange-600">{item}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* FOOTER SYSTEM VERSION */}
      <div className="text-center pt-12">
        <div className="inline-flex items-center gap-4 px-6 py-2 bg-gray-100 rounded-full mb-4">
           <div className="size-2 bg-orange-600 rounded-full animate-ping" />
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.6em] italic">
             WuzPay Ecosystem • Sindangsari Sindangsari Edition
           </p>
        </div>
      </div>
    </div>
  );
}