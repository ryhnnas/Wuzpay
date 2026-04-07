import { useState, useEffect } from 'react';
import {
  Search, Package, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Loader2, ChefHat, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { productsAPI, categoriesAPI, ingredientsAPI } from '@/services/api'; // TAMBAHKAN ingredientsAPI
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';

export function StockManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Kita panggil data Produk, Kategori, dan Bahan Baku
      const [productsData, categoriesData, ingredientsData] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        ingredientsAPI.getAll()
      ]);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : []);
    } catch (error) {
      // Jika error, cek apakah API ingredients/getAll sudah kamu buat di backend
      toast.error("Gagal sinkronisasi ketersediaan menu WuzPay");
    } finally {
      setIsLoading(false);
    }
  };

  // LOGIKA UTAMA: Menghitung porsi maksimal yang bisa dibuat
  const calculateAvailability = (product: any) => {
    if (!product.recipe || product.recipe.length === 0) return { count: 0, limiting: "Resep Belum Diatur" };

    let minPortions = Infinity;
    let limitingFactor = null;

    product.recipe.forEach((item: any) => {
      const amountNeeded = item.amount_needed || 1;

      // Cek apakah ingredient_id sudah ter-populate (jadi objek dgn name & stock_quantity)
      let ingName = null;
      let ingStock = 0;

      if (item.ingredient_id && typeof item.ingredient_id === 'object' && item.ingredient_id.name) {
        // Data ter-populate langsung dari backend
        ingName = item.ingredient_id.name;
        ingStock = item.ingredient_id.stock_quantity || 0;
      } else {
        // Fallback: cari manual di array ingredients
        const ingId = item.ingredient_id?._id || item.ingredient_id;
        const found = ingredients.find(i => (i._id || i.id) === ingId);
        if (found) {
          ingName = found.name;
          ingStock = found.stock_quantity || 0;
        }
      }

      if (ingName !== null) {
        const possible = Math.floor(ingStock / amountNeeded);
        if (possible < minPortions) {
          minPortions = possible;
          limitingFactor = ingName;
        }
      } else {
        minPortions = 0;
        limitingFactor = "Bahan Baku Hilang";
      }
    });

    return {
      count: minPortions === Infinity ? 0 : minPortions,
      limiting: limitingFactor
    };
  };

  const filteredProducts = products.filter(p => {
    const catId = p.category_id?._id || p.category_id;
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || catId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-12 text-orange-600 animate-spin" />
        <p className="font-black text-gray-400 uppercase text-xs tracking-widest animate-pulse">Menghitung Ketersediaan Menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 animate-in fade-in duration-500 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter italic text-orange-600">
            Ketersediaan <span className="text-orange-600">Menu</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Status Porsi Berdasarkan Bahan Baku</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData} className="rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-200 h-12 px-6 hover:bg-orange-50 hover:text-orange-600 transition-all">
            <RefreshCw className="mr-2 size-4" /> Sync Data
          </Button>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col md:flex-row gap-6 justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-6 h-10 rounded-full text-[10px] font-black uppercase transition-all border",
              selectedCategory === 'all' ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100" : "bg-white text-gray-400 border-gray-100"
            )}
          >Semua</button>
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
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
          <Input placeholder="Cari menu..." className="pl-12 h-12 bg-white border-none rounded-2xl text-xs font-bold shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* GRID DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const { count, limiting } = calculateAvailability(product);

          return (
            <Card key={product._id || product.id} className="rounded-[32px] border-none shadow-sm hover:shadow-xl transition-all overflow-hidden group bg-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Foto Menu */}
                  <div className="w-1/3 shrink-0">
                    <div className="relative w-full aspect-[4/5] md:aspect-square overflow-hidden rounded-[20px] border border-gray-100 shadow-sm group-hover:border-orange-200 group-hover:shadow-md transition-all">
                      <img
                        src={product.image_url || '/logo.jpeg'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e: any) => e.target.src = '/logo.jpeg'}
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                    </div>
                  </div>

                  {/* Info Availability */}
                  <div className="w-2/3 flex flex-col justify-center gap-2.5 py-1 pr-2">
                    <div>
                      <h3 className="font-black text-sm uppercase italic text-gray-800 line-clamp-2 leading-tight">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {count === 0 ? (
                          <Badge className="bg-red-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md italic">
                            <XCircle className="size-2.5 mr-1" /> Sold Out
                          </Badge>
                        ) : count <= 5 ? (
                          <Badge className="bg-amber-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md italic animate-pulse">
                            <AlertTriangle className="size-2.5 mr-1" /> Limited
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md italic">
                            <CheckCircle2 className="size-2.5 mr-1" /> Ready
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-end gap-1">
                        <span className={cn(
                          "text-3xl font-black italic leading-none",
                          count === 0 ? "text-gray-200" : "text-orange-600"
                        )}>{count}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Porsi</span>
                      </div>

                      {limiting && count < 20 && (
                        <div className="flex items-center gap-1 text-red-400">
                          <Info className="size-2.5" />
                          <p className="text-[7px] font-black uppercase tracking-tighter italic">Pembatas: {limiting}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-24">
          <p className="text-gray-300 font-black uppercase text-xs italic tracking-widest">Menu tidak ditemukan!</p>
        </div>
      )}
    </div>
  );
}