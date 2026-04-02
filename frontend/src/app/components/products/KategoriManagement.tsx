import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Layers, 
  Loader2, AlertCircle 
} from 'lucide-react';
import { categoriesAPI } from '@/services/api';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/app/components/ui/utils";

const KategoriManagement = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk Dialog Tambah/Edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesAPI.getAll();
      // Pastikan data yang masuk adalah array
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Gagal sinkronisasi kategori WuzPay");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category: any = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ 
        name: category.name, 
        description: category.description || '' 
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error("Nama kategori wajib diisi");

    setIsSaving(true);
    try {
      if (editingCategory) {
        // Gunakan _id untuk MongoDB
        const targetId = editingCategory._id || editingCategory.id;
        await categoriesAPI.update(targetId, formData);
        toast.success("Kategori berhasil diperbarui");
      } else {
        await categoriesAPI.create(formData);
        toast.success("Kategori WuzPay berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan kategori");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: any) => {
    const targetId = category._id || category.id;
    if (!confirm(`Hapus kategori "${category.name}"? Produk di kategori ini mungkin akan kehilangan labelnya.`)) return;
    
    try {
      await categoriesAPI.delete(targetId);
      toast.success("Kategori telah dihapus");
      fetchCategories();
    } catch (error) {
      toast.error("Gagal menghapus kategori");
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen animate-in fade-in duration-500">
      {/* HEADER: SEARCH + BUTTON */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-gray-300 group-focus-within:text-orange-600 transition-colors" />
          <Input 
            placeholder="Cari kategori menu..." 
            className="pl-14 h-14 bg-gray-50/50 border-gray-100 rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-[20px] px-8 h-14 font-black transition-all active:scale-95 shadow-xl shadow-orange-100 uppercase tracking-widest text-xs shrink-0"
        >
          <Plus className="mr-2 size-5 stroke-[3px]" /> TAMBAH KATEGORI
        </Button>
      </div>

      {/* TABLE AREA */}
      <div className="rounded-[40px] border border-gray-100 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.03)] bg-white">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] p-8 text-gray-600">Nama Kategori</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] p-8 text-gray-600">Deskripsi / Catatan</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] p-8 text-gray-600 text-right">Aksi Kontrol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-32">
                  <Loader2 className="size-10 text-orange-600 animate-spin mx-auto mb-4" />
                  <p className="font-black text-[10px] uppercase tracking-widest text-gray-400 animate-pulse">Menghubungkan ke MongoDB...</p>
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-32">
                  <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layers className="size-8 text-gray-200" />
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-widest text-gray-300 italic">Belum ada data kategori tersimpan</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category._id || category.id} className="hover:bg-orange-50/20 transition-colors border-b border-gray-50 group">
                  <TableCell className="p-8">
                    <div className="flex flex-col">
                      <span className="font-black text-orange-600 uppercase text-sm italic group-hover:text-orange-600 transition-colors">{category.name}</span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter mt-1">ID: {category._id?.substring(18) || 'AUTO'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-8">
                    <p className="text-xs text-orange-600 font-bold leading-relaxed max-w-md">
                      {category.description || <span className="text-gray-400 italic font-medium">Tidak ada deskripsi tambahan...</span>}
                    </p>
                  </TableCell>
                  <TableCell className="p-8 text-right">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-all">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenDialog(category)} 
                        className="rounded-xl hover:bg-orange-100 text-orange-600 shadow-sm border border-gray-100 bg-white transition-all"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(category)} 
                        className="rounded-xl hover:bg-red-50 text-red-500 shadow-sm border border-gray-100 bg-white transition-all"
                      >
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

      {/* MODAL FORM */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[40px] border-none p-10 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-orange-600 italic">
              {editingCategory ? 'Update' : 'Buat'} <span className="text-orange-600">Kategori</span>
            </DialogTitle>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2">Master Data Produk WuzPay</p>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest text-gray-400 ml-4">Nama Kategori Menu *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="MISAL: SEBLAK KUAH, DRINK..." 
                className="h-16 bg-gray-50/50 border-gray-100 rounded-[24px] font-black text-lg focus-visible:ring-2 focus-visible:ring-orange-600 uppercase transition-all px-6"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] tracking-widest text-gray-400 ml-4">Deskripsi (Opsional)</Label>
              <Input 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Keterangan kategori..." 
                className="h-16 bg-gray-50/50 border-gray-100 rounded-[24px] font-bold focus-visible:ring-2 focus-visible:ring-orange-600 px-6 transition-all"
              />
            </div>
          </div>

          <DialogFooter className="mt-10 flex gap-3">
             <Button 
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 h-16 rounded-[24px] font-black uppercase tracking-widest text-[10px] text-gray-400"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-[2] h-16 bg-orange-600 hover:bg-orange-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95"
            >
              {isSaving ? <Loader2 className="mr-2 size-5 animate-spin" /> : editingCategory ? 'Update Data' : 'Simpan Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KategoriManagement;