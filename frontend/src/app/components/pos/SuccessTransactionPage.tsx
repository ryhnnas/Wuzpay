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

// ASUMSI: Data dikirim lewat props atau Location State
export function SuccessTransactionPage({ transaction, onBackToPOS }: any) {
  
  if (!transaction) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gray-50 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SISI KIRI: INFORMASI & AKSI UTAMA */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="size-20 bg-green-100 rounded-[32px] flex items-center justify-center text-green-600 shadow-lg shadow-green-100">
              <CheckCircle2 className="size-12" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-gray-800 uppercase">Transaksi Sukses!</h1>
              <p className="text-gray-500 font-medium">Pembayaran telah diterima dan stok telah diperbarui otomatis.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Metode</p>
              <div className="flex items-center gap-2 text-orange-600 font-black uppercase text-sm">
                <CreditCard className="size-4" />
                {transaction.payment_method}
              </div>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kasir</p>
              <div className="flex items-center gap-2 text-gray-700 font-black uppercase text-sm">
                <User className="size-4" />
                {transaction.cashier_name || 'Admin'}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={() => handleGlobalPrint(transaction)}
              className="h-16 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-100 rounded-2xl font-black text-lg shadow-sm flex gap-3 transition-all active:scale-95"
            >
              <Printer className="size-6 text-orange-600" />
              CETAK ULANG STRUK
            </Button>
            
            <Button 
              onClick={onBackToPOS}
              className="h-16 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-100 flex gap-3 transition-all active:scale-95"
            >
              <ArrowLeft className="size-6" />
              KEMBALI KE KASIR (POS)
            </Button>
          </div>
        </div>

        {/* SISI KANAN: PREVIEW STRUK DIGITAL */}
        <div className="flex items-center justify-center">
          <Card className="w-[380px] bg-white shadow-2xl rounded-[40px] overflow-hidden border-none relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-600" />
            
            <CardContent className="p-8 font-mono text-xs text-gray-700">
              <div className="text-center space-y-2 mb-6 pt-4">
                <div className="flex justify-center mb-2">
                   <Store className="size-8 text-orange-600" />
                </div>
                <h2 className="font-black text-xl tracking-tighter uppercase italic">SEBLAK MLEDAK</h2>
                <p className="text-[9px] leading-tight text-gray-400 uppercase">
                  Jl. Raya Bojongsoang, Bandung <br />
                  Telp: 0812-3456-7890
                </p>
              </div>

              <div className="border-y border-dashed py-3 space-y-1 mb-4">
                <div className="flex justify-between uppercase"><span>No:</span> <span>{transaction.receipt_number}</span></div>
                <div className="flex justify-between uppercase"><span>Tgl:</span> <span>{format(new Date(transaction.created_at), 'dd/MM/yy HH:mm')}</span></div>
                <div className="flex justify-between uppercase"><span>Cust:</span> <span>{transaction.customer_name}</span></div>
              </div>

              <div className="space-y-3 mb-6">
                {transaction.items?.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold uppercase">
                      <span>{item.product_name || item.name}</span>
                      <span>
                        {formatRupiah(item.total_amount || (item.price_at_sale * item.quantity) || (item.price * item.quantity))}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {item.quantity} x {formatRupiah(item.price_at_sale || item.price)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed pt-4 space-y-2">
                <div className="flex justify-between"><span>SUBTOTAL</span> <span>{formatRupiah(transaction.total_real_amount)}</span></div>
                {transaction.discount_amount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>DISKON ({transaction.discount_name})</span> 
                    <span>-{formatRupiah(transaction.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-lg pt-2 border-t border-gray-100">
                  <span className="tracking-tighter uppercase">TOTAL</span> 
                  <span className="text-orange-600">{formatRupiah(transaction.total_amount)}</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-dashed text-center space-y-1">
                <p className="font-black uppercase tracking-widest text-[10px]">Terima Kasih!</p>
                <p className="text-[9px] text-gray-400 italic">"Makan Seblak Sampai Mledakkk"</p>
              </div>
            </CardContent>
            
            {/* AKSEN KERTAS THERMAL SOBEK */}
            <div className="h-4 w-full bg-white flex gap-1 px-1 absolute -bottom-2">
               {Array.from({length: 20}).map((_, i) => (
                 <div key={i} className="flex-1 h-4 bg-gray-50 rounded-full" />
               ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}