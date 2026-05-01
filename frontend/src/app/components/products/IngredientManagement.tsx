import { useState, useEffect } from 'react';
import {
    Search, Plus, Minus, Save, RefreshCw, Loader2, ChevronLeft, ChevronRight, ScanLine, Wheat, Trash2, Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { ingredientsAPI, apiRequest } from '@/services/api';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';
import { ScanReceiptModal } from './ScanReceiptModal';

export function IngredientManagement() {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState<string | null>(null);

    const [inventoryPage, setInventoryPage] = useState(1);
    const invItemsPerPage = 20;
    const [addAmounts, setAddAmounts] = useState<Record<string, number>>({});

    // State untuk mengontrol buka/tutup modal OCR
    const [showScanModal, setShowScanModal] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: '', unit: '', cost_per_unit: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await ingredientsAPI.getAll();
            setIngredients(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Gagal sinkronisasi data Bahan Baku WuzPay");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStock = async (item: any) => {
        const id = item._id || item.id;
        const amount = addAmounts[id] || 0;
        if (amount === 0) return;

        setUpdateLoading(id);
        try {
            await ingredientsAPI.addStock(id, amount);
            toast.success(`Stok ${item.name} berhasil diperbarui`);
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

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setEditForm({
            name: item.name || '',
            unit: item.unit || '',
            cost_per_unit: item.cost_per_unit || 0
        });
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        const id = editingItem?._id || editingItem?.id;
        try {
            if (id) {
                await ingredientsAPI.update(id, editForm);
                toast.success("Bahan baku berhasil diperbarui");
            } else {
                await ingredientsAPI.create(editForm);
                toast.success("Bahan baku baru ditambahkan");
            }
            setShowEditDialog(false);
            await fetchData();
        } catch (error: any) {
            toast.error(error.message || "Gagal menyimpan data");
        }
    };

    const handleDelete = async (item: any) => {
        const id = item._id || item.id;
        if (!confirm(`Yakin ingin menghapus bahan baku "${item.name}"? Data yang dihapus tidak bisa dikembalikan.`)) return;
        try {
            await ingredientsAPI.delete(id);
            toast.success(`Bahan baku "${item.name}" berhasil dihapus`);
            await fetchData();
        } catch (error) {
            toast.error('Gagal menghapus bahan baku');
        }
    };

    const filteredIngredients = ingredients
        .filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (a.stock_quantity !== b.stock_quantity) return a.stock_quantity - b.stock_quantity;
            return a.name.localeCompare(b.name);
        });

    const invTotalPages = Math.ceil(filteredIngredients.length / invItemsPerPage);
    const currentInventory = filteredIngredients.slice((inventoryPage - 1) * invItemsPerPage, inventoryPage * invItemsPerPage);

    if (isLoading) {
        return (
            <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="size-12 text-orange-600 animate-spin" />
                <p className="font-black text-gray-400 uppercase text-xs tracking-widest animate-pulse">Memuat Data Bahan Baku...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-8 animate-in fade-in duration-500 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-black text-3xl uppercase tracking-tighter italic text-orange-600">
                        Bahan <span className="text-orange-600">Baku</span>
                    </h2>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Manajemen Bahan Baku Gudang</p>
                </div>
                <div className="flex gap-3">
                    {/* Tombol OCR: Pastikan onClick mengarah ke setShowScanModal(true) */}
                    <Button
                        variant="outline"
                        onClick={() => {
                            setEditingItem(null);
                            setEditForm({ name: '', unit: '', cost_per_unit: 0 });
                            setShowEditDialog(true);
                        }}
                        className="rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-100 h-12 px-6 hover:bg-orange-50 hover:text-orange-600 transition-all"
                    >
                        <Plus className="mr-2 size-4" /> Tambah Bahan
                    </Button>
                    <Button
                        className="rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 px-6 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-xl shadow-orange-200 transition-all"
                        onClick={() => setShowScanModal(true)}
                    >
                        <ScanLine className="mr-2 size-4" /> Scan Struk (OCR)
                    </Button>
                    <Button variant="outline" onClick={fetchData} className="rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-200 h-12 px-6 hover:bg-orange-50 hover:text-orange-600 transition-all">
                        <RefreshCw className="mr-2 size-4" /> Sync
                    </Button>
                </div>
            </div>

            <Card className="rounded-[40px] border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden bg-white">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between border-b border-gray-50">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Daftar Bahan Baku</CardTitle>
                    <div className="relative w-80 group">
                        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                        <Input placeholder="Cari bahan baku..." className="pl-12 h-12 bg-gray-50 border-none rounded-2xl text-xs font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-10 py-6">Nama Bahan</th>
                                    <th className="px-6 py-6 text-center">Satuan</th>
                                    <th className="px-6 py-6 text-right">Harga Modal</th>
                                    <th className="px-6 py-6 text-center">Stok Fisik</th>
                                    <th className="px-6 py-6">Input Penyesuaian</th>
                                    <th className="px-6 py-6 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentInventory.map((item) => {
                                    const pId = item._id || item.id;
                                    return (
                                        <tr key={pId} className="hover:bg-orange-50/20 transition-all group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-2xl bg-orange-50 flex items-center justify-center"><Wheat className="size-4 text-orange-600" /></div>
                                                    <p className="font-black text-orange-600 uppercase text-xs italic tracking-tight">{item.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-gray-200 text-gray-400">
                                                    {item.unit}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-6 text-right cursor-pointer group/cost" onClick={() => handleEdit(item)}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="font-black text-xs text-gray-600 group-hover/cost:text-orange-600 transition-colors">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(item.cost_per_unit) || 0)}
                                                    </span>
                                                    <Edit className="size-2 text-gray-300 opacity-0 group-hover/cost:opacity-100 transition-all" />
                                                </div>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase ml-1">/{item.unit}</span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <div className={cn("text-xl font-black italic", (item.stock_quantity || 0) <= 5 ? "text-red-600 animate-pulse" : "text-orange-600")}>
                                                    {item.stock_quantity || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-[20px] w-fit border border-gray-100">
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-white text-gray-400" onClick={() => handleInputChange(pId, ((addAmounts[pId] || 0) - 1).toString())}><Minus className="size-4" /></Button>
                                                    <Input type="number" className="h-8 w-16 border-none bg-transparent text-center font-black text-sm p-0 focus-visible:ring-0" value={addAmounts[pId] || 0} onChange={(e) => handleInputChange(pId, e.target.value)} />
                                                    <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-white text-gray-400" onClick={() => handleInputChange(pId, ((addAmounts[pId] || 0) + 1).toString())}><Plus className="size-4" /></Button>
                                                </div>
                                                <p className="text-[9px] font-black text-orange-600 mt-2 ml-2 uppercase">
                                                    {(addAmounts[pId] || 0) !== 0 ? `Target: ${(item.stock_quantity || 0) + (addAmounts[pId] || 0)}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(item)}
                                                        className="size-10 rounded-2xl hover:bg-blue-50 text-blue-500 transition-all"
                                                    >
                                                        <Edit className="size-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleUpdateStock(item)}
                                                        disabled={!addAmounts[pId] || updateLoading === pId}
                                                        className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] tracking-widest px-6 h-10 transition-all shadow-lg active:scale-95"
                                                    >
                                                        {updateLoading === pId ? <Loader2 className="animate-spin size-4" /> : 'SAVE'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item)}
                                                        className="size-10 rounded-2xl hover:bg-red-100 text-red-400 hover:text-red-600 transition-all"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
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

            {/* Modal Edit Bahan Baku */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="rounded-[32px] border-none shadow-2xl p-8 max-w-md">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="font-black text-xl uppercase italic text-orange-600">Edit <span className="text-gray-800">Bahan Baku</span></DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nama Bahan</Label>
                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="rounded-xl bg-gray-50 border-none h-12 font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-gray-400 ml-2">Satuan (Unit)</Label>
                                <Input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="rounded-xl bg-gray-50 border-none h-12 font-bold" placeholder="gram, pcs, dll" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-orange-600 ml-2">HPP per Unit</Label>
                                <Input type="number" value={editForm.cost_per_unit} onChange={(e) => setEditForm({ ...editForm, cost_per_unit: parseFloat(e.target.value) || 0 })} className="rounded-xl bg-orange-50 border-none h-12 font-bold text-orange-600" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-8 gap-2">
                        <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="rounded-xl font-black text-[10px] uppercase h-12 flex-1">Batal</Button>
                        <Button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-[10px] uppercase h-12 flex-1 shadow-lg shadow-orange-100">Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal dipanggil di sini */}
            <ScanReceiptModal
                open={showScanModal}
                onOpenChange={setShowScanModal}
                onSaveSuccess={fetchData}
                ingredients={ingredients}
            />
        </div>
    );
}