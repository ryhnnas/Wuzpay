import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Layers, Package, Loader2, Info, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { discountsAPI, productsAPI, categoriesAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

export function DiscountsManagement() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '',
    value: 0,
    value_type: 'percentage',
    scope: 'item',
    is_active: true,
    categoryId: '',
    productId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resD, resP, resC] = await Promise.all([
        discountsAPI.getAll(),
        productsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);

      setDiscounts(Array.isArray(resD) ? resD : (resD.discounts || []));
      setProducts(Array.isArray(resP) ? resP : (resP.products || [])); 
      setCategories(Array.isArray(resC) ? resC : (resC.categories || []));
    } catch (error) {
      toast.error("Gagal sinkronisasi data promo WuzPay");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDiscount(null);
    setFormData({
      name: '', value: 0, value_type: 'percentage', scope: 'item',
      is_active: true, categoryId: '', productId: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (discount: any) => {
    setEditingDiscount(discount);
    setFormData({
      ...discount,
      // Map MongoDB _id fields to form state
      productId: discount.product_id?._id || discount.product_id || '',
      categoryId: discount.category_id?._id || discount.category_id || '',
      scope: discount.scope === 'product' ? 'item' : discount.scope
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.value <= 0) {
      toast.error('Nama dan Nilai promo wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || "",
        value: parseFloat(formData.value.toString()),
        value_type: formData.value_type.toLowerCase(),
        scope: formData.scope === 'item' ? 'product' : formData.scope.toLowerCase(),
        is_active: formData.is_active ?? true,
        product_id: formData.scope === 'item' ? (formData.productId || null) : null,
        category_id: formData.scope === 'category' ? (formData.categoryId || null) : null,
      };

      const targetId = editingDiscount?._id || editingDiscount?.id;

      if (editingDiscount) {
        await discountsAPI.update(targetId, payload);
        toast.success('Promo WuzPay diperbarui');
      } else {
        await discountsAPI.create(payload);
        toast.success('Promo WuzPay baru diaktifkan');
      }
      
      setShowDialog(false);
      loadData();
    } catch (err) {
      toast.error("Gagal menyimpan konfigurasi promo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (discount: any) => {
    const targetId = discount._id || discount.id;
    if (!confirm(`Hapus promo "${discount.name}" secara permanen?`)) return;
    try {
      await discountsAPI.delete(targetId);
      toast.success('Promo dihapus dari sistem');
      loadData();
    } catch (error) {
      toast.error('Gagal menghapus diskon');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-black text-gray-400 uppercase text-[10px] tracking-widest animate-pulse">
          Sinkronisasi Promo WuzPay...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter italic text-gray-900">
            Promo & <span className="text-orange-600">Diskon</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Kelola Strategi Marketing WuzPay</p>
        </div>
        <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] tracking-widest shadow-lg shadow-orange-100 h-12 px-8 transition-all active:scale-95">
          <Plus className="mr-2 size-5" /> TAMBAH PROMO
        </Button>
      </div>

      <div className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 border-none hover:bg-gray-50/50">
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 py-6 pl-10">Nama Diskon</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Potongan</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Cakupan (Scope)</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Status</TableHead>
              <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-gray-400 pr-10">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-24 text-gray-300 font-black uppercase tracking-[0.4em] italic text-[10px]">Belum ada promo yang terdaftar...</TableCell>
              </TableRow>
            ) : (
              discounts.map(discount => (
                <TableRow key={discount._id || discount.id} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors group">
                  <TableCell className="font-black text-gray-900 uppercase text-xs pl-10 py-6 italic">{discount.name}</TableCell>
                  <TableCell>
                    <Badge className="bg-orange-50 text-orange-600 font-black text-[10px] px-3 py-1 rounded-lg border-none shadow-sm">
                      {discount.value} {discount.value_type === 'percentage' ? '%' : 'IDR'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2 text-[10px] uppercase font-black text-gray-500 tracking-widest">
                        {discount.scope === 'product' || discount.scope === 'item' ? <Package className="size-3.5 text-blue-500" /> : <Layers className="size-3.5 text-purple-500" />}
                        {discount.scope === 'product' || discount.scope === 'item' ? 'Menu Spesifik' : discount.scope === 'category' ? 'Kategori' : 'transaction'}
                     </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 border-none rounded-full shadow-sm",
                      discount.is_active ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                    )}>
                      {discount.is_active ? 'AKTIF' : 'NON-AKTIF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-all">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(discount)} className="rounded-xl hover:bg-orange-100 text-orange-600 transition-all">
                        <Edit className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-400 rounded-xl hover:bg-red-50 transition-all" onClick={() => handleDelete(discount)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[460px] rounded-[40px] p-10 border-none shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="uppercase font-black tracking-tighter text-center text-3xl italic">
              {editingDiscount ? 'Update' : 'Konfigurasi'} <span className="text-orange-600">Promo</span>
            </DialogTitle>
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-300 mt-2">Strategi Diskon WuzPay Sindangsari</p>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nama Kampanye Promo *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Misal: PROMO JUMAT BERKAH"
                className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-black uppercase text-xs pl-6 focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nilai Potongan</Label>
                <Input
                  type="number"
                  value={formData.value === 0 ? "" : formData.value}
                  placeholder="0"
                  onChange={(e) => {
                    let val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    if (formData.value_type === 'percentage' && val > 100) val = 100;
                    setFormData({ ...formData, value: val });
                  }}
                  className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-black text-xl text-orange-600 pl-6 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Tipe Potongan</Label>
                <Select
                  value={formData.value_type}
                  onValueChange={(val) => setFormData({ ...formData, value_type: val })}
                >
                  <SelectTrigger className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-black text-[10px] uppercase px-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage" className="font-black text-[10px] uppercase">PERSEN (%)</SelectItem>
                    <SelectItem value="fixed" className="font-black text-[10px] uppercase">RUPIAH (IDR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Cakupan Promo (Scope)</Label>
              <Select
                value={formData.scope}
                onValueChange={(val) => setFormData({ ...formData, scope: val, productId: '', categoryId: '' })}
              >
                <SelectTrigger className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-black text-[10px] uppercase px-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item" className="font-black text-[10px] uppercase tracking-tighter">PER PRODUK (MENU)</SelectItem>
                  <SelectItem value="category" className="font-black text-[10px] uppercase tracking-tighter">PER KATEGORI</SelectItem>
                  <SelectItem value="transaction" className="font-black text-[10px] uppercase tracking-tighter">SELURUH TRANSAKSI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scope === 'item' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-4">Pilih Menu Produk</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(val) => setFormData({ ...formData, productId: val })}
                >
                  <SelectTrigger className="rounded-2xl bg-blue-50/30 border-blue-100 h-14 font-black text-[10px] uppercase px-6 text-blue-700">
                    <SelectValue placeholder="PILIH MENU SPESIFIK..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p._id || p.id} value={p._id || p.id} className="uppercase text-[10px] font-black">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.scope === 'category' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-widest text-purple-600 ml-4">Pilih Kategori Menu</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                >
                  <SelectTrigger className="rounded-2xl bg-purple-50/30 border-purple-100 h-14 font-black text-[10px] uppercase px-6 text-purple-700">
                    <SelectValue placeholder="PILIH KATEGORI..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c._id || c.id} value={c._id || c.id} className="uppercase text-[10px] font-black">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-6 bg-gray-50/80 rounded-[28px] border border-dashed border-gray-200">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl transition-all shadow-sm",
                  formData.is_active ? "bg-emerald-100" : "bg-gray-200"
                )}>
                  {formData.is_active ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-gray-400" />}
                </div>
                <div>
                  <Label className="cursor-pointer text-[10px] font-black uppercase tracking-widest block" htmlFor="active">Status Promo</Label>
                  <span className="text-[9px] font-bold text-gray-400 uppercase italic">{formData.is_active ? 'Siap digunakan di kasir' : 'Diberhentikan sementara'}</span>
                </div>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-10 flex gap-4">
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="bg-orange-600 rounded-2xl font-black uppercase text-[10px] tracking-widest h-14 px-8 flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-gray-900 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl h-14 flex-[2] transition-all">
              {isSaving ? <Loader2 className="animate-spin size-4" /> : <CheckCircle2 className="mr-2 size-4" />}
              AKTIFKAN PROMO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}