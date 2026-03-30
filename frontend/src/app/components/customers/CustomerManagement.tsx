import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Upload, Download, Users, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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
import { Customer, Supplier } from '@/types';
import { customersAPI, suppliersAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';

export function CustomerManagement() {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Kita biarkan state ini umum, nanti kita petakan (map) pas simpan
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customersData, suppliersData] = await Promise.all([
        customersAPI.getAll(),
        suppliersAPI.getAll(),
      ]);
      setCustomers(customersData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      toast.error('Gagal memuat data kontak');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const toastId = toast.loading(`Mengimport data ${activeTab === 'customers' ? 'Pelanggan' : 'Supplier'}...`);
      const fd = new FormData();
      fd.append('file', file);

      try {
        if (activeTab === 'customers') {
          await customersAPI.importExcel(fd);
        } else {
          await suppliersAPI.importExcel(fd);
        }
        toast.success('Data berhasil diimport', { id: toastId });
        loadData();
      } catch (error) {
        toast.error('Gagal import data', { id: toastId });
      }
    };
    input.click();
  };

  const handleExport = async () => {
    const toastId = toast.loading(`Menyiapkan export ${activeTab}...`);
    try {
      if (activeTab === 'customers') {
        await customersAPI.exportExcel();
      } else {
        await suppliersAPI.exportExcel();
      }
      toast.success('Export berhasil dimulai', { id: toastId });
    } catch (error) {
      toast.error('Gagal export data', { id: toastId });
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
    setShowDialog(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    
    // Sinkronisasi data lama ke Form
    setFormData({
      name: item.name,
      email: item.email || '',
      phone: item.phone || item.contact_info || '',
      address: item.address || item.office_address || '', 
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nama wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      if (activeTab === 'customers') {
        const customerPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address, // Ke kolom 'address' di DB
        };

        if (editingItem) {
          await customersAPI.update(editingItem.id, customerPayload);
          toast.success('Customer berhasil diupdate');
        } else {
          await customersAPI.create(customerPayload);
          toast.success('Customer berhasil ditambahkan');
        }
      } else {
        // --- PERBAIKAN UNTUK SUPPLIER ---
        const supplierPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          office_address: formData.address, // Kita kirim ke kolom 'office_address'
          contact_info: formData.phone // Tetap isi contact_info buat backup
        };
        
        if (editingItem) {
          await suppliersAPI.update(editingItem.id, supplierPayload);
          toast.success('Supplier berhasil diupdate');
        } else {
          await suppliersAPI.create(supplierPayload);
          toast.success('Supplier berhasil ditambahkan');
        }
      }
      setShowDialog(false);
      loadData();
    } catch (error) {
      toast.error('Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      try {
        if (activeTab === 'customers') {
          await customersAPI.delete(id);
        } else {
          await suppliersAPI.delete(id);
        }
        toast.success('Data berhasil dihapus');
        loadData();
      } catch (error) {
        toast.error('Gagal menghapus data');
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s as any).phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s as any).contact_info?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest animate-pulse">
          Sinkronisasi Kontak...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl uppercase tracking-tighter text-gray-800 italic underline decoration-orange-500 underline-offset-4">Manajemen Kontak</h2>
          <p className="text-gray-500 text-sm italic">Database mitra bisnis Seblak Mledak</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="rounded-xl font-bold text-xs border-gray-200">
            <Upload className="mr-2 size-4" /> IMPORT
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl font-bold text-xs border-gray-200">
            <Download className="mr-2 size-4" /> EXPORT
          </Button>
          <Button size="sm" onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-xs shadow-md text-white">
            <Plus className="mr-2 size-4" /> TAMBAH {activeTab === 'customers' ? 'CUSTOMER' : 'SUPPLIER'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(''); }}>
        <TabsList className="bg-gray-100 p-1 rounded-xl w-fit">
          <TabsTrigger value="customers" className="text-xs font-bold uppercase px-6 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg">Pelanggan</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs font-bold uppercase px-6 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg">Supplier</TabsTrigger>
        </TabsList>

        <div className="relative max-w-md mt-6">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={`Cari nama ${activeTab === 'customers' ? 'customer' : 'supplier'}...`}
            className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl focus-visible:ring-orange-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* --- TABEL PELANGGAN --- */}
        <TabsContent value="customers" className="mt-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm border-gray-100">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase py-4 px-6">Nama Lengkap</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Email</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">No. Telepon</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Alamat Domisili</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase px-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-gray-400 italic text-xs">Belum ada data customer...</TableCell></TableRow>
                ) : (
                  filteredCustomers.map(customer => (
                    <TableRow key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-black text-gray-800 uppercase text-xs px-6 py-4">{customer.name}</TableCell>
                      <TableCell className="text-xs text-gray-500">{customer.email || '-'}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-600">{customer.phone || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-400 truncate max-w-[200px]">{customer.address || '-'}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(customer)} className="rounded-lg hover:bg-orange-50">
                            <Edit className="size-4 text-orange-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-500 rounded-lg hover:bg-red-50" onClick={() => handleDelete(customer.id)}>
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
        </TabsContent>

        {/* --- TABEL SUPPLIER --- */}
        <TabsContent value="suppliers" className="mt-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border bg-white overflow-hidden shadow-sm border-gray-100">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase py-4 px-6">Nama Supplier</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Email</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">No. Telepon</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Alamat Kantor</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase px-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-gray-400 italic text-xs">Belum ada data supplier...</TableCell></TableRow>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <TableRow key={supplier.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-black text-gray-800 uppercase text-xs px-6 py-4">{supplier.name}</TableCell>
                      <TableCell className="text-xs text-gray-500">{supplier.email || '-'}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-600">{(supplier as any).phone || (supplier as any).contact_info || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-400 truncate max-w-[200px]">{(supplier as any).office_address || '-'}</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(supplier)} className="rounded-lg hover:bg-orange-50">
                            <Edit className="size-4 text-orange-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-500 rounded-lg hover:bg-red-50" onClick={() => handleDelete(supplier.id)}>
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
        </TabsContent>
      </Tabs>

      {/* --- DIALOG FORM (RE-MAPPED) --- */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase font-black tracking-tighter text-center text-xl italic underline decoration-orange-500 decoration-4">
              {editingItem ? 'Update Profil' : 'Registrasi Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nama Lengkap *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama..."
                className="rounded-xl bg-gray-50 border-none h-11 font-bold focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">No. Telepon / WhatsApp</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812xxxx"
                className="rounded-xl bg-gray-50 border-none h-11 font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Alamat Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="rounded-xl bg-gray-50 border-none h-11"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">
                {activeTab === 'customers' ? 'Alamat Domisili' : 'Alamat Kantor'}
              </Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat lengkap mitra..."
                className="rounded-xl bg-gray-50 border-none resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl font-bold border-gray-200">BATAL</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 rounded-2xl font-black shadow-lg flex-1 h-11 text-white">
              {isSaving ? <Loader2 className="animate-spin size-4" /> : <Users className="mr-2 size-4" />}
              SIMPAN DATA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}