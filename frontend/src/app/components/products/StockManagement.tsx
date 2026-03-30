import { useState, useEffect } from 'react';
import { 
  Boxes, Search, Plus, Minus, Save, AlertCircle, RefreshCw, Loader2, History, User, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { productsAPI, categoriesAPI } from '@/services/api';
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
      setProducts(Array.isArray(productsData) ? productsData : []);
      setStockLogs(Array.isArray(logsData) ? logsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      toast.error("Gagal sinkronisasi data stok WuzPay");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStock = async (product: any) => {
    const id = product._id || product.id;
    const amount = addAmounts[id] || 0;
    if (amount === 0) return;

    setUpdateLoading(id);
    try {
      await productsAPI.addStock(id, amount);
      toast.success(`Stok ${product.name} berhasil diperbarui`);
      setAddAmounts(prev => ({ ...prev, [id]: 0 }));
      await fetchData(); 
    } catch (error) {
      toast.error('Gagal update stok ke server');
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
      const catId = p.category_id?._id || p.category_id;
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || catId === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.stock_quantity !== b.stock_quantity) return a.stock_quantity - b.stock_quantity;
      return a.name.localeCompare(b.name);
    });

  // PAGINATION LOGIC
  const invTotalPages = Math.ceil(filteredProducts.length / invItemsPerPage);
  const currentInventory = filteredProducts.slice((inventoryPage - 1) * invItemsPerPage, inventoryPage * invItemsPerPage);

  const logsTotalPages = Math.ceil(stockLogs.length / logsItemsPerPage);
  const currentLogs = stockLogs.slice((logsPage - 1) * logsItemsPerPage, logsPage * logsItemsPerPage);

  useEffect(() => { setInventoryPage(1); }, [selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-12 text-orange-600 animate-spin" />
        <p className="font-black text-gray-400 uppercase text-xs tracking-widest animate-pulse">Checking Inventory WuzPay...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter italic text-gray-900">
            Stock <span className="text-orange-600">Inventory</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Manajemen Persediaan WuzPay Sindangsari</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-200 h-12 px-6 hover:bg-orange-50 hover:text-orange-600 transition-all">
          <RefreshCw className="mr-2 size-4" /> Sync Database
        </Button>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <TabsList className="bg-gray-100 p-1.5 rounded-2xl w-fit">
            <TabsTrigger value="inventory" className="text-[10px] font-black uppercase tracking-widest px-8 h-10 data-[state=active]:bg-white data-[state=active]:text-orange-600 rounded-xl shadow-sm transition-all">Daftar Stok</TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest px-8 h-10 data-[state=active]:bg-white data-[state=active]:text-orange-600 rounded-xl shadow-sm transition-all">History Log</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm" onClick={() => setSelectedCategory('all')}
              className={cn("rounded-full text-[10px] font-black uppercase px-6 h-10", selectedCategory === 'all' ? "bg-orange-600 shadow-lg shadow-orange-100" : "bg-white text-gray-400 border-gray-100")}
            >Semua</Button>
            {categories.map(cat => (
              <button 
                key={cat._id || cat.id}
                onClick={() => setSelectedCategory(cat._id || cat.id)}
                className={cn(
                  "px-6 h-10 rounded-full text-[10px] font-black uppercase transition-all border",
                  selectedCategory === (cat._id || cat.id) ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100" : "bg-white text-gray-400 border-gray-100 hover:border-orange-200"
                )}
              >{cat.name}</button>
            ))}
          </div>
        </div>

        <TabsContent value="inventory" className="mt-0">
          <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between border-b border-gray-50">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Status Ketersediaan</CardTitle>
              <div className="relative w-80 group">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                <Input placeholder="Cari item produk..." className="pl-12 h-12 bg-gray-50 border-none rounded-2xl text-xs font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-10 py-6">Nama Produk</th>
                      <th className="px-6 py-6">Kategori</th>
                      <th className="px-6 py-6 text-center">Stok Fisik</th>
                      <th className="px-6 py-6">Input Penyesuaian</th>
                      <th className="px-10 py-6 text-right">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentInventory.map((product) => {
                      const pId = product._id || product.id;
                      return (
                        <tr key={pId} className="hover:bg-orange-50/20 transition-all group">
                          <td className="px-10 py-6">
                            <p className="font-black text-gray-900 uppercase text-xs italic tracking-tight">{product.name}</p>
                            <p className="text-[9px] text-gray-300 font-mono mt-1">{product.sku || 'WUZ-ITEM'}</p>
                          </td>
                          <td className="px-6 py-6">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-gray-200 text-gray-400">
                              {product.category_id?.name || 'UMUM'}
                            </Badge>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className={cn("text-xl font-black italic", (product.stock_quantity || 0) <= 5 ? "text-red-600 animate-pulse" : "text-gray-900")}>
                              {product.stock_quantity || 0}
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-[20px] w-fit border border-gray-100">
                              <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-white text-gray-400" onClick={() => handleInputChange(pId, ((addAmounts[pId] || 0) - 1).toString())}><Minus className="size-4" /></Button>
                              <Input type="number" className="h-8 w-16 border-none bg-transparent text-center font-black text-sm p-0 focus-visible:ring-0" value={addAmounts[pId] || 0} onChange={(e) => handleInputChange(pId, e.target.value)} />
                              <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-white text-gray-400" onClick={() => handleInputChange(pId, ((addAmounts[pId] || 0) + 1).toString())}><Plus className="size-4" /></Button>
                            </div>
                            <p className="text-[9px] font-black text-orange-600 mt-2 ml-2 uppercase">
                              {(addAmounts[pId] || 0) !== 0 ? `Target: ${(product.stock_quantity || 0) + (addAmounts[pId] || 0)}` : ''}
                            </p>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <Button 
                              onClick={() => handleUpdateStock(product)} 
                              disabled={!addAmounts[pId] || updateLoading === pId}
                              className="bg-gray-900 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] tracking-widest px-8 h-11 transition-all shadow-xl active:scale-95"
                            >
                              {updateLoading === pId ? <Loader2 className="animate-spin size-4" /> : 'SAVE'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Halaman {inventoryPage} / {invTotalPages || 1}</span>
                <div className="flex gap-3">
                  <Button variant="ghost" size="sm" disabled={inventoryPage === 1} onClick={() => setInventoryPage(p => p - 1)} className="h-10 px-6 rounded-xl text-[10px] font-black bg-white border border-gray-100 shadow-sm transition-all"><ChevronLeft className="size-4 mr-2" /> PREV</Button>
                  <Button variant="ghost" size="sm" disabled={inventoryPage === invTotalPages} onClick={() => setInventoryPage(p => p + 1)} className="h-10 px-6 rounded-xl text-[10px] font-black bg-white border border-gray-100 shadow-sm transition-all">NEXT <ChevronRight className="size-4 ml-2" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
            <CardHeader className="p-8 pb-4 border-b border-gray-50"><CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Jejak Digital Perubahan Stok</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-10 py-6">Waktu Kejadian</th>
                      <th className="px-6 py-6">Petugas</th>
                      <th className="px-6 py-6">Item Produk</th>
                      <th className="px-6 py-6">Aksi Stok</th>
                      <th className="px-10 py-6 text-right">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentLogs.map((log) => {
                      const isAddition = (log.added_stock ?? 0) > 0;
                      return (
                        <tr key={log._id || log.id} className="hover:bg-orange-50/10 transition-all group">
                          <td className="px-10 py-6 text-gray-400 font-black text-[10px] tracking-tighter italic">
                            {log.created_at ? format(new Date(log.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-2xl bg-orange-50 flex items-center justify-center"><User className="size-4 text-orange-600" /></div>
                              <span className="font-black text-[10px] text-gray-600 uppercase tracking-tight">WuzPay System</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 font-black text-gray-900 uppercase text-xs italic">{log.product_id?.name || 'Menu Terhapus'}</td>
                          <td className="px-6 py-6">
                            <div className="flex items-center">
                               <Badge className={cn("font-black text-[10px] border-none px-3 py-1 rounded-lg shadow-sm", isAddition ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                                {isAddition ? `+${log.added_stock}` : log.added_stock}
                              </Badge>
                              <span className="text-gray-300 text-[9px] ml-2 uppercase font-bold italic">(Awal: {log.previous_stock})</span>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right"><Badge className="bg-gray-900 text-white border-none font-black text-[11px] px-4 py-1.5 rounded-xl">{log.current_stock}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Halaman {logsPage} / {logsTotalPages || 1}</span>
                <div className="flex gap-3">
                  <Button variant="ghost" size="sm" disabled={logsPage === 1} onClick={() => setLogsPage(p => p - 1)} className="h-10 px-6 rounded-xl text-[10px] font-black bg-white border border-gray-100 shadow-sm transition-all"><ChevronLeft className="size-4 mr-2" /> PREV</Button>
                  <Button variant="ghost" size="sm" disabled={logsPage === logsTotalPages} onClick={() => setLogsPage(p => p + 1)} className="h-10 px-6 rounded-xl text-[10px] font-black bg-white border border-gray-100 shadow-sm transition-all">NEXT <ChevronRight className="size-4 ml-2" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}