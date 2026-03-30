import { useState } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, FileText, 
  Settings, Brain, TrendingUp, Wallet, Tag, LogOut,
  ChevronDown, ChevronRight, BarChart3, QrCode, Menu, X, Layers, Printer, ShieldCheck
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Separator } from '@/app/components/ui/separator';
import { cn } from '@/app/components/ui/utils';
import { authAPI } from '@/services/api';

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  userRole: string;
  allowedMenus: string[]; // Tetap terima data dari database
}

const menuGroups = [
  {
    title: "Home",
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart },
    ]
  },
  {
    title: "Manajemen",
    icon: Package,
    items: [
      { id: 'kategories', label: 'Kategori', icon: Layers },
      { id: 'products', label: 'Produk', icon: Package },
      { id: 'stock', label: 'Stok', icon: Wallet },
      { id: 'contacts', label: 'Kontak', icon: Users },
      { id: 'discounts', label: 'Diskon', icon: Tag },
    ]
  },
  {
    title: "Report",
    icon: FileText,
    items: [
      { id: 'cash-drawer', label: 'Cash Drawer', icon: Wallet },
      { id: 'product-sales', label: 'Penjualan Barang', icon: BarChart3 }, 
      { id: 'category-sales', label: 'Penjualan Per Kategori', icon: Layers }, 
      { id: 'qris-reports', label: 'Laporan QRIS', icon: QrCode }, 
      { id: 'reports', label: 'Laporan', icon: FileText },
    ]
  },
  {
    title: "Insight",
    icon: Brain,
    items: [
      { id: 'ai-insights', label: 'AI Insights', icon: Brain },
      { id: 'ai-assistant', label: 'AI Assistant', icon: TrendingUp },
    ]
  },
  {
    title: "Setting",
    icon: Settings,
    items: [
      { id: 'settings', label: 'Pengaturan', icon: Settings },
      { id: 'setting-struk', label: 'Struk', icon: FileText },
      { id: 'setting-print', label: 'Printer', icon: Printer },
      { id: 'setting-akses', label: 'Hak Akses', icon: ShieldCheck },
    ]
  }
];

export function Sidebar({ activeMenu, onMenuChange, userRole, allowedMenus = [] }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(["Home"]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleGroup = (title: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups([title]);
      return;
    }
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title) 
        : [...prev, title]
    );
  };

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/login';
  };

  return (
    <div className={cn(
      // KUNCI UTAMA: h-screen & overflow-hidden
      "relative flex h-screen flex-col border-r bg-white transition-all duration-300 ease-in-out", 
      isCollapsed ? "w-16" : "w-52"
    )}>
      {/* Tombol Burger Floating */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-7 z-50 size-8 rounded-full border bg-white shadow-md hover:bg-orange-50 text-orange-600"
      >
        {isCollapsed ? <Menu className="size-4" /> : <X className="size-4" />}
      </Button>

      {/* Header Logo (Tetap di atas, tidak ikut scroll) */}
      <div className={cn(
        "flex h-20 items-center border-b bg-white transition-all duration-300 shrink-0", // shrink-0 biar nggak kegencet
        isCollapsed ? "justify-center px-0" : "px-4"
      )}>
        <div className={cn(
          "relative flex items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-orange-50 overflow-hidden transition-all",
          isCollapsed ? "size-10" : "size-10 mr-3"
        )}>
          <img src="/logo.jpeg" alt="Logo" className="size-full object-cover" />
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in duration-500">
            <h1 className="font-black text-[15px] tracking-tighter leading-none text-gray-900 uppercase">
              SEBLAK <span className="text-orange-600">MLEDAK</span>
            </h1>
          </div>
        )}
      </div>

      {/* Menu Area (Area yang bisa di-scroll) */}
      {/* Kita tambahkan class h-full agar dia mengambil sisa layar */}
      <ScrollArea className="flex-1 w-full overflow-y-auto">
        <div className="px-3 py-6 space-y-4">
          {menuGroups.map((group) => {
            const filteredItems = group.items.filter(item => 
              allowedMenus.includes(item.id) || userRole === 'owner'
            );

            if (filteredItems.length === 0) return null;

            const isOpen = openGroups.includes(group.title);
            const GroupIcon = group.icon;

            return (
              <div key={group.title} className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all",
                    isCollapsed ? "justify-center px-0 h-12" : "justify-between"
                  )}
                  onClick={() => toggleGroup(group.title)}
                >
                  <div className="flex items-center">
                    <GroupIcon className={cn("text-gray-400", isCollapsed ? "size-6" : "mr-3 size-4")} />
                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">{group.title}</span>}
                  </div>
                  {!isCollapsed && (
                    isOpen ? <ChevronDown className="size-3 opacity-50" /> : <ChevronRight className="size-3 opacity-50" />
                  )}
                </Button>

                {isOpen && !isCollapsed && (
                  <div className="ml-4 border-l-2 border-orange-100 pl-2 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {filteredItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeMenu === item.id;
                      
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'w-full justify-start text-[11px] font-bold uppercase rounded-xl transition-all h-9',
                            isActive 
                              ? 'bg-orange-600 text-white shadow-md shadow-orange-100' 
                              : 'text-gray-500 hover:bg-gray-50'
                          )}
                          onClick={() => onMenuChange(item.id)}
                        >
                          <Icon className={cn("mr-2 size-3.5", isActive ? "text-white" : "")} />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Logout Area (Tetap di bawah, tidak ikut scroll) */}
      <div className="shrink-0 p-4 border-t bg-white">
        <Button 
          variant="ghost" 
          className={cn(
            "text-red-600 hover:bg-red-50 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest",
            isCollapsed ? "size-12 p-0 justify-center mx-auto flex" : "w-full justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn(isCollapsed ? "size-6" : "mr-3 size-4")} />
          {!isCollapsed && <span>Keluar</span>}
        </Button>
      </div>
    </div>
  );
}