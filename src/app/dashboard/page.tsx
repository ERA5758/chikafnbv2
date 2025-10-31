'use client';

import * as React from 'react';
import { MainSidebar } from '@/app/dashboard/main-sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarInset } from '@/components/ui/sidebar';
import Overview from '@/app/dashboard/views/overview';
import AdminOverview from '@/app/dashboard/views/admin-overview';
import POS from '@/app/dashboard/views/pos';
import Products from '@/app/dashboard/views/products';
import Customers from '@/app/dashboard/views/customers';
import CustomerAnalytics from '@/app/dashboard/views/customer-analytics';
import Transactions, { TransactionDetailsDialog } from '@/app/dashboard/views/transactions';
import Employees from '@/app/dashboard/views/employees';
import Settings from '@/app/dashboard/views/settings';
import Challenges from '@/app/dashboard/views/challenges';
import Promotions from '@/app/dashboard/views/promotions';
import ReceiptSettings from '@/app/dashboard/views/receipt-settings';
import AIBusinessPlan from '@/app/dashboard/views/ai-business-plan';
import CatalogSettings from '@/app/dashboard/views/catalog-settings';
import Tables from '@/app/dashboard/views/tables';
import Kitchen from '@/app/dashboard/views/kitchen';
import { Suspense } from 'react';
import type { User, Transaction, Customer } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { ChefHat, Printer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Receipt } from '@/components/dashboard/receipt';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { OrderReadyDialog } from '@/components/dashboard/order-ready-dialog';
import { MiniStickerDialog } from '@/components/dashboard/mini-sticker-dialog';
// import { OnboardingTour } from '@/components/dashboard/onboarding-tour';

