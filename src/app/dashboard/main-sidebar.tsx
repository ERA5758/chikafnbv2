
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/dashboard/logo';
import {
  LayoutGrid,
  BookOpenCheck,
  Contact2,
  LogOut,
  Settings,
  History,
  Users,
  Trophy,
  Gift,
  CircleDollarSign,
  Receipt,
  UserCircle,
  BarChart4,
  Armchair,
  Store,
  Wallet,
  TrendingUp,
  Map,
  Newspaper,
  ChefHat,
} from 'lucide-react';
import * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { TopUpDialog } from '@/components/dashboard/top-up-dialog';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { ThemeSwitcher } from '@/components/dashboard/theme-switcher';

type MainSidebarProps = {
  pradanaTokenBalance: number;
}

export function MainSidebar({ pradanaTokenBalance }: MainSidebarProps) {
  const { currentUser, activeStore, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultView = currentUser?.role === 'kitchen' ? 'kitchen' : (currentUser?.role === 'admin' ? 'overview' : 'pos');
  const currentView = searchParams.get('view') || defaultView;
  
  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);

  const navigate = (view: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (view !== 'pos') {
      newParams.delete('tableId');
      newParams.delete('tableName');
    }
    newParams.set('view', view);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const menuGroups = [
    {
        group: 'Operasional',
        icon: <Store />,
        roles: ['admin', 'cashier', 'kitchen'],
        items: [
            { view: 'overview', label: 'Overview', icon: <LayoutGrid />, roles: ['admin', 'cashier'], tourId: 'sidebar-overview' },
            { view: 'pos', label: 'Kasir POS', icon: <Armchair />, roles: ['admin', 'cashier'] },
            { view: 'kitchen', label: 'Dapur', icon: <ChefHat />, roles: ['admin', 'kitchen'] },
            { view: 'transactions', label: 'Transaksi', icon: <History />, roles: ['admin', 'cashier'] },
        ]
    },
    {
        group: 'Manajemen',
        icon: <Wallet />,
        roles: ['admin', 'cashier'],
        items: [
            { view: 'products', label: 'Produk (Menu)', icon: <BookOpenCheck />, roles: ['admin', 'cashier'], tourId: 'sidebar-products' },
            { view: 'customers', label: 'Pelanggan', icon: <Contact2 />, roles: ['admin', 'cashier'] },
            { view: 'employees', label: 'Karyawan', icon: <Users />, roles: ['admin'] },
        ]
    },
    {
        group: 'Analisis & Pertumbuhan',
        icon: <TrendingUp />,
        roles: ['admin'],
        items: [
            { view: 'customer-analytics', label: 'Analisis Pelanggan', icon: <BarChart4 />, roles: ['admin'] },
            { view: 'promotions', label: 'Promosi', icon: <Gift />, roles: ['admin'] },
            { view: 'challenges', label: 'Tantangan', icon: <Trophy />, roles: ['admin'] },
            { view: 'ai-business-plan', label: 'AI Business Plan', icon: <Map />, roles: ['admin'] },
        ]
    },
     {
        group: 'Pengaturan Toko',
        icon: <Settings />,
        roles: ['admin'],
        items: [
            { view: 'receipt-settings', label: 'Pengaturan Struk', icon: <Receipt />, roles: ['admin'] },
            { view: 'catalog', label: 'Katalog Publik', icon: <Newspaper />, roles: ['admin'] },
        ]
    },
  ];

  const isAdmin = currentUser?.role === 'admin';

  const tokenDisplay = (
      <div className="flex items-center justify-center gap-2 text-sidebar-foreground">
          <CircleDollarSign className="h-4 w-4" />
          <span className="font-mono text-sm font-semibold">{pradanaTokenBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
      </div>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center">
        <Logo storeName={activeStore?.name} />
        <div className="mt-2 w-full text-center group-data-[collapsible=icon]:hidden">
            <Separator className="mb-2 bg-sidebar-border" />
              <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                {isAdmin ? (
                    <DialogTrigger asChild>
                        <div data-tour="top-up-button" className="cursor-pointer rounded-md p-1 hover:bg-sidebar-accent">
                            {tokenDisplay}
                        </div>
                    </DialogTrigger>
                ) : (
                    <div className="p-1">
                        {tokenDisplay}
                    </div>
                )}
                <TopUpDialog 
                    setDialogOpen={setIsTopUpOpen} 
                />
              </Dialog>
              <p className="text-xs text-sidebar-foreground/70">Pradana Token</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuGroups.map((group) => {
            if (!currentUser) return null;
            const visibleItems = group.items.filter(item => item.roles.includes(currentUser.role));
            if (visibleItems.length === 0) return null;

            return (
              <SidebarGroup key={group.group}>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
                  {group.icon}
                  <span>{group.group}</span>
                </SidebarGroupLabel>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.view} data-tour={item.tourId}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.view)}
                      isActive={currentView === item.view}
                      tooltip={item.label}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            {currentUser && (
               <div className="mb-2 w-full p-2 group-data-[collapsible=icon]:hidden">
                  <Separator className="mb-2 bg-sidebar-border" />
                  <div className="flex items-center gap-2 rounded-md p-2">
                     <UserCircle className="h-8 w-8 shrink-0" />
                     <div className="overflow-hidden">
                        <p className="truncate font-semibold">{currentUser.name}</p>
                        <p className="truncate text-xs text-sidebar-foreground/70 capitalize">{currentUser.role}</p>
                     </div>
                  </div>
               </div>
            )}
            <ThemeSwitcher />
          <SidebarMenuItem data-tour="sidebar-settings">
            <SidebarMenuButton tooltip="Pengaturan" onClick={() => navigate('settings')} isActive={currentView === 'settings'}>
              <Settings />
              <span>Pengaturan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Keluar" onClick={handleLogout}>
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
