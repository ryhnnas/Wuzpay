import React, { useState, useEffect } from 'react';
import { ShieldCheck, Save, Loader2, Info, UserPlus, Trash2 } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
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
      setPermissions(permissionData || []);
      setRegisteredUsers(usersData || []);
    } catch (error) {
      toast.error("Gagal memuat data hak akses akun");
    } finally {
      setLoading(false);
    }
  };

  const getAllowedMenusByRole = (roleName: string) => {
    const role = String(roleName || '').toLowerCase();
    if (role === 'owner') return ALL_MENU_IDS.map((menu) => menu.id);

    const rolePermission = permissions.find(
      (permission) => String(permission.role_name || '').toLowerCase() === role
    );
    return rolePermission?.allowed_menus || [];
  };

  const getMenuLabel = (menuId: string) => {
    const found = ALL_MENU_IDS.find((menu) => menu.id === menuId);
    return found?.label || menuId;
  };

  const togglePermission = (roleName: string, menuId: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.role_name === roleName) {
        const isExist = p.allowed_menus.includes(menuId);
        return {
          ...p,
          allowed_menus: isExist 
            ? p.allowed_menus.filter((id: string) => id !== menuId)
            : [...p.allowed_menus, menuId]
        };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = permissions.map(p => 
        permissionsAPI.update(p.role_name, p.allowed_menus)
      );
      await Promise.all(promises);
      toast.success("Hak akses berhasil diperbarui!");
    } catch (error) {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast.error('Nama, email, dan password wajib diisi');
      return;
    }

    try {
      setCreatingUser(true);
      await authAPI.createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
      });
      toast.success('User baru berhasil dibuat');
      setNewUser({ name: '', email: '', password: '', role: 'kasir' });
      await fetchPermissions();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userRole: string, userName: string) => {
    if (userRole.toLowerCase() === 'owner') {
      toast.error('Akun owner tidak bisa dihapus');
      return;
    }

    const confirmed = window.confirm(`Hapus user ${userName}? Tindakan ini tidak bisa dibatalkan.`);
    if (!confirmed) return;

    try {
      setDeletingUserId(userId);
      await authAPI.deleteUser(userId);
      toast.success('User berhasil dihapus');
      await fetchPermissions();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menghapus user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Menghubungkan ke Server Keamanan...</div>;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
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

      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
        <Info className="text-blue-600 size-5 mt-0.5" />
        <p className="text-xs text-blue-700 font-medium leading-relaxed">
          Perubahan hak akses akan berdampak langsung pada tampilan Sidebar user.
          Role <span className="font-black uppercase">Owner</span> bersifat bypass dan tidak diatur dari tabel ini.
        </p>
      </div>

      {/* WRAPPER TABEL DENGAN MAX HEIGHT AGAR STICKY JALAN */}
      <div className="border rounded-[32px] overflow-auto shadow-sm max-h-[calc(100vh-300px)] relative custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {/* STICKY POJOK KIRI ATAS (MENU SISTEM) */}
              <th className="sticky left-0 top-0 z-30 bg-gray-50 p-6 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-r">
                Menu Sistem
              </th>
              {/* STICKY HEADER ROLES */}
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
                {/* STICKY KOLOM KIRI (NAMA MENU) */}
                <td className="sticky left-0 z-10 bg-white p-6 border-b border-r group-hover:bg-[#fff9f5] transition-colors">
                  <p className="font-black text-sm text-gray-700 uppercase leading-none">{menu.label}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">ID: {menu.id}</p>
                </td>
                {ROLES.map(role => {
                  const rolePerm = permissions.find(p => p.role_name === role);
                  const isChecked = rolePerm?.allowed_menus.includes(menu.id);
                  
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

      <div className="border rounded-[32px] shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50">
          <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-500">Akses Per Akun Terdaftar</h3>
        </div>
        <div className="p-5 border-b bg-white grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={newUser.name}
            onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nama user"
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium"
          />
          <input
            value={newUser.email}
            onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium"
          />
          <input
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Password"
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-bold uppercase"
          >
            <option value="manager">manager</option>
            <option value="admin">admin</option>
            <option value="kasir">kasir</option>
          </select>
          <Button
            onClick={handleCreateUser}
            disabled={creatingUser}
            className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest"
          >
            {creatingUser ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
            Tambah User
          </Button>
        </div>
        <div className="overflow-auto max-h-[260px]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Nama</th>
                <th className="sticky top-0 bg-gray-50 px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Email</th>
                <th className="sticky top-0 bg-gray-50 px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Role</th>
                <th className="sticky top-0 bg-gray-50 px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Akses Menu</th>
                <th className="sticky top-0 bg-gray-50 px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {registeredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada akun terdaftar.</td>
                </tr>
              ) : (
                registeredUsers.map((account) => {
                  const accountRole = String(account.role || 'kasir').toLowerCase();
                  const allowedMenus = getAllowedMenusByRole(accountRole);
                  return (
                    <tr key={account.id} className="hover:bg-orange-50/20">
                      <td className="px-5 py-3 border-b text-sm font-bold text-gray-700">{account.name || '-'}</td>
                      <td className="px-5 py-3 border-b text-sm text-gray-500">{account.email || '-'}</td>
                      <td className="px-5 py-3 border-b text-xs font-black uppercase text-orange-600">{accountRole}</td>
                      <td className="px-5 py-3 border-b text-xs text-gray-600">
                        {accountRole === 'owner'
                          ? 'Semua menu (bypass owner)'
                          : allowedMenus.length > 0
                            ? allowedMenus.map((menuId: string) => getMenuLabel(menuId)).join(', ')
                            : 'Tidak ada akses menu'}
                      </td>
                      <td className="px-5 py-3 border-b text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={accountRole === 'owner' || deletingUserId === account.id}
                          onClick={() => handleDeleteUser(account.id, accountRole, account.name || account.email || 'user ini')}
                          className="h-8 rounded-lg text-[10px] font-black uppercase text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {deletingUserId === account.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="mr-1 size-3" />}
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingAkses;