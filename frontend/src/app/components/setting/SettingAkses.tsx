import React, { useState, useEffect } from 'react';
import { ShieldCheck, Save, Loader2, Info, UserPlus, Trash2, Clock, Check } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Badge } from '@/app/components/ui/badge'; 
import { authAPI, permissionsAPI } from '@/services/api';
import { toast } from "sonner";
import { cn } from "@/app/components/ui/utils";

const ROLES = ['manager', 'admin', 'kasir'];

const ALL_MENU_IDS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pos', label: 'Kasir (POS)' },
  { id: 'products', label: 'Produk' },
  { id: 'kategories', label: 'Kategori' },
  { id: 'stock', label: 'Stok' },
  { id: 'contacts', label: 'Kontak' },
  { id: 'discounts', label: 'Diskon' },
  { id: 'cash-drawer', label: 'Cash Drawer' },
  { id: 'product-sales', label: 'Penjualan Barang' },
  { id: 'category-sales', label: 'Penjualan Kategori' },
  { id: 'qris-reports', label: 'Laporan QRIS' },
  { id: 'reports', label: 'Semua Laporan' },
  { id: 'ai-insights', label: 'AI Insights' },
  { id: 'ai-assistant', label: 'AI Assistant' },
  { id: 'settings', label: 'Pengaturan Umum' },
  { id: 'setting-struk', label: 'Setting Struk' },
  { id: 'setting-print', label: 'Setting Printer' },
  { id: 'setting-akses', label: 'Hak Akses' },
];