function CheckoutReceiptDialog({ transaction, users, open, onOpenChange }: { transaction: Transaction | null; users: User[]; open: boolean; onOpenChange: (open: boolean) => void }) {
    if (!transaction) return null;
    
    const handlePrint = () => {
        const printableArea = document.querySelector('.printable-area');
        if(printableArea) {
            printableArea.innerHTML = ''; // Clear previous receipt
            const receiptString = document.getElementById(`receipt-for-${transaction.id}`)?.innerHTML;
            if (receiptString) {
                printableArea.innerHTML = receiptString;
                window.print();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider text-center">Pratinjau Struk</DialogTitle>
                </DialogHeader>
                <div className="py-4" id={`receipt-for-${transaction.id}`}>
                    <Receipt transaction={transaction} users={users} />
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button type="button" className="w-full gap-2" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                        Cetak Struk
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DashboardContent() {
  const { currentUser, activeStore, pradanaTokenBalance } = useAuth();
  const { dashboardData, isLoading, refreshData } = useDashboard();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // State for shared dialogs
  const [transactionToPrint, setTransactionToPrint] = React.useState<Transaction | null>(null);
  const [transactionForDetail, setTransactionForDetail] = React.useState<Transaction | null>(null);
  const [transactionForFollowUp, setTransactionForFollowUp] = React.useState<Transaction | null>(null);
  const [transactionForSticker, setTransactionForSticker] = React.useState<Transaction | null>(null);
  
  const isAdmin = currentUser?.role === 'admin';
  const defaultView = currentUser?.role === 'kitchen' ? 'kitchen' : (isAdmin ? 'overview' : 'pos');
  const view = searchParams.get('view') || defaultView;
  
  if (isLoading || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const { users, customers, transactions } = dashboardData;

  const getCustomerForTransaction = (transaction: Transaction | null): Customer | undefined => {
    if (!transaction?.customerId || transaction.customerId === 'N/A') return undefined;
    return customers.find(c => c.id === transaction.customerId);
  }

  const renderView = () => {
    const commonProps = { onPrintRequest: setTransactionToPrint, onDetailRequest: setTransactionForDetail };
    const cashierViews = ['overview', 'pos', 'transactions', 'products', 'customers', 'promotions'];
    const kitchenViews = ['kitchen'];

    if (currentUser?.role === 'cashier' && !cashierViews.includes(view)) {
        return <Tables />; // Default view for cashier
    }
    if (currentUser?.role === 'kitchen' && !kitchenViews.includes(view)) {
        return <Kitchen onFollowUpRequest={setTransactionForFollowUp} onPrintStickerRequest={setTransactionForSticker}/>; // Default for kitchen
    }
    if (currentUser?.role === 'admin' && view === 'kitchen') {
        return <Kitchen onFollowUpRequest={setTransactionForFollowUp} onPrintStickerRequest={setTransactionForSticker} />;
    }

    switch (view) {
      case 'overview': return isAdmin ? <AdminOverview /> : <Overview />;
      case 'pos': return searchParams.get('tableId') ? <POS {...commonProps} /> : <Tables />;
      case 'products': return <Products />;
      case 'customers': return <Customers />;
      case 'customer-analytics': return <CustomerAnalytics />;
      case 'employees': return <Employees />;
      case 'transactions': return <Transactions onDetailRequest={setTransactionForDetail} onPrintRequest={setTransactionToPrint} />;
      case 'kitchen': return <Kitchen onFollowUpRequest={setTransactionForFollowUp} onPrintStickerRequest={setTransactionForSticker} />;
      case 'settings': return <Settings />;
      case 'challenges': return <Challenges />;
      case 'promotions': return <Promotions />;
      case 'receipt-settings': return <ReceiptSettings />;
      case 'ai-business-plan': return <AIBusinessPlan />;
      case 'catalog': return <CatalogSettings />;
      default: return <Tables />;
    }
  };

  const getTitle = () => {
    const tableId = searchParams.get('tableId');
    const tableName = searchParams.get('tableName');
    if (view === 'pos' && tableId) {
        return `Pesanan: ${tableName || ''}`;
    }
    const baseTitle = {
      'overview': 'Dashboard Overview', 'pos': 'Kasir POS', 'kitchen': 'Monitor Dapur', 'products': 'Inventaris Produk', 'customers': 'Manajemen Pelanggan',
      'customer-analytics': 'Analisis Pelanggan', 'employees': 'Manajemen Karyawan', 'transactions': 'Riwayat Transaksi', 'settings': 'Pengaturan',
      'challenges': 'Tantangan Karyawan', 'promotions': 'Manajemen Promosi', 'receipt-settings': 'Pengaturan Struk', 'ai-business-plan': 'AI Business Plan',
      'catalog': 'Pengaturan Katalog Publik',
    }[view] || 'Kasir POS';
    return isAdmin && view === 'overview' ? `Admin Overview` : baseTitle;
  };

  return (
    <>
      <MainSidebar pradanaTokenBalance={pradanaTokenBalance} />
      <SidebarInset>
        <Header title={getTitle()} view={view} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {currentUser ? renderView() : <DashboardSkeleton />}
        </main>
      </SidebarInset>
      <div className="printable-area" aria-hidden="true"></div>
      
       {/* <OnboardingTour /> */}

       <CheckoutReceiptDialog
            transaction={transactionToPrint}
            users={users}
            open={!!transactionToPrint}
            onOpenChange={() => setTransactionToPrint(null)}
        />
        
        {transactionForDetail && (
            <TransactionDetailsDialog
                transaction={transactionForDetail}
                users={users}
                open={!!transactionForDetail}
                onOpenChange={() => setTransactionForDetail(null)}
                onFollowUpRequest={(transaction) => setTransactionForFollowUp(transaction)}
                onPrintRequest={setTransactionToPrint}
            />
        )}
        
        {transactionForFollowUp && activeStore && (
            <OrderReadyDialog
                transaction={transactionForFollowUp}
                customer={getCustomerForTransaction(transactionForFollowUp)}
                store={activeStore}
                open={!!transactionForFollowUp}
                onOpenChange={() => setTransactionForFollowUp(null)}
            />
        )}

        {transactionForSticker && (
            <MiniStickerDialog 
                transaction={transactionForSticker}
                open={!!transactionForSticker}
                onOpenChange={() => setTransactionForSticker(null)}
            />
        )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <ChefHat className="h-16 w-16 animate-pulse-slow text-primary/50" />
                <p className="font-headline text-xl tracking-wider text-muted-foreground">
                    Loading Dashboard...
                </p>
            </div>
        </div>
    )
}
