
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { CheckCircle, ExternalLink, QrCode as QrCodeIcon, Star, Calendar, AlertCircle, Sparkles as SparklesIcon } from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from '@/components/ui/skeleton';
import { AIConfirmationDialog } from '@/components/dashboard/ai-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QrCodeDialog } from '@/components/dashboard/QrCodeDialog';
import html2canvas from 'html2canvas';

const features = [
  "Tampilan menu modern & profesional yang bisa diakses dari mana saja.",
  "Integrasi QR Code untuk akses cepat dari meja pelanggan.",
  "Asisten AI untuk menjawab pertanyaan dan memberikan rekomendasi menu.",
  "Update menu dan harga secara real-time, tanpa perlu cetak ulang.",
  "Meningkatkan pengalaman pelanggan dan citra modern bisnis Anda.",
];

export default function CatalogSettings() {
  const { activeStore, refreshActiveStore, updateActiveStore } = useAuth();
  const { dashboardData, isLoading } = useDashboard();
  const { feeSettings } = dashboardData;
  const { toast } = useToast();

  // Self-healing logic for missing catalogSlug
  React.useEffect(() => {
    if (activeStore && !activeStore.catalogSlug) {
      console.log("Toko lama terdeteksi, membuat catalogSlug...");
      const generateAndSaveSlug = async () => {
        try {
          const newSlug = activeStore.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '') + '-' + Math.random().toString(36).substring(2, 7);

          const storeRef = doc(db, 'stores', activeStore.id);
          const slugRef = doc(db, 'catalogSlugs', newSlug);

          await Promise.all([
            updateDoc(storeRef, { catalogSlug: newSlug }),
            setDoc(slugRef, { storeId: activeStore.id })
          ]);
          
          toast({
            title: "Pembaruan Toko",
            description: "URL katalog unik telah dibuat untuk toko Anda.",
          });
          
          refreshActiveStore();

        } catch (error) {
            console.error("Gagal membuat dan menyimpan catalogSlug:", error);
            toast({
                variant: 'destructive',
                title: 'Gagal Memperbarui Toko',
                description: 'Tidak dapat membuat URL katalog unik saat ini.',
            });
        }
      };
      generateAndSaveSlug();
    }
  }, [activeStore, refreshActiveStore, toast]);


  const handleOpenCatalog = () => {
    if (activeStore?.catalogSlug) {
      window.open(`/katalog/${activeStore.catalogSlug}`, '_blank');
    }
  };

  const handleSubscription = async (planId: number | 'trial') => {
    try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (!idToken || !activeStore) {
            throw new Error("Sesi tidak valid atau toko tidak aktif.");
        }
        
        const response = await fetch('/api/store/subscribe-catalog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ storeId: activeStore.id, planId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Gagal memproses langganan.`);
        }
        
        const result = await response.json();

        toast({
            title: 'Langganan Berhasil!',
            description: `Katalog Digital Premium Anda telah diperpanjang.`,
        });

        // Update context immediately with the new expiry date from the API
        if (result.newExpiryDate) {
            updateActiveStore({ 
                ...activeStore, 
                catalogSubscriptionExpiry: result.newExpiryDate,
                pradanaTokenBalance: result.newBalance,
                hasUsedCatalogTrial: planId === 'trial' ? true : activeStore.hasUsedCatalogTrial,
            });
        } else {
            // Fallback to refresh if API response is not as expected
            refreshActiveStore(); 
        }

    } catch (error) {
        console.error(`Subscription error:`, error);
        throw error; // Re-throw for AIConfirmationDialog
    }
  };


  if (isLoading || !feeSettings || !activeStore) {
      return (
          <div className="grid gap-6">
              <Skeleton className="h-64 w-full" />
              <div className="grid md:grid-cols-3 gap-6">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
              </div>
          </div>
      )
  }
  
  const originalMonthly = feeSettings.catalogMonthlyFee * 6;
  const sixMonthSaving = originalMonthly > 0 ? originalMonthly - feeSettings.catalogSixMonthFee : 0;

  const originalYearly = feeSettings.catalogMonthlyFee * 12;
  const yearlySaving = originalYearly > 0 ? originalYearly - feeSettings.catalogYearlyFee : 0;

  const expiryDate = activeStore?.catalogSubscriptionExpiry ? new Date(activeStore.catalogSubscriptionExpiry) : null;
  const isSubscriptionActive = expiryDate ? expiryDate > new Date() : false;
  const hasUsedTrial = activeStore?.hasUsedCatalogTrial ?? false;
  const catalogUrl = typeof window !== 'undefined' && activeStore.catalogSlug 
    ? `${window.location.origin}/katalog/${activeStore.catalogSlug}` 
    : '';


  return (
    <div className="grid gap-6">
        {isSubscriptionActive && expiryDate && (
            <Alert className="border-green-500 bg-green-500/10 text-green-700">
                <Calendar className="h-4 w-4" />
                <AlertTitle className="font-semibold">Langganan Katalog Premium Aktif</AlertTitle>
                <AlertDescription>
                    Fitur katalog digital Anda aktif hingga {format(expiryDate, "d MMMM yyyy, HH:mm", { locale: idLocale })}.
                </AlertDescription>
            </Alert>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="font-headline tracking-wider">Katalog Digital Publik</CardTitle>
                <CardDescription>
                    Tingkatkan pengalaman pelanggan dengan menu digital modern, interaktif, dan cerdas yang didukung oleh Chika AI.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Keunggulan & Manfaat</h3>
                    <ul className="space-y-3">
                        {features.map((feature, index) => (
                             <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-secondary/50 p-6 text-center">
                    <QrCodeIcon className="h-20 w-20 text-muted-foreground mb-4" />
                    <h4 className="font-semibold text-lg">Akses QR Code</h4>
                    <p className="text-muted-foreground text-sm">
                        Pelanggan dapat memindai QR Code untuk langsung membuka katalog Anda.
                    </p>
                    <div className="flex flex-col items-stretch w-full max-w-xs gap-2 mt-4">
                        <QrCodeDialog catalogUrl={catalogUrl} storeName={activeStore.name}>
                            <Button disabled={!isSubscriptionActive} className="w-full">
                                <QrCodeIcon className="mr-2 h-4 w-4" />
                                Tampilkan QR Code
                            </Button>
                        </QrCodeDialog>
                        <Button variant="outline" onClick={handleOpenCatalog} disabled={!isSubscriptionActive} className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Pratinjau
                        </Button>
                    </div>
                    {!isSubscriptionActive && (
                        <p className="text-xs text-muted-foreground mt-2">Aktifkan langganan untuk memakai fitur ini.</p>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card>
             <CardHeader className="text-center">
                <CardTitle className="font-headline tracking-wider">Paket Langganan</CardTitle>
                <CardDescription>
                    Pilih paket yang paling sesuai dengan kebutuhan bisnis Anda untuk mengaktifkan fitur ini.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-stretch justify-center gap-6">
                {!hasUsedTrial && (
                    <Card className='flex-1'>
                        <CardHeader className="text-center">
                            <CardTitle className="text-xl flex items-center justify-center gap-2 text-accent"><SparklesIcon /> Coba Dulu</CardTitle>
                            <CardDescription>Penawaran Pertama Kali</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-4xl font-bold">{feeSettings.catalogTrialFee} <span className="text-base font-normal text-muted-foreground">Token/bln</span></p>
                        </CardContent>
                        <CardFooter>
                            <AIConfirmationDialog
                            featureName="Paket Coba Pertama"
                            featureDescription={`Anda akan mengaktifkan langganan Katalog Digital selama 1 bulan dengan harga spesial.`}
                            feeSettings={feeSettings}
                            feeToDeduct={feeSettings.catalogTrialFee}
                            onConfirm={() => handleSubscription('trial')}
                            skipFeeDeduction={false}
                            >
                                <Button className="w-full" variant="secondary">Pilih Paket</Button>
                            </AIConfirmationDialog>
                        </CardFooter>
                    </Card>
                )}
                <Card className='flex-1'>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Bulanan</CardTitle>
                        <CardDescription>Fleksibel & Terjangkau</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-4xl font-bold">{feeSettings.catalogMonthlyFee} <span className="text-base font-normal text-muted-foreground">Token/bulan</span></p>
                    </CardContent>
                    <CardFooter>
                        <AIConfirmationDialog
                          featureName="Langganan Bulanan"
                          featureDescription={`Anda akan mengaktifkan atau memperpanjang langganan Katalog Digital Premium selama 1 bulan.`}
                          feeSettings={feeSettings}
                          feeToDeduct={feeSettings.catalogMonthlyFee}
                          onConfirm={() => handleSubscription(1)}
                          skipFeeDeduction={false}
                        >
                            <Button className="w-full" variant="outline">Pilih Paket</Button>
                        </AIConfirmationDialog>
                    </CardFooter>
                </Card>

                 <Card className="border-primary shadow-lg relative flex-1">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            <Star className="h-3 w-3" /> Paling Populer
                        </div>
                    </div>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Setengah Tahun</CardTitle>
                        <CardDescription>Pilihan Terbaik</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-4xl font-bold">{feeSettings.catalogSixMonthFee} <span className="text-base font-normal text-muted-foreground">Token/6 bulan</span></p>
                        {sixMonthSaving > 0 && (
                            <p className="text-sm text-muted-foreground">Hemat {sixMonthSaving} Token!</p>
                        )}
                    </CardContent>
                    <CardFooter>
                         <AIConfirmationDialog
                          featureName="Langganan 6 Bulan"
                          featureDescription={`Anda akan mengaktifkan atau memperpanjang langganan Katalog Digital Premium selama 6 bulan.`}
                          feeSettings={feeSettings}
                          feeToDeduct={feeSettings.catalogSixMonthFee}
                          onConfirm={() => handleSubscription(6)}
                          skipFeeDeduction={false}
                        >
                           <Button className="w-full">Pilih Paket</Button>
                        </AIConfirmationDialog>
                    </CardFooter>
                </Card>

                 <Card className='flex-1'>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Tahunan</CardTitle>
                        <CardDescription>Nilai Paling Hemat</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-4xl font-bold">{feeSettings.catalogYearlyFee} <span className="text-base font-normal text-muted-foreground">Token/tahun</span></p>
                         {yearlySaving > 0 && (
                            <p className="text-sm text-muted-foreground">Hemat {yearlySaving} Token!</p>
                        )}
                    </CardContent>
                    <CardFooter>
                         <AIConfirmationDialog
                          featureName="Langganan Tahunan"
                          featureDescription={`Anda akan mengaktifkan atau memperpanjang langganan Katalog Digital Premium selama 1 tahun.`}
                          feeSettings={feeSettings}
                          feeToDeduct={feeSettings.catalogYearlyFee}
                          onConfirm={() => handleSubscription(12)}
                          skipFeeDeduction={false}
                        >
                            <Button className="w-full" variant="outline">Pilih Paket</Button>
                        </AIConfirmationDialog>
                    </CardFooter>
                </Card>
            </CardContent>
        </Card>
    </div>
  );
}
