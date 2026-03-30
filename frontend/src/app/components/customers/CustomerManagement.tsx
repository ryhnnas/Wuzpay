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
      toast.error('Gagal memuat data kontak WuzPay');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    toast.info("Fitur Import sedang dalam pemeliharaan sistem.");
  };

  const handleExport = async () => {
    toast.info("Fitur Export sedang disiapkan.");
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
    setShowDialog(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    
    // Mapping data MongoDB ke Form
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
      // Menggunakan ID MongoDB (_id) atau id mapping dari api.ts
      const targetId = editingItem?._id || editingItem?.id;

      if (activeTab === 'customers') {
        const customerPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        };

        if (editingItem) {
          await customersAPI.update(targetId, customerPayload);
          toast.success('Profil pelanggan diperbarui');
        } else {
          await customersAPI.create(customerPayload);
          toast.success('Pelanggan WuzPay baru ditambahkan');
        }
      } else {
        const supplierPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          office_address: formData.address,
          contact_info: formData.phone
        };
        
        if (editingItem) {
          await suppliersAPI.update(targetId, supplierPayload);
          toast.success('Data supplier diperbarui');
        } else {
          await suppliersAPI.create(supplierPayload);
          toast.success('Supplier baru didaftarkan');
        }
      }
      setShowDialog(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    const targetId = item._id || item.id;
    if (confirm(`Yakin ingin menghapus ${item.name} dari WuzPay?`)) {
      try {
        if (activeTab === 'customers') {
          await customersAPI.delete(targetId);
        } else {
          await suppliersAPI.delete(targetId);
        }
        toast.success('Kontak berhasil dihapus');
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
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="font-bold text-gray-400 uppercase text-xs tracking-widest animate-pulse">
          Sinkronisasi Kontak WuzPay...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter text-gray-900 italic">
            Manajemen Kontak <span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Database Mitra Bisnis WuzPay</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleImport} className="rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-200 h-10 px-6">
            <Upload className="mr-2 size-4" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-200 h-10 px-6">
            <Download className="mr-2 size-4" /> Export
          </Button>
          <Button size="sm" onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-100 h-10 px-8 text-white">
            <Plus className="mr-2 size-4" /> Tambah {activeTab === 'customers' ? 'Pelanggan' : 'Supplier'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(''); }} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-[20px] w-fit mb-6">
          <TabsTrigger value="customers" className="text-[10px] font-black uppercase tracking-widest px-8 h-10 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-2xl transition-all">Pelanggan</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-[10px] font-black uppercase tracking-widest px-8 h-10 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-2xl transition-all">Supplier</TabsTrigger>
        </TabsList>

        <div className="relative max-w-md mb-6 group">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
          <Input
            placeholder={`Cari nama ${activeTab === 'customers' ? 'pelanggan' : 'supplier'}...`}
            className="pl-12 h-14 bg-white border-gray-100 shadow-sm rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500 transition-all font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* --- TABEL PELANGGAN --- */}
        <TabsContent value="customers" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[32px] border bg-white overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-gray-100">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8 text-gray-400">Nama Lengkap</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">No. Telepon</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alamat Domisili</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-8 text-gray-400">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-24 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Belum ada data pelanggan...</TableCell></TableRow>
                ) : (
                  filteredCustomers.map(customer => (
                    <TableRow key={customer._id || customer.id} className="hover:bg-orange-50/30 transition-colors border-gray-50">
                      <TableCell className="font-black text-gray-900 uppercase text-xs px-8 py-5 italic">{customer.name}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-500">{customer.email || '-'}</TableCell>
                      <TableCell className="text-xs font-black text-gray-700">{customer.phone || '-'}</TableCell>
                      <TableCell className="text-xs font-medium text-gray-400 truncate max-w-[200px]">{customer.address || '-'}</TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(customer)} className="rounded-xl hover:bg-orange-100 text-orange-600 transition-all">
                            <Edit className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-400 rounded-xl hover:bg-red-50 transition-all" onClick={() => handleDelete(customer)}>
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
        <TabsContent value="suppliers" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[32px] border bg-white overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-gray-100">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8 text-gray-400">Nama Supplier</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">No. Telepon</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alamat Kantor</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-8 text-gray-400">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-24 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Belum ada data supplier...</TableCell></TableRow>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <TableRow key={supplier._id || supplier.id} className="hover:bg-orange-50/30 transition-colors border-gray-50">
                      <TableCell className="font-black text-gray-900 uppercase text-xs px-8 py-5 italic">{supplier.name}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-500">{supplier.email || '-'}</TableCell>
                      <TableCell className="text-xs font-black text-gray-700">{(supplier as any).phone || (supplier as any).contact_info || '-'}</TableCell>
                      <TableCell className="text-xs font-medium text-gray-400 truncate max-w-[200px]">{(supplier as any).office_address || '-'}</TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(supplier)} className="rounded-xl hover:bg-orange-100 text-orange-600 transition-all">
                            <Edit className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-400 rounded-xl hover:bg-red-50 transition-all" onClick={() => handleDelete(supplier)}>
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

      {/* --- DIALOG FORM --- */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-[40px] border-none shadow-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="uppercase font-black tracking-tighter text-center text-2xl italic">
              {editingItem ? 'Update Profil' : 'Registrasi Baru'} <span className="text-orange-600">.</span>
            </DialogTitle>
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-300 mt-2">Data Mitra Bisnis WuzPay</p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nama Lengkap *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama..."
                className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-bold focus:ring-2 focus:ring-orange-500 transition-all pl-6"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">No. Telepon / WhatsApp</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812xxxx"
                className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 font-bold pl-6"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Alamat Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 pl-6"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                {activeTab === 'customers' ? 'Alamat Domisili' : 'Alamat Kantor'}
              </Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat lengkap mitra..."
                className="rounded-2xl bg-gray-50/50 border-gray-100 resize-none pl-6 pt-4"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-8 flex gap-3">
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 px-6">Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 rounded-2xl font-black shadow-lg shadow-orange-100 h-12 flex-1 text-white uppercase tracking-widest text-[10px]">
              {isSaving ? <Loader2 className="animate-spin size-4" /> : <Users className="mr-2 size-4" />}
              Simpan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}