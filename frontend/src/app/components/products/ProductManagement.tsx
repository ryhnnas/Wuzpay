import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Upload, Download, Package,
  AlertCircle, Loader2, Save, ChevronLeft, ChevronRight, Image as ImageIcon,
  ChefHat
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { productsAPI, categoriesAPI, ingredientsAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from "@/app/components/ui/utils";

export function ProductManagement() {
  // --- STATES ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]); // State untuk bahan baku
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<any>({
    name: '', sku: '', description: '', category_id: '',
    price: 0, cost_price: 0, image_url: '', recipe: []
  });

  // --- LIFECYCLE ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, ingredientsData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        ingredientsAPI.getAll(), // Tarik data bahan baku dari database
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : []);
    } catch (error) {
      toast.error("Gagal sinkronisasi database WuzPay");
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIC FILTERING ---
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      const catId = product.category_id?._id || product.category_id;
      const matchesCategory = selectedCategory === 'all' || catId === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // --- ACTIONS: PRODUCT ---
  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', description: '', category_id: '', price: 0, cost_price: 0, image_url: '', recipe: [] });
    setShowProductDialog(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    // Normalisasi: pastikan ingredient_id selalu string ID, bukan populated object
    const normalizedRecipe = (product.recipe || []).map((r: any) => ({
      ingredient_id: r.ingredient_id?._id || r.ingredient_id || '',
      amount_needed: r.amount_needed || 0,
    }));
    setFormData({
      name: product.name || '',
      description: product.description || '',
      sku: product.sku || '',
      price: product.price || 0,
      cost_price: product.cost_price || 0,
      category_id: product.category_id?._id || product.category_id || '',
      image_url: product.image_url || '',
      recipe: normalizedRecipe,
    });
    setShowProductDialog(true);
  };

  // --- ACTIONS: RECIPE BUILDER ---
  const handleAddRecipeItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      recipe: [...prev.recipe, { ingredient_id: '', amount_needed: 1 }]
    }));
  };

  const handleRecipeChange = (index: number, field: string, value: any) => {
    const newRecipe = [...formData.recipe];
    newRecipe[index] = { ...newRecipe[index], [field]: value };

    // Jika yang diubah adalah ingredient_id, cek apakah sudah ada di baris lain
    if (field === 'ingredient_id' && value) {
      const existingIdx = newRecipe.findIndex((r: any, i: number) => i !== index && r.ingredient_id === value);
      if (existingIdx !== -1) {
        // Gabungkan qty ke baris yang sudah ada
        const currentQty = parseFloat(newRecipe[existingIdx].amount_needed) || 0;
        const addedQty = parseFloat(newRecipe[index].amount_needed) || 1;
        newRecipe[existingIdx].amount_needed = currentQty + addedQty;
        // Hapus baris duplikat
        newRecipe.splice(index, 1);
        toast.info('Bahan baku sudah ada di resep, kuantitas digabungkan.');
      }
    }

    setFormData({ ...formData, recipe: newRecipe });
  };

  const handleRemoveRecipeItem = (index: number) => {
    const newRecipe = formData.recipe.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, recipe: newRecipe });
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Nama dan Harga Jual wajib diisi');
      return;
    }

    // Validasi resep agar tidak ada ID atau amount kosong
    const cleanRecipe = formData.recipe.filter((r: any) => r.ingredient_id && r.amount_needed > 0);
    const finalData = { ...formData, recipe: cleanRecipe };

    try {
      if (editingProduct) {
        const targetId = editingProduct._id || editingProduct.id;
        await productsAPI.update(targetId, finalData);
        toast.success('Katalog WuzPay diperbarui');
      } else {
        await productsAPI.create(finalData);
        toast.success('Menu baru ditambahkan ke WuzPay');
      }
      setShowProductDialog(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan perubahan');
    }
  };

  const handleDelete = async (product: any) => {
    const targetId = product._id || product.id;
    if (!confirm(`Hapus menu "${product.name}" secara permanen?`)) return;
    try {
      await productsAPI.delete(targetId);
      toast.success('Produk dihapus dari sistem');
      loadData();
    } catch (error) {
      toast.error('Gagal menghapus produk');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // --- IMPORT EXPORT LOGIC ---
  const handleExportExcel = () => {
    try {
      toast.info("Menyiapkan file excel...");
      productsAPI.export();
    } catch (error) {
      toast.error("Gagal mendownload data produk");
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) return;

    const fData = new FormData();
    fData.append('file', importFile);
    setIsImporting(true);

    const loadingToast = toast.loading("Sedang mengimpor data produk...");

    try {
      const response = await productsAPI.import(fData);
      if (response.success) {
        toast.success(`Berhasil! ${response.results?.added || 0} produk ditambah`, { id: loadingToast });
        setShowImportDialog(false);
        loadData();
      } else {
        throw new Error(response.error || "Gagal mengimpor");
      }
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-12 text-orange-600 animate-spin" />
        <p className="font-black text-gray-400 uppercase text-xs tracking-[0.2em] animate-pulse">Syncing WuzPay Catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 animate-in fade-in duration-500 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter italic text-orange-600">
            Katalog <span className="text-orange-600">Menu</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Pengaturan Resep dan HPP Produk Utama</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportExcel} className="rounded-[20px] font-black text-[10px] uppercase tracking-widest border-gray-100 h-14 px-6 hover:bg-orange-50 hover:text-orange-600 transition-all">
            <Download className="mr-2 size-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="rounded-[20px] font-black text-[10px] uppercase tracking-widest border-gray-100 h-14 px-6 hover:bg-orange-50 hover:text-orange-600 transition-all">
            <Upload className="mr-2 size-4" /> Import
          </Button>
          <Button onClick={handleAddProduct} className="bg-orange-600 hover:bg-orange-700 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-200 h-14 px-8 transition-all active:scale-95">
            <Plus className="mr-2 size-5" /> Tambah Menu
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* CATEGORY PILLS */}
        <div className="flex flex-wrap gap-2 order-2 md:order-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-6 h-11 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
              selectedCategory === 'all' ? "bg-orange-600 text-white shadow-lg shadow-orange-100" : "bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-600"
            )}
          >Semua</button>
          {categories.map(cat => (
            <button
              key={cat._id || cat.id}
              onClick={() => setSelectedCategory(cat._id || cat.id)}
              className={cn(
                "px-6 h-11 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                selectedCategory === (cat._id || cat.id) ? "bg-orange-600 text-white shadow-lg shadow-orange-100" : "bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-600"
              )}
            >{cat.name}</button>
          ))}
        </div>

        {/* SEARCH AREA */}
        <div className="relative w-full md:w-96 order-1 md:order-2 group">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder="Cari SKU atau Nama Menu..."
            className="pl-12 bg-white border-gray-100 h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-gray-400 py-8 pl-10">Gambar</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Info Produk</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kategori</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Harga Jual</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">HPP</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Komposisi Resep</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400 pr-10">Kontrol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length > 0 ? (
              currentItems.map((product) => (
                <TableRow key={product._id || product.id} className="hover:bg-orange-50/20 transition-all border-b border-gray-50 group">
                  <TableCell className="py-6 pl-10">
                    <div className="size-16 rounded-2xl overflow-hidden shadow-sm ring-2 ring-white group-hover:scale-105 transition-transform duration-500">
                      <img
                        src={product.image_url || '/logo.jpeg'}
                        className="size-full object-cover"
                        onError={(e: any) => e.target.src = '/logo.jpeg'}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-orange-600 uppercase text-xs tracking-tight italic">{product.name}</div>
                    <div className="text-[10px] font-bold text-orange-600/50 mt-1 uppercase tracking-tighter italic">{product.sku || 'TANPA SKU'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className="text-[9px] font-black uppercase tracking-widest bg-orange-600 text-white border-none px-3 py-1 rounded-lg italic">
                      {product.category_id?.name || 'Umum'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-black text-orange-600 text-sm tracking-tighter italic">{formatRupiah(product.price)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const recipe = product.recipe || [];
                      const hppFromRecipe = recipe.reduce((sum: number, r: any) => {
                        const ing = r.ingredient_id?._id ? r.ingredient_id : ingredients.find((i: any) => (i._id || i.id) === r.ingredient_id);
                        const costPerUnit = Number(ing?.cost_per_unit) || 0;
                        const amountNeeded = Number(r.amount_needed) || 0;
                        return sum + (costPerUnit * amountNeeded);
                      }, 0);
                      
                      const hpp = hppFromRecipe > 0 ? hppFromRecipe : (Number(product.cost_price) || 0);
                      const margin = product.price - hpp;
                      const marginPercent = product.price > 0 ? Math.round((margin / product.price) * 100) : 0;
                      return (
                        <div>
                          <div className="font-black text-xs text-gray-600 tracking-tighter">{formatRupiah(hpp)}</div>
                          <div className={`text-[9px] font-black ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {hppFromRecipe > 0 ? 'Margin ' : 'Margin (M) '}{marginPercent}%
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-3 py-1 text-[10px] font-black shadow-sm italic rounded-full">
                      {product.recipe?.length || 0} Bahan Baku
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" onClick={() => handleEditProduct(product)} className="rounded-xl hover:bg-orange-100 text-orange-600 transition-all">
                        <Edit className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(product)} className="rounded-xl hover:bg-red-50 text-red-500 transition-all">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-32 text-gray-300 uppercase font-black text-[10px] italic">Menu tidak ditemukan</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* PAGINATION */}
        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
            Menampilkan {currentItems.length} Produk — Halaman {currentPage} dari {totalPages || 1}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 bg-white border border-gray-100">
              <ChevronLeft className="mr-2 size-4" /> Sebelumnya
            </Button>
            <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6 bg-white border border-gray-100">
              Selanjutnya <ChevronRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL IMPORT */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="rounded-[40px] border-none shadow-2xl p-12">
          <DialogHeader className="mb-6">
            <DialogTitle className="uppercase font-black text-center text-2xl italic tracking-tighter">Import <span className="text-orange-600">Database</span></DialogTitle>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center justify-center border-4 border-dashed rounded-[32px] border-gray-100 gap-6 bg-gray-50/50 hover:border-orange-200 transition-colors group cursor-pointer relative">
            <div className="p-6 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
              <ImageIcon className="size-10 text-orange-600" />
            </div>
            <div className="text-center px-8">
              <p className="text-sm font-black uppercase tracking-tighter text-orange-600 leading-none mb-2">Pilih File Master Produk</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Format: .xlsx atau .csv (Max 5MB)</p>
            </div>
            <Input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            {importFile && (
              <Badge className="bg-orange-600 text-white uppercase font-black py-2 px-4 rounded-xl">
                {importFile.name}
              </Badge>
            )}
          </div>
          <DialogFooter className="mt-10 flex gap-4">
            <Button variant="ghost" onClick={() => setShowImportDialog(false)} className="rounded-2xl font-black text-[10px] uppercase h-14 flex-1">Batal</Button>
            <Button
              onClick={handleImportExcel}
              disabled={!importFile || isImporting}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-xl shadow-orange-100 flex-1 h-14 uppercase tracking-widest text-[10px]"
            >
              {isImporting ? <Loader2 className="animate-spin mr-2 size-4" /> : <Save className="mr-2 size-4" />}
              MULAI IMPORT DATA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL FORM ADD/EDIT */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="sm:max-w-4xl w-[95vw] rounded-[40px] border-none shadow-2xl p-6 sm:p-10 bg-white overflow-hidden">
          <DialogHeader className="mb-8">
            <DialogTitle className="uppercase font-black tracking-tighter text-3xl italic underline decoration-orange-500 decoration-4">
              {editingProduct ? 'Update' : 'Registrasi'} <span className="text-orange-600">Menu</span>
            </DialogTitle>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2">Integrasi Database WuzPay Sindangsari</p>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] w-full overflow-x-hidden">
            <div className="flex flex-col gap-8 py-4 pr-2 sm:pr-4 w-full min-w-0">

              {/* BASIC INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nama Produk *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-black uppercase px-6 focus:ring-2 focus:ring-orange-500 transition-all" placeholder="CONTOH: ES KOPI SUSU..." />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">SKU / Kode Unik</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-black px-6 focus:ring-2 focus:ring-orange-600 transition-all italic text-orange-600" placeholder="WUZ-001..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Kategori Menu</Label>
                  <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
                    <SelectTrigger className="w-full h-14 min-h-[56px] rounded-2xl bg-gray-50/50 border-gray-100 px-6 text-xs font-black uppercase tracking-widest flex items-center">
                      <SelectValue placeholder="PILIH KATEGORI..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat._id || cat.id} value={cat._id || cat.id} className="font-black uppercase text-[10px] tracking-widest">{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-orange-600 ml-4">Harga Jual (Price)</Label>
                  <div className="relative w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-orange-300">Rp</span>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full h-14 min-h-[56px] rounded-2xl bg-orange-50/50 border-orange-100 pl-12 pr-6 text-orange-600 font-black focus:ring-2 focus:ring-orange-600 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-4">HPP Manual (Hanya jika tanpa resep)</Label>
                  <div className="relative w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-300">Rp</span>
                    <Input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                      className="w-full h-14 min-h-[56px] rounded-2xl bg-emerald-50/50 border-emerald-100 pl-12 pr-6 text-emerald-600 font-black focus:ring-2 focus:ring-emerald-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* RECIPE BUILDER SECTION */}
              <div className="w-full mt-5 p-6 sm:p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 relative min-w-0">
                <div className="absolute -top-4 left-8 bg-white px-4 py-1 rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                  <ChefHat className="size-4 text-orange-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Resep Bahan Baku</span>
                </div>

                <div className="space-y-4 mt-2 w-full">
                  {formData.recipe.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Belum ada bahan baku yang ditambahkan.</p>
                    </div>
                  ) : (
                    formData.recipe.map((r: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-center animate-in fade-in slide-in-from-top-2 duration-300 w-full overflow-hidden">
                        <div className="min-w-0 flex-1">
                          <Select value={r.ingredient_id} onValueChange={(val: string) => handleRecipeChange(idx, 'ingredient_id', val)}>
                            <SelectTrigger className="w-full rounded-2xl bg-white border-none shadow-sm h-12 font-black uppercase px-4 text-[10px] sm:text-xs tracking-widest text-orange-600 overflow-hidden">
                              <span className="block truncate w-full text-left">
                                {r.ingredient_id
                                  ? (() => {
                                    const found = ingredients.find((i: any) => (i._id || i.id) === r.ingredient_id);
                                    return found ? `${found.name} (${found.unit})` : 'BAHAN TIDAK DITEMUKAN';
                                  })()
                                  : 'PILIH BAHAN BAKU...'
                                }
                              </span>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              {ingredients.map((ing) => (
                                <SelectItem key={ing._id || ing.id} value={ing._id || ing.id} className="font-black uppercase text-[10px] tracking-widest">
                                  {ing.name} ({ing.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Input
                          type="number"
                          placeholder="Qty"
                          value={r.amount_needed || ''}
                          onChange={(e) => handleRecipeChange(idx, 'amount_needed', parseFloat(e.target.value))}
                          className="w-24 shrink-0 rounded-2xl bg-white border-none shadow-sm h-12 font-black text-center focus:ring-2 focus:ring-orange-500 transition-all text-xs px-2"
                        />

                        <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveRecipeItem(idx)} className="size-12 shrink-0 rounded-2xl hover:bg-red-100 text-red-500 bg-white shadow-sm transition-all">
                          <Trash2 className="size-5" />
                        </Button>
                      </div>
                    ))
                  )}

                  <Button type="button" variant="outline" onClick={handleAddRecipeItem} className="w-full mt-4 border-dashed border-2 border-gray-200 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/50 transition-all">
                    <Plus className="size-4 mr-2" /> Tambah Komposisi Resep
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Deskripsi / Info Menu</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-bold px-6 focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Penjelasan singkat menu..." />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Gambar URL</Label>
                  <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-bold px-6 focus:ring-2 focus:ring-orange-500 transition-all text-xs" placeholder="https://images.unsplash.com/..." />
                </div>
              </div>

            </div>
          </ScrollArea>

          <DialogFooter className="mt-8 flex gap-4">
            <Button variant="ghost" onClick={() => setShowProductDialog(false)} className="rounded-2xl font-black text-[10px] uppercase h-14 flex-1 tracking-widest text-gray-300">Batal</Button>
            <Button onClick={handleSaveProduct} className="bg-orange-600 hover:bg-orange-600 text-white rounded-2xl font-black shadow-2xl flex-[2] h-14 uppercase tracking-widest text-xs transition-all active:scale-95">
              KONFIRMASI & SIMPAN MENU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}