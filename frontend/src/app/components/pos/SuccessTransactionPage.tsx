import React from 'react';
import { 
  CheckCircle2, Printer, ArrowLeft, ShoppingBag, 
  Calendar, User, CreditCard, Store 
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { handleGlobalPrint } from '@/app/components/utils/printHandler';
import { format } from 'date-fns';
import { cn } from "@/app/components/ui/utils";

export function SuccessTransactionPage({ transaction, onBackToPOS }: any) {
  
  if (!transaction) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-50 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500 font-sans">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12">
        
        {/* SISI KIRI: STATUS & ACTION */}
        <div className="flex flex-col justify-center space-y-10">
          <div className="space-y-6">
            <div className="size-24 bg-emerald-500 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-emerald-200 animate-bounce">
              <CheckCircle2 className="size-14 stroke-[3px]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tighter text-gray-900 uppercase italic">
                WuzPay <span className="text-emerald-500">Berhasil!</span>
              </h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                Transaksi telah dicatat dan stok inventori diperbarui.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Metode Bayar</p>
              <div className="flex items-center gap-3 text-orange-600 font-black uppercase text-sm italic">
                <CreditCard className="size-5" />
                {transaction.payment_method}
              </div>
            </Card>
            <Card className="border-none shadow-sm rounded-3xl bg-white p-6">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">ID Transaksi</p>
              <div className="flex items-center gap-3 text-gray-700 font-black uppercase text-[10px] tracking-tighter">
                {transaction._id?.substring(0, 12).toUpperCase() || 'WUZ-NEW'}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Button 
              onClick={() => handleGlobalPrint({ ...transaction, store_name: "WUZPAY SINDANGSARI" })}
              className="h-20 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-100 rounded-[28px] font-black text-xl shadow-sm flex gap-4 transition-all active:scale-95 group"
            >
              <Printer className="size-7 text-orange-600 group-hover:rotate-12 transition-transform" />
              CETAK ULANG STRUK
            </Button>
            
            <Button 
              onClick={onBackToPOS}
              className="h-20 bg-gray-900 hover:bg-orange-600 text-white rounded-[28px] font-black text-xl shadow-2xl shadow-gray-200 flex gap-4 transition-all active:scale-95"
            >
              <ArrowLeft className="size-7" />
              TRANSAKSI BARU
            </Button>
          </div>
        </div>

        {/* SISI KANAN: PREVIEW STRUK DIGITAL WUZPAY */}
        <div className="flex items-center justify-center">
          <Card className="w-[400px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.1)] rounded-[50px] overflow-hidden border-none relative scale-105">
            <div className="absolute top-0 left-0 w-full h-3 bg-orange-600" />
            
            <CardContent className="p-10 font-mono text-[11px] text-gray-800 leading-relaxed">
              <div className="text-center space-y-2 mb-8 pt-4">
                <div className="flex justify-center mb-3">
                   <div className="size-14 bg-orange-50 rounded-2xl flex items-center justify-center">
                      <Store className="size-8 text-orange-600" />
                   </div>
                </div>
                <h2 className="font-black text-2xl tracking-tighter uppercase italic">WUZ<span className="text-orange-600">PAY</span></h2>
                <p className="text-[10px] leading-tight text-gray-400 uppercase font-bold tracking-tighter">
                  SINDANGSARI - KOTA BANDUNG <br />
                  WA: 0812-XXXX-XXXX
                </p>
              </div>

              <div className="border-y-2 border-dashed border-gray-100 py-4 space-y-1.5 mb-6">
                <div className="flex justify-between uppercase font-bold"><span>Order ID</span> <span className="text-gray-400">#{transaction._id?.substring(18) || 'NEW'}</span></div>
                <div className="flex justify-between uppercase font-bold"><span>Waktu</span> <span>{format(new Date(transaction.created_at || Date.now()), 'dd/MM/yy HH:mm')}</span></div>
                <div className="flex justify-between uppercase font-bold"><span>Pelanggan</span> <span className="text-orange-600">{transaction.customer_name}</span></div>
              </div>

              {/* LIST ITEMS - MAPPING SESUAI SCHEMA BARU */}
              <div className="space-y-4 mb-8">
                {transaction.items?.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-black uppercase text-xs">
                      <span className="truncate max-w-[180px]">{item.product_name || item.name}</span>
                      <span>
                        {formatRupiah(item.subtotal || (item.price_at_sale * item.quantity))}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      {item.quantity} x {formatRupiah(item.price_at_sale || item.price)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-gray-100 pt-6 space-y-3">
                <div className="flex justify-between font-bold"><span>SUBTOTAL</span> <span>{formatRupiah(transaction.subtotal || transaction.total_real_amount)}</span></div>
                
                {transaction.discount_amount > 0 && (
                  <div className="flex justify-between text-red-500 font-bold italic">
                    <span>PROMO ({transaction.discount_name?.toUpperCase()})</span> 
                    <span>-{formatRupiah(transaction.discount_amount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-black text-xl pt-4 border-t border-gray-50 mt-2">
                  <span className="tracking-tighter uppercase italic">TOTAL</span> 
                  <span className="text-orange-600">{formatRupiah(transaction.total_amount)}</span>
                </div>

                <div className="flex justify-between text-[10px] font-bold text-gray-400 pt-2">
                  <span>BAYAR ({transaction.payment_method?.toUpperCase()})</span>
                  <span>{formatRupiah(transaction.paid_amount)}</span>
                </div>
                {transaction.change_amount > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-emerald-600">
                    <span>KEMBALI</span>
                    <span>{formatRupiah(transaction.change_amount)}</span>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-dashed border-gray-100 text-center space-y-2">
                <p className="font-black uppercase tracking-[0.3em] text-xs">WuzPay Sindangsari</p>
                <p className="text-[10px] text-gray-300 italic font-bold">"Nikmati seblaknya, rasakan ledakannya!"</p>
              </div>
            </CardContent>
            
            {/* AKSEN GIGI STRUK KERTAS */}
            <div className="h-6 w-full bg-white flex gap-1.5 px-2 absolute -bottom-3">
               {Array.from({length: 15}).map((_, i) => (
                 <div key={i} className="flex-1 h-6 bg-slate-50 rounded-full" />
               ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}