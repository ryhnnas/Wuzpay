import { useState, useEffect } from 'react';
import { Plus, Search, Wallet, Trash2, Edit2, Eye, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
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
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { CashDrawer as CashDrawerType } from '@/types';
import { cashDrawerAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

export function CashDrawer() {
  const [drawers, setDrawers] = useState<CashDrawerType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [activeNote, setActiveNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- STATE MODAL HAPUS ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [drawerToDelete, setDrawerToDelete] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  const [formData, setFormData] = useState({
    openingBalance: '0',
    actualCash: '',
    notes: '',
  });

  useEffect(() => {
    loadDrawers();
  }, []);

  const loadDrawers = async () => {
    try {
      const data = await cashDrawerAPI.getAll();
      setDrawers(data || []);
    } catch (error) {
      toast.error('Gagal memuat data kas');
    }
  };

  const handleNumberInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, ''); 
    if (cleanValue === '') return '0';
    return cleanValue.replace(/^0+/, '') || '0'; 
  };

  const handleOpenDrawer = () => {
    setEditingId(null);
    setFormData({ openingBalance: '100000', actualCash: '', notes: '' });
    setShowDialog(true);
  };

  const handleEdit = (drawer: any) => {
    setEditingId(drawer.id);
    setFormData({
      openingBalance: (drawer.starting_cash || "0").toString(),
      actualCash: (drawer.ending_cash || "").toString(),
      notes: drawer.notes || '',
    });
    setShowDialog(true);
  };

  // Fungsi untuk buka modal konfirmasi
  const confirmDelete = (drawer: any) => {
    setDrawerToDelete(drawer);
    setShowDeleteConfirm(true);
  };

  const handleSaveDrawer = async () => {
    try {
      const rawUserData = localStorage.getItem('user_data');
      if (!rawUserData) return toast.error('Silakan login ulang');
      
      const userData = JSON.parse(rawUserData);
      const payload = {
        starting_cash: formData.openingBalance,
        ending_cash: formData.actualCash === '' ? null : formData.actualCash,
        notes: formData.notes,
        staffname: userData.email,
        status: formData.actualCash !== '' ? 'closed' : 'open'
      };

      if (editingId) {
        await cashDrawerAPI.update(editingId, payload);
        toast.success('Laporan diperbarui');
      } else {
        await cashDrawerAPI.create(payload);
        toast.success('Kas berhasil dibuka');
      }

      setShowDialog(false);
      loadDrawers();
    } catch (error) {
      toast.error('Gagal memproses data');
    }
  };

  const formatRupiah = (amount: any) => {
    const val = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const filteredDrawers = drawers.filter(d => {
    const search = searchQuery.toLowerCase();
    const email = (d.staffname || "").toLowerCase();
    const date = d.start_time ? new Date(d.start_time).toLocaleDateString('id-ID') : "";
    return email.includes(search) || date.includes(search);
  });

  const totalPages = Math.ceil(filteredDrawers.length / rowsPerPage);
  const currentRows = filteredDrawers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-2xl uppercase tracking-tighter italic text-gray-900">Cash Drawer</h2>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest italic opacity-50">Manajemen kas harian staff</p>
        </div>
        <Button onClick={handleOpenDrawer} className="bg-orange-600 hover:bg-orange-700 font-black rounded-2xl shadow-lg shadow-orange-100 uppercase tracking-tighter h-12 px-6 transition-all active:scale-95">
          <Plus className="mr-2 size-5" /> BUKA KAS
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari email atau tanggal..." className="pl-10 h-11 rounded-2xl border-gray-100 bg-white shadow-sm" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border shadow-sm">
           <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="size-4"/></Button>
           <span className="text-[10px] font-black text-gray-400 uppercase px-2">Hal {currentPage} / {totalPages || 1}</span>
           <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="size-4"/></Button>
        </div>
      </div>

      <div className="rounded-[32px] border-none bg-white shadow-2xl shadow-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 border-none hover:bg-gray-50/50">
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 py-6">Waktu</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Email Staff</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Opening</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Closing</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Status</TableHead>
              <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-gray-400 pr-8">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] italic">
                  Belum ada riwayat cash drawer...
                </TableCell>
              </TableRow>
            ) : (
              currentRows.map((drawer) => (
                <TableRow key={drawer.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                  <TableCell className="text-[10px] font-bold text-gray-500 py-5 pl-8">
                    {drawer.start_time ? new Date(drawer.start_time).toLocaleString('id-ID') : '-'}
                  </TableCell>
                  <TableCell className="text-[11px] font-black text-blue-600 lowercase tracking-tight">{drawer.staffname || 'admin'}</TableCell>
                  <TableCell className="text-[11px] font-black text-gray-900">{formatRupiah(drawer.starting_cash)}</TableCell>
                  <TableCell className="text-[11px] font-black text-orange-600 italic">
                    {drawer.ending_cash !== null ? formatRupiah(drawer.ending_cash) : 'MASIH OPEN'}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-[9px] font-black px-3 py-1 rounded-full border-none shadow-sm uppercase tracking-tighter",
                      drawer.status === 'open' ? 'bg-blue-500 text-white' : 'bg-green-600 text-white'
                    )}>
                      {drawer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      {drawer.notes && (
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-blue-50 hover:text-blue-600" onClick={() => { setActiveNote(drawer.notes); setShowNoteDialog(true); }}>
                          <Eye className="size-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-orange-50 hover:text-orange-600 text-orange-500" onClick={() => handleEdit(drawer)}>
                        <Edit2 className="size-4" />
                      </Button>
                      {/* Cukup panggil confirmDelete di sini */}
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 hover:text-red-600 text-red-500" onClick={() => confirmDelete(drawer)}>
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

      {/* ========================================================== */}
      {/* DIALOG AREA (DITARUH DI LUAR TABLE AGAR RINGAN) */}
      {/* ========================================================== */}

      {/* MODAL HAPUS (GAYA KAMU) */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center rounded-[32px] border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <div className="size-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trash2 className="size-10" />
          </div>
          <h2 className="font-black text-xl uppercase tracking-tighter text-gray-800">Hapus Rekap Kas?</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Data rekap pada tanggal <span className="font-bold text-gray-800">"{drawerToDelete ? new Date(drawerToDelete.start_time).toLocaleDateString('id-ID') : ''}"</span> akan dihapus permanen.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px]">BATAL</Button>
            <Button className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
              onClick={async () => {
                try {
                  await cashDrawerAPI.delete(drawerToDelete.id);
                  toast.success("REKAP BERHASIL DIHAPUS");
                  loadDrawers();
                  setShowDeleteConfirm(false);
                } catch (err) {
                  toast.error("GAGAL MENGHAPUS DATA");
                }
              }}
            >
              YA, HAPUS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL LIHAT CATATAN */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[400px] border-l-8 border-l-blue-500 rounded-[32px] p-8">
          <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Catatan Laporan</DialogTitle></DialogHeader>
          <div className="py-6 text-center"><p className="text-lg font-black text-gray-700 italic tracking-tight">"{activeNote}"</p></div>
          <Button onClick={() => setShowNoteDialog(false)} className="w-full h-12 rounded-2xl bg-gray-900 font-black uppercase tracking-widest text-[10px]">Tutup</Button>
        </DialogContent>
      </Dialog>

      {/* FORM INPUT DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="border-t-8 border-orange-600 rounded-[32px] p-8 shadow-2xl">
          <DialogHeader><DialogTitle className="font-black italic uppercase underline text-xl tracking-tighter">Data Kasir</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">MODAL AWAL</Label>
              <Input type="text" className="font-black text-xl h-14 rounded-2xl bg-gray-50 border-none px-6" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: handleNumberInput(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">UANG FISIK AKHIR (TUTUP KAS)</Label>
              <Input type="text" className="font-black text-xl h-14 rounded-2xl bg-orange-50 border-none text-orange-600 px-6" value={formData.actualCash} onChange={(e) => setFormData({ ...formData, actualCash: handleNumberInput(e.target.value) })} placeholder="ISI JIKA TUTUP KAS..." />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">CATATAN TAMBAHAN</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="text-xs font-bold rounded-2xl min-h-[100px] bg-gray-50 border-none p-4" placeholder="Ketik catatan di sini..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveDrawer} className="bg-orange-600 hover:bg-orange-700 w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-100 transition-all active:scale-95">SIMPAN LAPORAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}