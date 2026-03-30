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
  Save
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
    const saved = localStorage.getItem('nex_pos_global_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('nex_pos_global_config', JSON.stringify(config));
      setIsSaving(false);
      toast.success("SEMUA KONFIGURASI BERHASIL DISIMPAN");
    }, 1000);
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter text-gray-900 italic">Pengaturan Sistem</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Core Engine & Integration Seblak Mledak</p>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-orange-600 hover:bg-black text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-100"
        >
          {isSaving ? <span className="animate-spin">●</span> : <Save className="size-4" />}
          Simpan Semua Perubahan
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* ================= ACCOUNT & HARDWARE QUICK LINK ================= */}
        <div className="space-y-6">
          <div className="rounded-[32px] border-none bg-white p-8 shadow-sm">
            <h3 className="mb-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <ShieldCheck className="size-4 text-orange-600" /> Manajemen Akses
            </h3>
            <div className="flex items-center justify-between p-5 bg-red-50 rounded-[24px] border border-red-100">
              <div>
                <p className="font-black text-xs text-red-900 uppercase italic">Logout Sesi</p>
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-tighter">Keluar dari akun {localStorage.getItem('user_role') || 'Kasir'}</p>
              </div>
              <button
                onClick={onLogout}
                className="rounded-xl bg-red-600 p-3 text-white hover:bg-red-700 transition-all active:scale-90 shadow-md shadow-red-100"
              >
                <LogOut className="size-5" />
              </button>
            </div>

            {/* QUICK LINK KE PRINTER */}
            <div className="mt-4 p-5 bg-gray-900 rounded-[24px] flex items-center justify-between group cursor-pointer hover:bg-black transition-all">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600 rounded-xl text-white">
                    <Printer className="size-5" />
                  </div>
                  <div>
                    <p className="text-white font-black text-xs uppercase italic">Setting Printer</p>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">Koneksi USB / Bluetooth</p>
                  </div>
               </div>
               <ChevronRight className="text-gray-700 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* BACKEND STATUS */}
          <div className="rounded-[32px] border-none bg-white p-8 shadow-sm">
            <h3 className="mb-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Database className="size-4 text-blue-600" /> Backend Status
            </h3>
            <div className="space-y-3 font-mono text-[10px] bg-gray-50 p-6 rounded-[24px]">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-400 font-bold uppercase">Database</span>
                <span className="text-green-600 font-black tracking-widest uppercase italic">Connected ●</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-400 font-bold uppercase">Engine</span>
                <span className="text-gray-800 font-black tracking-widest uppercase italic">PostgreSQL (Supabase)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase">API Version</span>
                <span className="text-gray-800 font-black tracking-widest uppercase italic">v3.0.4-edge</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CONFIGURATION FORMS ================= */}
        <div className="space-y-6">
          {/* AI CONFIG */}
          <div className="rounded-[32px] border-none bg-white p-8 shadow-sm">
            <h3 className="mb-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Cpu className="size-4 text-purple-600" /> Intelegensi Buatan
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-1 tracking-widest">Gemini Pro API Key</label>
                <input
                  type="password"
                  value={config.geminiKey}
                  onChange={(e) => setConfig({...config, geminiKey: e.target.value})}
                  className="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 text-xs font-black focus:ring-2 focus:ring-orange-600 outline-none placeholder:text-gray-300"
                  placeholder="Paste your key here..."
                />
              </div>
              <div className="space-y-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-1 tracking-widest">OpenAI API Key</label>
                <input
                  type="password"
                  value={config.openaiKey}
                  onChange={(e) => setConfig({...config, openaiKey: e.target.value})}
                  className="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 text-xs font-black focus:ring-2 focus:ring-orange-600 outline-none placeholder:text-gray-300"
                  placeholder="Optional..."
                />
              </div>
            </div>
          </div>

          {/* PAYMENT GATEWAY */}
          <div className="rounded-[32px] border-none bg-white p-8 shadow-sm">
            <h3 className="mb-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Wallet className="size-4 text-green-600" /> Gerbang Pembayaran
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-1 tracking-widest">Provider Utama</label>
                <select 
                  value={config.paymentProvider}
                  onChange={(e) => setConfig({...config, paymentProvider: e.target.value})}
                  className="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-orange-600 appearance-none"
                >
                  <option>Midtrans</option>
                  <option>Xendit</option>
                  <option>DOKU</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-black text-[9px] uppercase text-gray-400 ml-1 tracking-widest">Merchant ID</label>
                <input
                  type="text"
                  value={config.merchantId}
                  onChange={(e) => setConfig({...config, merchantId: e.target.value})}
                  className="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATION SECTION (n8n) */}
      <div className="rounded-[32px] border-none bg-white p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Zap className="size-32 text-orange-600" />
        </div>
        <h3 className="mb-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
          <Zap className="size-4 text-orange-600" /> Workflow Automation
        </h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="font-black text-[9px] uppercase text-gray-400 ml-1 tracking-widest">n8n Webhook URL</label>
            <input
              type="url"
              value={config.n8nWebhook}
              onChange={(e) => setConfig({...config, n8nWebhook: e.target.value})}
              placeholder="https://your-instance.com/webhook/..."
              className="w-full rounded-[24px] border-none bg-gray-900 text-orange-400 px-6 py-5 text-xs font-mono outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>
          <div className="grid md:grid-cols-4 gap-3">
             {['WA Alerts', 'Daily Reports', 'Auto Backup', 'Stock Monitor'].map(item => (
               <div key={item} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                 <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase text-gray-600 tracking-tighter">{item}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* FOOTER BANNER */}
      <div className="text-center pt-6">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] italic">
          Nexera POS System • Seblak Mledak Edition
        </p>
      </div>
    </div>
  );
}