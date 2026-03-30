import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Layers, 
  MoreVertical, Download, Upload, AlertCircle 
} from 'lucide-react';
import { categoriesAPI } from '@/services/api';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app//components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";

const KategoriManagement = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      setCategories(data);
    } catch (error) {
      toast.error("Gagal mengambil data kategori");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category: any = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error("Nama kategori wajib diisi");

    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, formData);
        toast.success("Kategori diperbarui");
      } else {
        await categoriesAPI.create(formData);
        toast.success("Kategori berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini? Produk dengan kategori ini mungkin akan terpengaruh.")) return;
    try {
      await categoriesAPI.delete(id);
      toast.success("Kategori dihapus");
      fetchCategories();
    } catch (error) {
      toast.error("Gagal menghapus kategori");
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
            <Layers className="size-8 text-orange-600" />
            Manajemen Kategori
          </h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mt-1">
            Kelola pengelompokan produk seblak kamu
          </p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl px-6 h-12 font-black transition-all active:scale-95 shadow-lg shadow-orange-100"
        >
          <Plus className="mr-2 size-5" /> TAMBAH KATEGORI
        </Button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
        <Input 
          placeholder="Cari kategori..." 
          className="pl-12 h-12 bg-gray-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-orange-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLE SECTION */}
      <div className="border rounded-[32px] overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow className="border-none">
              <TableHead className="font-black uppercase text-xs tracking-widest p-6 text-gray-400">Nama Kategori</TableHead>
              <TableHead className="font-black uppercase text-xs tracking-widest p-6 text-gray-400">Deskripsi</TableHead>
              <TableHead className="font-black uppercase text-xs tracking-widest p-6 text-gray-400 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-20 font-bold text-gray-300">Memuat data...</TableCell></TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-20 font-bold text-gray-300">Belum ada kategori</TableCell></TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                  <TableCell className="p-6 font-black text-gray-800 uppercase text-sm">{category.name}</TableCell>
                  <TableCell className="p-6 text-gray-500 font-medium">{category.description || '-'}</TableCell>
                  <TableCell className="p-6 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)} className="rounded-xl hover:bg-orange-50 hover:text-orange-600">
                      <Edit2 className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="rounded-xl hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL TAMBAH/EDIT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[32px] border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-gray-900">
              {editingCategory ? 'Edit Kategori' : 'Kategori Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-gray-400 ml-1">Nama Kategori</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Contoh: Seblak Pedas, Minuman..." 
                className="h-14 bg-gray-50 border-none rounded-2xl font-black text-lg focus-visible:ring-2 focus-visible:ring-orange-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-gray-400 ml-1">Deskripsi (Opsional)</Label>
              <Input 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Keterangan singkat..." 
                className="h-14 bg-gray-50 border-none rounded-2xl font-bold focus-visible:ring-2 focus-visible:ring-orange-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSubmit}
              className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {editingCategory ? 'Simpan Perubahan' : 'Buat Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KategoriManagement;