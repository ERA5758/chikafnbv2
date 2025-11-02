'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RedemptionOption, Transaction, Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, CheckCircle, XCircle, Sparkles, Target, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { AddPromotionForm } from '@/components/dashboard/add-promotion-form';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { AIConfirmationDialog } from '@/components/dashboard/ai-confirmation-dialog';
import { cn } from '@/lib/utils';

interface ProductPerformanceInfo {
  name: string;
  price: number;
  costPrice: number;
  unitsSold: number;
  totalRevenue: number;
}

interface PromotionRecommendationInput {
  businessDescription: string;
  activeStoreName: string;
  currentRedemptionOptions: { description: string, pointsRequired: number, isActive: boolean }[];
  topSellingProducts: ProductPerformanceInfo[];
  worstSellingProducts: ProductPerformanceInfo[];
  unsoldProducts: ProductPerformanceInfo[];
}

interface PromotionRecommendationOutput {
  recommendations: {
    title: string;
    description: string;
    justification: string;
    pointsRequired: number;
    value: number;
  }[];
}

export default function Promotions() {
  const { currentUser, activeStore } = useAuth();
  const { dashboardData, refreshData } = useDashboard();
  const { redemptionOptions, transactions, products, feeSettings } = dashboardData || {};

  const isAdmin = currentUser?.role === 'admin';
  const [recommendations, setRecommendations] = React.useState<PromotionRecommendationOutput | null>(null);
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [selectedPromotion, setSelectedPromotion] = React.useState<RedemptionOption | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleRowClick = (option: RedemptionOption) => {
    setSelectedPromotion(option);
    setIsDetailDialogOpen(true);
  };
  
  const handleDeleteClick = (option: RedemptionOption) => {
    setSelectedPromotion(option);
    setIsDetailDialogOpen(false); // Close detail before opening delete
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPromotion || !activeStore) return;

    try {
      await deleteDoc(doc(db, "stores", activeStore.id, "redemptionOptions", selectedPromotion.id));
      refreshData();
      toast({
        title: 'Promosi Dihapus!',
        description: `Promo "${selectedPromotion.description}" telah berhasil dihapus.`,
      });
    } catch (error) {
      console.error("Error deleting promotion: ", error);
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus promosi."
      });
    }

    setIsDeleteDialogOpen(false);
    setSelectedPromotion(null);
  };

  const toggleStatus = async (id: string) => {
    if (!activeStore || !redemptionOptions) return;
    const option = redemptionOptions.find(o => o.id === id);
    if (!option) return;

    const newStatus = !option.isActive;
    const optionRef = doc(db, 'stores', activeStore.id, 'redemptionOptions', id);

    try {
      await updateDoc(optionRef, { isActive: newStatus });
      refreshData();
      toast({
        title: 'Status Diperbarui',
        description: `Status promosi telah berhasil diubah.`,
      });
    } catch (error) {
      console.error("Error updating promotion status: ", error);
      toast({
        variant: "destructive",
        title: "Gagal memperbarui",
        description: "Terjadi kesalahan saat mengubah status promosi."
      });
    }
  };

  const handleGenerateRecommendations = async (): Promise<PromotionRecommendationOutput> => {
    if (!activeStore || !feeSettings || !transactions || !redemptionOptions || !products) {
        throw new Error('Data yang dibutuhkan untuk membuat rekomendasi tidak lengkap.');
    }

    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    const thisMonthTransactions = transactions.filter(t => isWithinInterval(new Date(t.createdAt), { start: startOfThisMonth, end: endOfThisMonth }));

    const sales: Record<string, { product: Product; unitsSold: number; totalRevenue: number; }> = {};
    products.forEach(p => {
        sales[p.id] = { product: p, unitsSold: 0, totalRevenue: 0 };
    });

    thisMonthTransactions.forEach(t => {
        t.items.forEach(item => {
            if (sales[item.productId]) {
                sales[item.productId].unitsSold += item.quantity;
                sales[item.productId].totalRevenue += item.quantity * item.price;
            }
        });
    });

    const productSalesArray = Object.values(sales);
    const sortedProducts = productSalesArray.sort((a, b) => b.unitsSold - a.unitsSold);
    
    const soldProducts = sortedProducts.filter(p => p.unitsSold > 0);
    const unsoldProducts = sortedProducts.filter(p => p.unitsSold === 0);

    const toPerformanceInfo = (p: {product: Product; unitsSold: number; totalRevenue: number;}): ProductPerformanceInfo => ({
        name: p.product.name,
        price: p.product.price,
        costPrice: p.product.costPrice,
        unitsSold: p.unitsSold,
        totalRevenue: p.totalRevenue
    });
    
    const topProducts = soldProducts.slice(0, 5).map(toPerformanceInfo);
    const worstProducts = soldProducts.length > 5 ? soldProducts.slice(-5).reverse().map(toPerformanceInfo) : [];

    const inputData: PromotionRecommendationInput = {
        businessDescription: activeStore.businessDescription || 'bisnis',
        activeStoreName: activeStore.name,
        currentRedemptionOptions: redemptionOptions.map(o => ({
          description: o.description,
          pointsRequired: o.pointsRequired,
          isActive: o.isActive,
        })),
        topSellingProducts: topProducts,
        worstSellingProducts: worstProducts,
        unsoldProducts: unsoldProducts.map(toPerformanceInfo),
    };

    const response = await fetch('/api/ai/promotion-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal membuat rekomendasi promosi');
    }

    return response.json();
  };

  const handleApplyRecommendation = async (rec: PromotionRecommendationOutput['recommendations'][0]) => {
    if (!activeStore) return;
    try {
      await addDoc(collection(db, "stores", activeStore.id, "redemptionOptions"), {
        description: rec.description,
        pointsRequired: rec.pointsRequired,
        value: rec.value,
        isActive: false,
      });

      refreshData();
      toast({
        title: 'Draf Promo Dibuat!',
        description: `"${rec.title}" telah ditambahkan sebagai promo non-aktif.`,
      });

    } catch (error) {
      console.error("Error applying recommendation:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menerapkan Promo',
        description: 'Terjadi kesalahan saat menyimpan draf promo. Silakan coba lagi.',
      });
    }
  };

  const handlePromotionAdded = () => {
    refreshData();
  };


  return (
    <>
      <div className="grid gap-6">
        {isAdmin && feeSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline tracking-wider">Rekomendasi Promo Chika AI</CardTitle>
              <CardDescription>Dapatkan ide promo loyalitas baru berdasarkan data penjualan terkini.</CardDescription>
            </CardHeader>
            <CardContent>
               <AIConfirmationDialog
                 featureName="Rekomendasi Promo"
                 featureDescription="Chika AI akan menganalisis data penjualan Anda untuk memberikan saran promo baru."
                 feeSettings={feeSettings}
                 onConfirm={handleGenerateRecommendations}
                 onSuccess={(result) => setRecommendations(result)}
               >
                 <Button disabled={!feeSettings}>
                   <Sparkles className="mr-2 h-4 w-4" />
                   Buat Rekomendasi Baru
                 </Button>
               </AIConfirmationDialog>
              {recommendations && (
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendations.recommendations.map((rec, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-accent"><Sparkles className="h-4 w-4" />{rec.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{rec.description}</p>
                        <p className="text-xs text-muted-foreground italic">&quot;{rec.justification}&quot;</p>
                        <div className='flex justify-between text-xs pt-2'>
                          <span className='font-semibold'>{rec.pointsRequired} Poin</span>
                          <span className='font-semibold'>Senilai Rp {rec.value.toLocaleString('id-ID')}</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" onClick={() => handleApplyRecommendation(rec)}>
                          <Target className="mr-2 h-4 w-4" />
                          Terapkan
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-headline tracking-wider">
                  Promo Penukaran Poin
                </CardTitle>
                <CardDescription>
                  {isAdmin
                    ? 'Kelola promo penukaran poin loyalitas yang aktif.'
                    : 'Lihat promo penukaran poin loyalitas yang sedang aktif.'}
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Tambah Promo
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="font-headline tracking-wider">Tambah Promo Baru</DialogTitle>
                      <DialogDescription>
                        Buat opsi penukaran poin loyalitas baru untuk pelanggan.
                      </DialogDescription>
                    </DialogHeader>
                    <AddPromotionForm setDialogOpen={setIsAddDialogOpen} onPromotionAdded={handlePromotionAdded} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Poin Dibutuhkan</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Nilai (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(redemptionOptions || []).map((option) => (
                  <TableRow key={option.id} onClick={() => isAdmin && handleRowClick(option)} className={cn(isAdmin && 'cursor-pointer')}>
                    <TableCell className="font-medium">{option.description}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={option.isActive ? 'default' : 'destructive'}>
                        {option.isActive ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono">
                      {option.pointsRequired.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono">
                      {option.value.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       {isAdmin && selectedPromotion && (
          <Dialog open={isDetailDialogOpen} onOpenChange={() => setIsDetailDialogOpen(false)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>{selectedPromotion.description}</DialogTitle>
                      <DialogDescription>
                          Kelola status atau hapus promo ini.
                      </DialogDescription>
                  </DialogHeader>
                  <div className='py-4 space-y-4'>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                          <span>Status</span>
                          <div className='flex items-center gap-2'>
                              <span className={cn('text-sm font-medium', selectedPromotion.isActive ? 'text-green-600' : 'text-destructive')}>
                                  {selectedPromotion.isActive ? 'Aktif' : 'Non-Aktif'}
                              </span>
                              <Button variant="outline" size="sm" onClick={() => toggleStatus(selectedPromotion.id)}>
                                  {selectedPromotion.isActive ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                  {selectedPromotion.isActive ? 'Non-Aktifkan' : 'Aktifkan'}
                              </Button>
                          </div>
                      </div>
                       <div className="flex items-center justify-between rounded-lg border p-4">
                          <span>Poin Dibutuhkan</span>
                          <span className="font-mono">{selectedPromotion.pointsRequired.toLocaleString('id-ID')}</span>
                      </div>
                       <div className="flex items-center justify-between rounded-lg border p-4">
                          <span>Nilai Promo</span>
                          <span className="font-mono">Rp {selectedPromotion.value.toLocaleString('id-ID')}</span>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button variant="destructive" onClick={() => handleDeleteClick(selectedPromotion)}>
                          <Trash2 className="mr-2 h-4 w-4"/> Hapus Promo
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus promosi secara permanen: <br />
              <span className="font-bold">&quot;{promotionToDelete?.description}&quot;</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
