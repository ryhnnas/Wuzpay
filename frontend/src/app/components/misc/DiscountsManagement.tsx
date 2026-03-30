import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Layers, Package, Loader2, Info } from 'lucide-react';
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
  
  // STATE LOADING UNTUK SINKRONISASI
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
      console.error("Gagal memuat data:", error);
      toast.error("Gagal sinkronisasi data promo");
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
      // Map database fields to form state
      productId: discount.product_id || discount.productId || '',
      categoryId: discount.category_id || discount.categoryId || '',
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

      if (editingDiscount) {
        await discountsAPI.update(editingDiscount.id, payload);
        toast.success('Promo berhasil diperbarui');
      } else {
        await discountsAPI.create(payload);
        toast.success('Promo baru berhasil dibuat');
      }
      
      setShowDialog(false);
      loadData();
    } catch (err) {
      toast.error("Gagal menyimpan data promo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus promo ini secara permanen?')) return;
    try {
      await discountsAPI.delete(id);
      toast.success('Promo dihapus');
      loadData();
    } catch (error) {
      toast.error('Gagal menghapus diskon');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest animate-pulse">
          Sinkronisasi Promo...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl uppercase tracking-tighter text-gray-800">Manajemen Diskon</h2>
          <p className="text-gray-500 text-sm italic">Atur strategi promo Seblak Mledak</p>
        </div>
        <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-xs shadow-md">
          <Plus className="mr-2 size-4" /> TAMBAH DISKON
        </Button>
      </div>

      <div className="rounded-2xl border shadow-sm bg-white overflow-hidden border-gray-100">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase py-4">Nama Diskon</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Nilai Potongan</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Cakupan (Scope)</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-6">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-gray-400 italic text-xs">Belum ada promo aktif...</TableCell>
              </TableRow>
            ) : (
              discounts.map(discount => (
                <TableRow key={discount.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-black text-gray-800 uppercase text-xs px-6 py-4">{discount.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-orange-600 font-bold text-[10px] px-2 py-0.5 rounded-lg border-orange-100">
                      {discount.value} {discount.value_type === 'percentage' ? '%' : 'IDR'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500 tracking-tighter">
                        {discount.scope === 'product' || discount.scope === 'item' ? <Package className="size-3 text-blue-500" /> : <Layers className="size-3 text-purple-500" />}
                        {discount.scope === 'product' ? 'PER PRODUK' : discount.scope === 'category' ? 'PER KATEGORI' : 'TRANSAKSI'}
                     </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                      discount.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    )}>
                      {discount.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(discount)} className="rounded-lg hover:bg-orange-50">
                        <Edit className="size-4 text-gray-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-500 rounded-lg hover:bg-red-50" onClick={() => handleDelete(discount.id)}>
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
        <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase font-black tracking-tighter text-center text-xl">
              {editingDiscount ? 'Update Promo' : 'Buat Promo Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Nama Diskon *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Misal: PROMO CEKER MRETEK"
                className="rounded-xl bg-gray-50 border-none h-11 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Nilai Potongan</Label>
                <Input
                  type="number"
                  value={formData.value === 0 ? "" : formData.value}
                  placeholder="0"
                  onChange={(e) => {
                    let val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    if (formData.value_type === 'percentage' && val > 100) val = 100;
                    setFormData({ ...formData, value: val });
                  }}
                  className="rounded-xl bg-gray-50 border-none h-11 font-black text-orange-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Tipe</Label>
                <Select
                  value={formData.value_type}
                  onValueChange={(val) => setFormData({ ...formData, value_type: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-none h-11 font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">PERSEN (%)</SelectItem>
                    <SelectItem value="fixed">NOMINAL (IDR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Target Diskon (Scope)</Label>
              <Select
                value={formData.scope}
                onValueChange={(val) => setFormData({ ...formData, scope: val, productId: '', categoryId: '' })}
              >
                <SelectTrigger className="rounded-xl bg-gray-50 border-none h-11 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">PER PRODUK (MENU)</SelectItem>
                  <SelectItem value="category">PER KATEGORI</SelectItem>
                  <SelectItem value="transaction">SELURUH TRANSAKSI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scope === 'item' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Pilih Menu Produk</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(val) => setFormData({ ...formData, productId: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-none h-11 font-bold text-xs uppercase">
                    <SelectValue placeholder="PILIH MENU SEBLAK..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="uppercase text-[10px] font-bold">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.scope === 'category' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Pilih Kategori Menu</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-none h-11 font-bold text-xs uppercase">
                    <SelectValue placeholder="PILIH KATEGORI..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id} className="uppercase text-[10px] font-bold">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-dashed">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-orange-500" />
                <Label className="cursor-pointer text-xs font-bold uppercase" htmlFor="active">Promo Sedang Aktif</Label>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl font-bold">BATAL</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 rounded-2xl font-black shadow-lg px-8">
              {isSaving ? <Loader2 className="animate-spin size-4" /> : <Tag className="mr-2 size-4" />}
              SIMPAN PROMO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}