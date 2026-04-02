import { useState } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, FileText, 
  Settings, Brain, TrendingUp, Wallet, Tag, LogOut,
  ChevronDown, ChevronRight, BarChart3, QrCode, Menu, X, Layers, Printer, ShieldCheck 
} from 'lucide-react'; // <--- BarChart3 sudah masuk barisan mang!
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { cn } from '@/app/components/ui/utils';
import { authAPI } from '@/services/api';

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  userRole: string;
  allowedMenus: string[];
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
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleGroup = (title: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups([title]);
      return;
    }
    setOpenGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/login';
  };

  return (
    <aside className={cn(
      "relative flex h-screen flex-col border-r bg-white transition-all duration-300 ease-in-out shadow-sm", 
      isCollapsed ? "w-16" : "w-52"
    )}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-7 z-50 size-8 rounded-full border bg-white shadow-md hover:bg-orange-50 text-orange-600"
      >
        {isCollapsed ? <Menu className="size-4" /> : <X className="size-4" />}
      </Button>

      <div className={cn(
        "flex h-20 items-center border-b bg-white transition-all duration-300 shrink-0", 
        isCollapsed ? "justify-center px-0" : "px-4"
      )}>
       
          <img className='mx-auto' src="/logo.png" alt="Logo" width={100} />
        
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden"> 
        <ScrollArea className="h-full w-full">
          <div className="px-3 py-6 space-y-4">
            {menuGroups.map((group) => {
              const filteredItems = group.items.filter(item => 
                allowedMenus.includes(item.id) || userRole === 'owner' || userRole === 'admin'
              );
              if (filteredItems.length === 0) return null;
              const isOpen = openGroups.includes(group.title);
              const GroupIcon = group.icon;

              return (
                <div key={group.title} className="space-y-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full font-black text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all h-10",
                      isCollapsed ? "justify-center px-0 h-12" : "justify-between"
                    )}
                    onClick={() => toggleGroup(group.title)}
                  >
                    <div className="flex items-center">
                      <GroupIcon className={cn("text-gray-400", isCollapsed ? "size-6" : "mr-3 size-4")} />
                      {!isCollapsed && <span className="text-[10px] uppercase tracking-widest">{group.title}</span>}
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
                              'w-full justify-start text-[10px] font-black uppercase rounded-xl transition-all h-9 px-3',
                              isActive ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
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
      </div>

      <div className="shrink-0 p-4 border-t bg-white mt-auto">
        <Button 
          variant="ghost" 
          className={cn(
            "text-red-600 hover:bg-red-50 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest h-11 border border-gray-50 shadow-sm",
            isCollapsed ? "size-11 p-0 justify-center mx-auto flex" : "w-full justify-start px-4"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn(isCollapsed ? "size-6" : "mr-3 size-4")} />
          {!isCollapsed && <span>Keluar</span>}
        </Button>
      </div>
    </aside>
  );
}