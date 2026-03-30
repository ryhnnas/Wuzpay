import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';
import { User } from '@/types';
import { Loader2, Lock, Mail, Eye, EyeOff, Check } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); 
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // --- 1. AUTO-FILL SAAT COMPONENT MOUNT ---
  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    const savedPwd = localStorage.getItem('remember_password');
    
    if (savedEmail && savedPwd) {
      try {
        setFormData({
          email: savedEmail,
          password: window.atob(savedPwd), // Decode base64
        });
        setRememberMe(true);
      } catch (e) {
        localStorage.removeItem('remember_email');
        localStorage.removeItem('remember_password');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Menembak ke API Hono + MongoDB kita
      const response = await authAPI.login(formData.email, formData.password);
      const { user } = response;

      // Token & Session sudah disimpan secara otomatis di dalam authAPI.login 
      // yang kita buat di services/api.ts sebelumnya.

      // --- 2. LOGIKA SIMPAN DATA REMEMBER ME ---
      if (rememberMe) {
        localStorage.setItem('remember_email', formData.email);
        localStorage.setItem('remember_password', window.btoa(formData.password)); 
      } else {
        localStorage.removeItem('remember_email');
        localStorage.removeItem('remember_password');
      }

      toast.success(`Selamat datang di WuzPay, ${user.name || 'Staff'}!`);
      
      setTimeout(() => {
        onLoginSuccess({ 
          ...user, 
          // @ts-ignore - mapping role ke menu awal
          defaultMenu: user.role === 'kasir' ? 'pos' : 'dashboard' 
        });
      }, 300);

    } catch (error: any) {
      // Error sekarang diambil dari response JSON backend (errorData.error)
      toast.error(error.message || "Akses ditolak. Cek email/password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdf8f4] p-4 relative overflow-hidden font-sans">
      {/* Dekorasi Background */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-30" />

      <Card className="w-full max-w-[420px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-none bg-white/80 backdrop-blur-xl rounded-[40px] z-10 animate-in zoom-in-95 duration-500">
        <div className="mb-10 text-center relative">
          <div className="mx-auto mb-6 relative w-24 h-24">
            <div className="absolute inset-0 bg-orange-600 rounded-full animate-pulse opacity-20 scale-110" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-orange-50 overflow-hidden">
              <img 
                src="/logo.png"
                alt="WuzPay Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h1 className="font-black text-3xl text-gray-900 tracking-tighter uppercase leading-none">
            WUZPAY <br />ABP_IF4706
          </h1>
          <p className="text-[10px] font-bold text-orange-600 tracking-[0.3em] mt-2 uppercase">
            Point of Sale System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
              Email Akses
            </label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
              <Input
                type="email"
                placeholder="staff@wuzpay.com"
                className="pl-14 h-14 bg-gray-50/50 border-gray-100 rounded-[22px] focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:bg-white transition-all shadow-sm text-gray-800"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
              Kata Sandi
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-14 pr-14 h-14 bg-gray-50/50 border-gray-100 rounded-[22px] focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:bg-white transition-all shadow-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-orange-600 transition-colors px-1"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 pb-2">
            <div 
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div className={cn(
                "size-5 rounded-lg border-2 flex items-center justify-center transition-all",
                rememberMe ? "bg-orange-600 border-orange-600 shadow-lg shadow-orange-100" : "border-gray-200 bg-white"
              )}>
                {rememberMe && <Check className="size-3 text-white stroke-[4px]" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-orange-600 transition-colors">
                Ingat Perangkat Ini
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-14 text-[10px] font-black bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 rounded-[22px] transition-all active:scale-[0.97] tracking-[0.2em] uppercase"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>OTENTIKASI...</span>
                </div>
              ) : (
                'MASUK KE WUZPAY'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">
            &copy; 2026 WUZPAY POS SYSTEM
          </p>
        </div>
      </Card>
    </div>
  );
}