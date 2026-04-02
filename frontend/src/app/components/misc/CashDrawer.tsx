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
      toast.error('Gagal memuat rekap kas WuzPay');
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
    // Mapping ID MongoDB (_id)
    setEditingId(drawer._id || drawer.id);
    setFormData({
      openingBalance: (drawer.starting_cash || "0").toString(),
      actualCash: drawer.ending_cash !== null ? (drawer.ending_cash).toString() : '',
      notes: drawer.notes || '',
    });
    setShowDialog(true);
  };

  const confirmDelete = (drawer: any) => {
    setDrawerToDelete(drawer);
    setShowDeleteConfirm(true);
  };

  const handleSaveDrawer = async () => {
    try {
      const rawUserData = localStorage.getItem('user_data');
      if (!rawUserData) return toast.error('Sesi berakhir, silakan login ulang');
      
      const userData = JSON.parse(rawUserData);
      const payload = {
        starting_cash: Number(formData.openingBalance),
        ending_cash: formData.actualCash === '' ? null : Number(formData.actualCash),
        notes: formData.notes,
        staffname: userData.name || userData.email,
        status: formData.actualCash !== '' ? 'closed' : 'open'
      };

      if (editingId) {
        await cashDrawerAPI.update(editingId, payload);
        toast.success('Rekap kas diperbarui');
      } else {
        await cashDrawerAPI.create(payload);
        toast.success('Sesi kasir berhasil dibuka');
      }

      setShowDialog(false);
      loadDrawers();
    } catch (error) {
      toast.error('Gagal menyimpan laporan kas');
    }
  };

  const formatRupiah = (amount: any) => {
    const val = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const filteredDrawers = drawers.filter(d => {
    const search = searchQuery.toLowerCase();
    const staff = (d.staffname || "").toLowerCase();
    const date = d.start_time ? new Date(d.start_time).toLocaleDateString('id-ID') : "";
    return staff.includes(search) || date.includes(search);
  });

  const totalPages = Math.ceil(filteredDrawers.length / rowsPerPage);
  const currentRows = filteredDrawers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter italic text-orange-600">
            Cash <span className="text-orange-600">Drawer</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Laporan Arus Kas Harian WuzPay</p>
        </div>
        <Button onClick={handleOpenDrawer} className="bg-orange-600 hover:bg-orange-700 font-black rounded-2xl shadow-lg shadow-orange-100 uppercase tracking-widest text-[10px] h-12 px-8 transition-all active:scale-95 text-white">
          <Plus className="mr-2 size-5" /> BUKA SESI KAS
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
          <Input 
            placeholder="Cari nama staff atau tanggal..." 
            className="pl-12 h-12 rounded-2xl border-gray-100 bg-white shadow-sm font-bold focus-visible:ring-2 focus-visible:ring-orange-500" 
            value={searchQuery} 
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
           <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="size-4"/></Button>
           <span className="text-[10px] font-black text-gray-400 uppercase px-4">Halaman {currentPage} / {totalPages || 1}</span>
           <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="size-4"/></Button>
        </div>
      </div>

      <div className="rounded-[40px] border-none bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 border-none hover:bg-gray-50/50">
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 py-6 pl-10">Waktu Mulai</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Nama Staff</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Modal Awal</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Uang Fisik Akhir</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Status</TableHead>
              <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-gray-400 pr-10">Kontrol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-24 text-gray-300 text-[10px] font-black uppercase tracking-[0.4em] italic">
                  Belum ada riwayat aktivitas kasir...
                </TableCell>
              </TableRow>
            ) : (
              currentRows.map((drawer) => (
                <TableRow key={drawer._id || drawer.id} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors group">
                  <TableCell className="text-[11px] font-bold text-gray-500 py-6 pl-10">
                    {drawer.start_time ? new Date(drawer.start_time).toLocaleString('id-ID') : '-'}
                  </TableCell>
                  <TableCell className="text-[11px] font-black text-orange-600 uppercase tracking-tight italic">
                    {drawer.staffname || 'Sistem'}
                  </TableCell>
                  <TableCell className="text-[12px] font-black text-orange-600">{formatRupiah(drawer.starting_cash)}</TableCell>
                  <TableCell className={cn(
                    "text-[12px] font-black italic",
                    drawer.ending_cash !== null ? "text-emerald-600" : "text-orange-400"
                  )}>
                    {drawer.ending_cash !== null ? formatRupiah(drawer.ending_cash) : 'BELUM TUTUP KAS'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "text-[9px] font-black px-4 py-1.5 rounded-full border-none shadow-sm uppercase tracking-widest",
                      drawer.status === 'open' ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-600 text-white'
                    )}>
                      {drawer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                      {drawer.notes && (
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-orange-50 text-orange-600" onClick={() => { setActiveNote(drawer.notes); setShowNoteDialog(true); }}>
                          <Eye className="size-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-orange-50 text-orange-600" onClick={() => handleEdit(drawer)}>
                        <Edit2 className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 text-red-500" onClick={() => confirmDelete(drawer)}>
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

      {/* --- MODAL HAPUS --- */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center rounded-[40px] border-none shadow-2xl">
          <div className="size-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Trash2 className="size-10" />
          </div>
          <h2 className="font-black text-2xl uppercase tracking-tighter text-orange-600">Hapus Laporan?</h2>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed font-medium">
            Rekap kas tanggal <span className="text-orange-600 font-bold">"{drawerToDelete ? new Date(drawerToDelete.start_time).toLocaleDateString('id-ID') : ''}"</span> akan dihapus permanen dari sistem WuzPay.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Batal</Button>
            <Button className="h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
              onClick={async () => {
                try {
                  await cashDrawerAPI.delete(drawerToDelete._id || drawerToDelete.id);
                  toast.success("REKAP KAS DIHAPUS");
                  loadDrawers();
                  setShowDeleteConfirm(false);
                } catch (err) {
                  toast.error("GAGAL MENGHAPUS");
                }
              }}
            >
              YA, HAPUS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL LIHAT CATATAN --- */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-[32px] p-10 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 text-center">Internal Notes</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-xl font-black text-gray-800 italic tracking-tight leading-relaxed">"{activeNote}"</p>
          </div>
          <Button onClick={() => setShowNoteDialog(false)} className="w-full h-14 mt-6 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest text-[10px]">Tutup Catatan</Button>
        </DialogContent>
      </Dialog>

      {/* --- FORM INPUT DIALOG --- */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[460px] rounded-[40px] p-10 shadow-2xl border-none">
          <DialogHeader className="mb-8">
            <DialogTitle className="font-black italic uppercase text-3xl tracking-tighter text-center">
              Laporan <span className="text-orange-600">Sesi Kasir</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Modal Awal Toko</Label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300">Rp</span>
                <Input type="text" className="font-black text-2xl h-16 rounded-3xl bg-gray-50 border-none pl-14 pr-6 focus:ring-2 focus:ring-orange-500 transition-all shadow-sm" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: handleNumberInput(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 ml-4">Uang Fisik Akhir (Closing)</Label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-orange-300">Rp</span>
                <Input type="text" className="font-black text-2xl h-16 rounded-3xl bg-orange-50/50 border-none text-orange-600 pl-14 pr-6 focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-orange-200" value={formData.actualCash} onChange={(e) => setFormData({ ...formData, actualCash: handleNumberInput(e.target.value) })} placeholder="ISI UNTUK TUTUP KAS..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Catatan Performa / Kendala</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="text-sm font-bold rounded-3xl min-h-[120px] bg-gray-50 border-none p-6 resize-none focus:ring-2 focus:ring-orange-500" placeholder="Contoh: Selisih Rp 500 karena pembulatan..." />
            </div>
          </div>
          <DialogFooter className="mt-10">
            <Button onClick={handleSaveDrawer} className="bg-orange-600 hover:bg-orange-700 text-white w-full h-16 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-100 transition-all active:scale-95">
              KONFIRMASI & SIMPAN DATA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}