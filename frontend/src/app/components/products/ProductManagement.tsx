import { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, Upload, Download, Package, 
  AlertCircle, Loader2, Save, ChevronLeft, ChevronRight 
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
import { productsAPI, categoriesAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from "@/app/components/ui/utils";

export function ProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // STATE PAGINATION
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
    price: 0, cost: 0, stock_quantity: 0, image_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      toast.error("Gagal mengambil data dari database");
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIKA FILTER & SORTING ---
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // --- LOGIKA PAGINATION ---
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', description: '', category_id: '', price: 0, cost: 0, stock_quantity: 0, image_url: '' });
    setShowProductDialog(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      sku: product.sku || '',
      price: product.price || 0,
      cost: product.cost || 0,
      stock_quantity: product.stock_quantity || 0,
      category_id: product.category_id || '',
      image_url: product.image_url || '',
    });
    setShowProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Nama dan Harga Jual wajib diisi');
      return;
    }
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
        toast.success('Produk berhasil diupdate');
      } else {
        await productsAPI.create(formData);
        toast.success('Produk berhasil ditambahkan');
      }
      setShowProductDialog(false);
      loadData();
    } catch (error) {
      toast.error('Gagal menyimpan ke database');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleImportExcel = async () => {
    if (!importFile) return toast.error("Pilih file excel terlebih dahulu");
    setIsImporting(true);
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const response = await productsAPI.import(fd); 
      toast.success(`Import Berhasil!`);
      setShowImportDialog(false);
      setImportFile(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengimport data");
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest animate-pulse">Sinkronisasi Produk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tighter uppercase leading-none text-gray-800">Manajemen Produk</h2>
          <p className="text-gray-500 text-xs italic mt-1">Kelola daftar menu dan inventaris Seblak Mledak</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => productsAPI.export()} className="rounded-xl font-bold text-[10px] uppercase shadow-sm">
            <Download className="mr-2 size-3 text-orange-600" /> Export
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="rounded-xl font-bold text-[10px] uppercase shadow-sm">
            <Upload className="mr-2 size-3 text-orange-600" /> Import
          </Button>
          <Button onClick={handleAddProduct} className="bg-orange-600 hover:bg-orange-700 rounded-xl font-black text-[10px] uppercase shadow-md px-6">
            <Plus className="mr-2 size-4" /> Tambah Produk
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* FILTER KATEGORI (Pills) */}
        <div className="flex flex-wrap gap-2 order-2 md:order-1">
          <Button 
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm" onClick={() => setSelectedCategory('all')}
            className={cn("rounded-full text-[10px] font-black uppercase px-5 h-9", selectedCategory === 'all' && "bg-orange-600")}
          >Semua</Button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-5 h-9 rounded-full text-[10px] font-black uppercase transition-all border",
                selectedCategory === cat.id ? "bg-orange-600 text-white border-orange-600 shadow-md scale-105" : "bg-white text-gray-400 border-gray-200 hover:border-orange-300"
              )}
            >{cat.name}</button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-80 order-1 md:order-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari SKU atau Nama Menu..."
            className="pl-10 bg-white border-none shadow-sm h-11 rounded-xl focus-visible:ring-orange-500 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px] text-[10px] font-black uppercase tracking-widest text-gray-400">Gambar</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nama & SKU</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kategori</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Harga (Modal/Jual)</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stok</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length > 0 ? (
              currentItems.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50/30 transition-colors border-gray-50">
                  <TableCell>
                    <img src={product.image_url || 'https://via.placeholder.com/150'} className="size-12 rounded-xl object-cover ring-1 ring-gray-100 shadow-sm" />
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-gray-800 uppercase text-xs tracking-tighter">{product.name}</div>
                    <div className="text-[9px] font-mono text-gray-400 uppercase">{product.sku || 'NO-SKU'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter bg-gray-100 text-gray-600">
                      {categories.find(c => c.id === product.category_id)?.name || 'Umum'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-[9px] text-gray-400 line-through italic leading-none mb-0.5">{formatRupiah(product.cost)}</div>
                    <div className="font-black text-orange-600 text-sm tracking-tighter">{formatRupiah(product.price)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] font-black border-none px-3 py-0.5", product.stock_quantity <= 5 ? "bg-red-500 text-white" : "bg-green-500 text-white")}>
                      {product.stock_quantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEditProduct(product)} className="size-9 rounded-xl hover:bg-orange-50 text-gray-600 hover:text-orange-600 transition-colors">
                        <Edit className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-9 text-red-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-[10px]">
                  Menu tidak ditemukan...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* PAGINATION CONTROLLER */}
        <div className="p-4 bg-gray-50/30 border-t flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Halaman {currentPage} dari {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-8 rounded-lg text-[10px] font-black shadow-sm uppercase">
              <ChevronLeft className="mr-1 size-3" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="h-8 rounded-lg text-[10px] font-black shadow-sm uppercase">
              Next <ChevronRight className="ml-1 size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL IMPORT EXCEL */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase font-black text-center tracking-tighter">Import Produk Excel</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl border-gray-100 gap-4 bg-gray-50/50">
            <Package className="size-12 text-gray-200" />
            <div className="text-center px-4">
              <p className="text-xs font-bold uppercase text-gray-500">Pilih file .xlsx atau .csv</p>
            </div>
            <Input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="max-w-[220px] cursor-pointer text-[10px]"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} className="rounded-xl font-bold">Batal</Button>
            <Button 
              onClick={handleImportExcel} 
              disabled={!importFile || isImporting}
              className="bg-green-600 hover:bg-green-700 rounded-xl font-black shadow-lg"
            >
              {isImporting ? <Loader2 className="animate-spin mr-2 size-4" /> : <Save className="mr-2 size-4" />}
              PROSES SEKARANG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ADD/EDIT PRODUK */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-xl rounded-[32px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase font-black tracking-tighter text-xl">
              {editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Nama Menu</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="rounded-xl bg-gray-50 border-none h-11" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">SKU / Kode</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="rounded-xl bg-gray-50 border-none h-11" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Pilih Kategori</Label>
                <Select value={formData.category_id} onValueChange={(val) => setFormData({...formData, category_id: val})}>
                  <SelectTrigger className="rounded-xl bg-gray-50 border-none h-11">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Modal (Cost)</Label>
                  <Input type="number" value={formData.cost} onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value)})} className="rounded-xl bg-gray-50 border-none h-11" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Harga Jual (Price)</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} className="rounded-xl bg-gray-50 border-none h-11 text-orange-600 font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Jumlah Stok</Label>
                <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value)})} className="rounded-xl bg-gray-50 border-none h-11" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-gray-400">URL Gambar Produk</Label>
                <Input value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} className="rounded-xl bg-gray-50 border-none h-11" placeholder="https://..." />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)} className="rounded-xl font-bold">Batal</Button>
            <Button onClick={handleSaveProduct} className="bg-orange-600 hover:bg-orange-700 rounded-2xl font-black shadow-lg px-8">SIMPAN MENU</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}