const SettingAkses = () => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'kasir',
  });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const [permissionData, usersData] = await Promise.all([
        permissionsAPI.getAll(),
        authAPI.getUsers(),
      ]);
      
      // Normalisasi agar role yang belum ada di DB tetap muncul di tabel
      const normalized = ROLES.map(role => {
        const found = (permissionData || []).find((p: any) => p.role_name.toLowerCase() === role.toLowerCase());
        return found ? found : { role_name: role, allowed_menus: [] };
      });

      setPermissions(normalized);
      setRegisteredUsers(usersData || []);
    } catch (error) {
      toast.error("Gagal sinkronisasi keamanan");
    } finally {
      setLoading(false);
    }
  };

  const getAllowedMenusByRole = (roleName: string) => {
    const role = String(roleName || '').toLowerCase();
    if (role === 'owner') return ALL_MENU_IDS.map((menu) => menu.id);
    const rolePermission = permissions.find(p => p.role_name.toLowerCase() === role);
    return rolePermission?.allowed_menus || [];
  };

  const getMenuLabel = (menuId: string) => {
    const found = ALL_MENU_IDS.find((menu) => menu.id === menuId);
    return found?.label || menuId;
  };

  const togglePermission = (roleName: string, menuId: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.role_name.toLowerCase() === roleName.toLowerCase()) {
        const isExist = p.allowed_menus.includes(menuId);
        const newMenus = isExist 
          ? p.allowed_menus.filter((id: string) => id !== menuId)
          : [...p.allowed_menus, menuId];
        return { ...p, allowed_menus: newMenus };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Mengunci Hak Akses ke MongoDB...");
    try {
      // PAKAI FOR...OF BIAR ANTRE (SEQUENTIAL) GAK TABRAKAN DI MONGO
      for (const p of permissions) {
        await permissionsAPI.update(p.role_name, p.allowed_menus);
      }
      toast.success("HAK AKSES BERHASIL DISIMPAN PERMANEN", { id: toastId });
      await fetchPermissions(); // Tarik ulang data buat mastiin
    } catch (error) {
      toast.error("DATABASE REJECTED: Gagal simpan", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast.error('Data user wajib lengkap mang!');
      return;
    }
    try {
      setCreatingUser(true);
      await authAPI.createUser(newUser);
      toast.success('User baru berhasil didaftarkan');
      setNewUser({ name: '', email: '', password: '', role: 'kasir' });
      await fetchPermissions();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userRole: string, userName: string) => {
    if (userRole.toLowerCase() === 'owner') return toast.error('Owner dilarang hapus diri sendiri');
    if (!window.confirm(`Hapus permanen akses ${userName}?`)) return;
    try {
      setDeletingUserId(userId);
      await authAPI.deleteUser(userId);
      toast.success('User berhasil dihapus dari sistem');
      await fetchPermissions();
    } catch (error: any) {
      toast.error('Gagal hapus user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      <Loader2 className="size-12 text-orange-600 animate-spin" />
      <p className="mt-4 font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Menghubungkan Protokol Keamanan...</p>
    </div>
  );

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-orange-600 flex items-center gap-3">
            <ShieldCheck className="size-10 text-orange-600" />
            Hak Akses Role
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px] mt-2">
            Atur menu apa saja yang bisa dibuka oleh setiap jabatan
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700 h-14 px-8 rounded-2xl font-black text-white shadow-xl shadow-orange-100 transition-all active:scale-95"
        >
          {saving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
          SIMPAN PERUBAHAN
        </Button>
      </div>

      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start gap-3">
        <Info className="text-orange-600 size-5 mt-0.5" />
        <p className="text-xs text-blue-700 font-medium leading-relaxed">
          Perubahan hak akses akan berdampak langsung pada tampilan Sidebar user.
          Role <span className="font-black uppercase">Owner</span> bersifat bypass dan tidak diatur dari tabel ini.
        </p>
      </div>

      {/* MATRIX PERMISSIONS */}
      <div className="border rounded-[32px] overflow-auto shadow-sm max-h-[calc(100vh-350px)] relative custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-gray-50 p-6 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-r">
                Menu Sistem
              </th>
              {ROLES.map(role => (
                <th key={role} className="sticky top-0 z-20 bg-gray-50 p-6 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_MENU_IDS.map((menu) => (
              <tr key={menu.id} className="hover:bg-orange-50/20 transition-colors group">
                <td className="sticky left-0 z-10 bg-white p-6 border-b border-r group-hover:bg-[#fff9f5] transition-colors">
                  <p className="font-black text-sm text-gray-700 uppercase leading-none">{menu.label}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">ID: {menu.id}</p>
                </td>
                {ROLES.map(role => {
                  const rolePerm = permissions.find(p => p.role_name.toLowerCase() === role.toLowerCase());
                  const isChecked = rolePerm?.allowed_menus?.includes(menu.id);
                  
                  return (
                    <td key={role} className="p-6 text-center border-b">
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={isChecked}
                          onCheckedChange={() => togglePermission(role, menu.id)}
                          className={cn(
                            "size-6 rounded-lg border-2 transition-all",
                            isChecked ? "bg-orange-600 border-orange-600 shadow-lg shadow-orange-100" : "border-gray-200 bg-white"
                          )}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* USER MANAGEMENT SECTION */}
      <div className="border rounded-[32px] shadow-sm overflow-hidden bg-white">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-500">Akses Per Akun Terdaftar</h3>
          <Badge className="bg-orange-100 text-orange-600 border-none font-black text-[10px]">{registeredUsers.length} TOTAL USER</Badge>
        </div>
        
        {/* ADD USER FORM */}
        <div className="p-6 border-b bg-white grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input value={newUser.name} onChange={(e) => setNewUser(p => ({...p, name: e.target.value}))} placeholder="Nama Lengkap" className="h-12 rounded-xl font-bold uppercase text-xs" />
          <Input value={newUser.email} onChange={(e) => setNewUser(p => ({...p, email: e.target.value}))} placeholder="Email User" className="h-12 rounded-xl font-bold text-xs" />
          <Input type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({...p, password: e.target.value}))} placeholder="Password" className="h-12 rounded-xl font-bold text-xs" />
          <select value={newUser.role} onChange={(e) => setNewUser(p => ({...p, role: e.target.value}))} className="h-12 px-3 rounded-xl border border-gray-200 text-xs font-black uppercase text-gray-700 outline-none focus:ring-2 focus:ring-orange-600">
            <option value="manager">manager</option>
            <option value="admin">admin</option>
            <option value="kasir">kasir</option>
          </select>
          <Button onClick={handleCreateUser} disabled={creatingUser} className="h-12 rounded-xl bg-orange-600 hover:bg-orange-700 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100">
            {creatingUser ? <Loader2 className="animate-spin" /> : <><UserPlus className="mr-2 size-4" /> Tambah User</>}
          </Button>
        </div>

        {/* USER LIST TABLE */}
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 px-8 py-4 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Nama</th>
                <th className="sticky top-0 bg-gray-50 px-8 py-4 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Email</th>
                <th className="sticky top-0 bg-gray-50 px-8 py-4 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Role</th>
                <th className="sticky top-0 bg-gray-50 px-8 py-4 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Akses Menu</th>
                <th className="sticky top-0 bg-gray-50 px-8 py-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {registeredUsers.map((account) => {
                const accountRole = String(account.role || 'kasir').toLowerCase();
                const allowedMenus = getAllowedMenusByRole(accountRole);
                return (
                  <tr key={account._id || account.id} className="hover:bg-orange-50/20 group">
                    <td className="px-8 py-4 border-b text-sm font-black text-gray-700 uppercase italic">{account.name}</td>
                    <td className="px-8 py-4 border-b text-sm text-gray-500">{account.email}</td>
                    <td className="px-8 py-4 border-b">
                      <Badge className={cn("text-[10px] font-black uppercase px-3", accountRole === 'owner' ? "bg-red-600" : "bg-orange-100 text-orange-600 border-none")}>
                        {accountRole}
                      </Badge>
                    </td>
                    <td className="px-8 py-4 border-b text-[10px] text-gray-400 font-bold uppercase tracking-tighter max-w-[250px] truncate">
                      {accountRole === 'owner' ? 'FULL SYSTEM ACCESS' : (allowedMenus.length > 0 ? allowedMenus.map(m => getMenuLabel(m)).join(', ') : 'TIDAK ADA AKSES')}
                    </td>
                    <td className="px-8 py-4 border-b text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={accountRole === 'owner' || deletingUserId === (account._id || account.id)}
                        onClick={() => handleDeleteUser(account._id || account.id, accountRole, account.name)}
                        className="text-red-500 hover:bg-red-50 rounded-xl"
                      >
                        {deletingUserId === (account._id || account.id) ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingAkses;