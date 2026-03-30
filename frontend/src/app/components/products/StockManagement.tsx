import { useState, useEffect } from 'react';
import { 
  Boxes, Search, Plus, Minus, Save, AlertCircle, RefreshCw, Loader2, History, User, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { productsAPI, categoriesAPI } from '@/services/api'; // Pastikan categoriesAPI ada
import { cn } from '@/app/components/ui/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function StockManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // STATE LOADING
  const [isLoading, setIsLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  
  // STATE PAGINATION
  const [inventoryPage, setInventoryPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const invItemsPerPage = 20;
  const logsItemsPerPage = 20;

  const [addAmounts, setAddAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, logsData, categoriesData] = await Promise.all([
        productsAPI.getAll(),
        productsAPI.getStockLogs(),
        categoriesAPI.getAll()
      ]);
      setProducts(productsData || []);
      setStockLogs(logsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
      toast.error("Gagal sinkronisasi data stok");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStock = async (id: string) => {
    const amount = addAmounts[id] || 0;
    if (amount === 0) return;

    setUpdateLoading(id);
    try {
      await productsAPI.addStock(id, amount);
      toast.success('Stok berhasil diperbarui');
      setAddAmounts(prev => ({ ...prev, [id]: 0 }));
      await fetchData(); 
    } catch (error) {
      toast.error('Gagal update stok');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setAddAmounts(prev => ({ ...prev, [id]: numValue }));
  };

  // --- LOGIKA FILTER INVENTARIS ---
  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.stock_quantity !== b.stock_quantity) return a.stock_quantity - b.stock_quantity;
      return a.name.localeCompare(b.name);
    });

  // PAGINATION INVENTARIS
  const invTotalPages = Math.ceil(filteredProducts.length / invItemsPerPage);
  const currentInventory = filteredProducts.slice((inventoryPage - 1) * invItemsPerPage, inventoryPage * invItemsPerPage);

  // PAGINATION LOGS
  const logsTotalPages = Math.ceil(stockLogs.length / logsItemsPerPage);
  const currentLogs = stockLogs.slice((logsPage - 1) * logsItemsPerPage, logsPage * logsItemsPerPage);

  // Reset page ke 1 jika filter berubah
  useEffect(() => { setInventoryPage(1); }, [selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest animate-pulse">Sinkronisasi Inventaris...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl uppercase tracking-tighter text-gray-800">Inventaris & Stok</h2>
          <p className="text-gray-500 text-sm">Monitoring persediaan bahan baku Seblak Mledak</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="rounded-xl font-bold text-xs shadow-sm border-orange-200 text-orange-600 hover:bg-orange-50">
          <RefreshCw className="mr-2 size-4" /> REFRESH DATA
        </Button>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <TabsList className="bg-gray-100 p-1 rounded-xl w-fit">
            <TabsTrigger value="inventory" className="text-xs font-bold uppercase px-6">Daftar Inventaris</TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-bold uppercase px-6">Log Perubahan</TabsTrigger>
          </TabsList>
          
          {/* FILTER KATEGORI (Pills Style) */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm" onClick={() => setSelectedCategory('all')}
              className={cn("rounded-full text-[10px] font-black uppercase px-4 h-8", selectedCategory === 'all' && "bg-orange-600")}
            >Semua</Button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 h-8 rounded-full text-[10px] font-black uppercase transition-all border",
                  selectedCategory === cat.id ? "bg-orange-600 text-white border-orange-600 shadow-md" : "bg-white text-gray-400 border-gray-200 hover:border-orange-300"
                )}
              >{cat.name}</button>
            ))}
          </div>
        </div>

        <TabsContent value="inventory" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white border border-gray-100">
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-white">
              <CardTitle className="text-sm font-black uppercase tracking-tight">Ketersediaan Barang</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Cari produk..." className="pl-9 h-9 bg-gray-50 border-none rounded-xl text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Nama Produk</th>
                      <th className="px-6 py-4">Kategori</th>
                      <th className="px-6 py-4">Stok Saat Ini</th>
                      <th className="px-6 py-4">Input Perubahan</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentInventory.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-black text-gray-800 uppercase text-xs">{product.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{product.sku || 'NO-SKU'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-tighter">
                            {product.categories?.name || 'UMUM'}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <div className={cn("font-black text-lg", product.stock_quantity <= 5 ? "text-red-600" : "text-gray-700")}>
                            {product.stock_quantity}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1 max-w-[140px]">
                            <Button variant="outline" size="icon" className="size-8 rounded-xl bg-gray-50 border-none hover:bg-red-50 hover:text-red-600" onClick={() => handleInputChange(product.id, ((addAmounts[product.id] || 0) - 1).toString())}><Minus className="size-3" /></Button>
                            <Input type="number" className="h-8 w-14 border-none bg-white text-center font-black text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={addAmounts[product.id] || 0} onChange={(e) => handleInputChange(product.id, e.target.value)} />
                            <Button variant="outline" size="icon" className="size-8 rounded-xl bg-gray-50 border-none hover:bg-green-50 hover:text-green-600" onClick={() => handleInputChange(product.id, ((addAmounts[product.id] || 0) + 1).toString())}><Plus className="size-3" /></Button>
                          </div>
                          <p className="text-[9px] font-bold text-orange-500 mt-1 pl-1">{(addAmounts[product.id] || 0) !== 0 ? `UPDATE KE: ${product.stock_quantity + (addAmounts[product.id] || 0)}` : ''}</p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-[10px] px-6 shadow-md" onClick={() => handleUpdateStock(product.id)} disabled={!addAmounts[product.id] || updateLoading === product.id}>
                            {updateLoading === product.id ? <Loader2 className="animate-spin size-3" /> : 'SIMPAN'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* PAGINATION INVENTORY */}
              <div className="p-4 bg-gray-50/50 border-t flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Halaman {inventoryPage} dari {invTotalPages || 1}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={inventoryPage === 1} onClick={() => setInventoryPage(p => p - 1)} className="h-8 rounded-lg text-[10px] font-black"><ChevronLeft className="size-3 mr-1" /> PREV</Button>
                  <Button variant="outline" size="sm" disabled={inventoryPage === invTotalPages} onClick={() => setInventoryPage(p => p + 1)} className="h-8 rounded-lg text-[10px] font-black">NEXT <ChevronRight className="size-3 ml-1" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white border border-gray-100">
            <CardHeader className="bg-white"><CardTitle className="text-sm font-black uppercase tracking-tight">Log Aktivitas Stok</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Waktu Kejadian</th>
                      <th className="px-6 py-4">Petugas</th>
                      <th className="px-6 py-4">Item Produk</th>
                      <th className="px-6 py-4">Status Perubahan</th>
                      <th className="px-6 py-4">Stok Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5 text-gray-400 font-medium text-[10px]">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}</td>
                        <td className="px-6 py-5"><div className="flex items-center gap-2"><div className="size-6 rounded-full bg-blue-100 flex items-center justify-center"><User className="size-3 text-blue-600" /></div><span className="font-bold text-[10px] text-gray-600 uppercase">Admin System</span></div></td>
                        <td className="px-6 py-5 font-black text-gray-700 uppercase text-xs">{log.products?.name}</td>
                        <td className="px-6 py-5">
                          <span className={cn("font-black text-xs px-2 py-1 rounded-lg bg-green-50", log.added_stock > 0 ? "text-green-600" : "text-red-600 bg-red-50")}>{log.added_stock > 0 ? `+${log.added_stock}` : log.added_stock}</span>
                          <span className="text-gray-400 text-[9px] ml-1 uppercase font-bold">(Asal: {log.previous_stock})</span>
                        </td>
                        <td className="px-6 py-5"><Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-none font-black text-xs">{log.current_stock}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* PAGINATION LOGS */}
              <div className="p-4 bg-gray-50/50 border-t flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Halaman {logsPage} dari {logsTotalPages || 1}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={logsPage === 1} onClick={() => setLogsPage(p => p - 1)} className="h-8 rounded-lg text-[10px] font-black"><ChevronLeft className="size-3 mr-1" /> PREV</Button>
                  <Button variant="outline" size="sm" disabled={logsPage === logsTotalPages} onClick={() => setLogsPage(p => p + 1)} className="h-8 rounded-lg text-[10px] font-black">NEXT <ChevronRight className="size-3 ml-1" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}