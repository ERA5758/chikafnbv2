
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Clock, FileText, Gift, Map, Sparkles } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { AIConfirmationDialog } from '@/components/dashboard/ai-confirmation-dialog';

export default function AIBusinessPlan() {
  const { activeStore, isLoading: isAuthLoading } = useAuth();
  const { dashboardData } = useDashboard();
  const { feeSettings } = dashboardData;

  const [isEligible, setIsEligible] = React.useState(false);
  const [daysProgress, setDaysProgress] = React.useState(0);
  const [txProgress, setTxProgress] = React.useState(0);
  
  const REQUIRED_DAYS = 30;
  const REQUIRED_TRANSACTIONS = 500;

  React.useEffect(() => {
    if (activeStore) {
      const firstTxDate = activeStore.firstTransactionDate
        ? new Date(activeStore.firstTransactionDate)
        : null;
      
      const daysSinceFirstTx = firstTxDate
        ? differenceInDays(new Date(), firstTxDate)
        : 0;
        
      const transactionCount = activeStore.transactionCounter || 0;

      const daysCheck = daysSinceFirstTx >= REQUIRED_DAYS;
      const txCheck = transactionCount >= REQUIRED_TRANSACTIONS;
      
      setDaysProgress(Math.min(daysSinceFirstTx, REQUIRED_DAYS) || 0);
      setTxProgress(transactionCount);
      
      setIsEligible(daysCheck && txCheck);
    }
  }, [activeStore]);

  const handleGeneratePlan = async () => {
    // In a real app, this would trigger the AI flow
    console.log("Generating AI Business Plan...");
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000));
  };


  if (isAuthLoading || !activeStore || !feeSettings) {
    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <Skeleton className="h-8 w-3/5" />
                <Skeleton className="h-4 w-4/5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-12 w-48 mx-auto" />
            </CardContent>
        </Card>
    );
  }

  const businessPlanFee = feeSettings.aiBusinessPlanFee || 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <Map className="mx-auto h-12 w-12 text-primary mb-4" />
        <CardTitle className="font-headline tracking-wider text-3xl">
          AI Business Plan
        </CardTitle>
        <CardDescription className="text-lg">
          Buka potensi penuh bisnis Anda dengan peta jalan strategis yang dibuat oleh AI.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isEligible ? (
          <div className="space-y-4 text-center">
             <Alert variant="default" className="border-green-500 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 font-semibold">Selamat! Anda Telah Memenuhi Syarat!</AlertTitle>
                <AlertDescription>
                    Toko Anda telah beroperasi lebih dari {REQUIRED_DAYS} hari dan memiliki lebih dari {REQUIRED_TRANSACTIONS} transaksi. Anda siap untuk membuka AI Business Plan.
                </AlertDescription>
            </Alert>
            <p className="text-muted-foreground">
                Dapatkan analisis mendalam, proyeksi pertumbuhan, dan rekomendasi yang dipersonalisasi untuk membawa bisnis Anda ke level berikutnya.
            </p>
             <AIConfirmationDialog
                featureName="AI Business Plan"
                featureDescription="Chika AI akan melakukan analisis mendalam terhadap data historis toko Anda untuk membuat rencana bisnis yang komprehensif."
                feeSettings={feeSettings}
                feeToDeduct={businessPlanFee}
                onConfirm={handleGeneratePlan}
                onSuccess={(result) => {
                    // In a real app, you would navigate to the plan page or display it here
                    console.log("Business plan generated:", result);
                }}
             >
                <Button size="lg" className="w-full sm:w-auto" disabled={!feeSettings || businessPlanFee <= 0}>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Beli Rencana AI ({businessPlanFee} Token)
                </Button>
            </AIConfirmationDialog>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert>
                <Gift className="h-4 w-4" />
                <AlertTitle>Buka Fitur Premium Anda!</AlertTitle>
                <AlertDescription>
                    AI Business Plan adalah fitur eksklusif untuk toko yang aktif. Penuhi persyaratan di bawah ini untuk mendapatkan akses.
                </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="days-progress" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Masa Operasional
                  </Label>
                  <span className="text-sm font-medium">
                    {daysProgress} / {REQUIRED_DAYS} hari
                  </span>
                </div>
                <Progress id="days-progress" value={(daysProgress / REQUIRED_DAYS) * 100} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="tx-progress" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Jumlah Transaksi
                  </Label>
                  <span className="text-sm font-medium">
                    {txProgress} / {REQUIRED_TRANSACTIONS} transaksi
                  </span>
                </div>
                <Progress id="tx-progress" value={(txProgress / REQUIRED_TRANSACTIONS) * 100} />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground pt-2">
                Terus lakukan transaksi untuk membuka fitur ini.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
