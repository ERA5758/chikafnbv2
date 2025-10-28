
'use client';

import * as React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, Banknote, History, Send, Copy, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { TopUpRequest } from '@/lib/types';
import { getBankAccountSettings, type BankAccountSettings } from '@/lib/bank-account-settings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { auth } from '@/lib/firebase';
import { useDashboard } from '@/contexts/dashboard-context';

type TopUpDialogProps = {
  setDialogOpen: (open: boolean) => void;
};

export function TopUpDialog({ setDialogOpen }: TopUpDialogProps) {
  const { activeStore, currentUser } = useAuth();
  const { dashboardData } = useDashboard();
  const { feeSettings } = dashboardData;
  const { toast } = useToast();
  const [amount, setAmount] = React.useState(50000);
  const [uniqueCode, setUniqueCode] = React.useState(0);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [history, setHistory] = React.useState<TopUpRequest[]>([]);
  const [bankSettings, setBankSettings] = React.useState<BankAccountSettings | null>(null);

  React.useEffect(() => {
    setUniqueCode(Math.floor(Math.random() * 900) + 100);
    getBankAccountSettings().then(setBankSettings);
  }, []);

  React.useEffect(() => {
    if (!activeStore) return;
    const q = query(
      collection(db, 'stores', activeStore.id, 'topUpRequests'),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const historyData: TopUpRequest[] = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() } as TopUpRequest);
      });
      setHistory(historyData);
    });

    return () => unsubscribe();
  }, [activeStore]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !currentUser || !proofFile || amount <= 0 || !feeSettings) {
      toast({
        variant: 'destructive',
        title: 'Data Tidak Lengkap',
        description: 'Pastikan jumlah top-up dan bukti transfer sudah diisi.',
      });
      return;
    }
    setIsLoading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication failed. Please log in again.");
      }
      
      const storage = getStorage();
      const proofRef = ref(storage, `top-up-proofs/${activeStore.id}/${Date.now()}-${proofFile.name}`);
      const uploadResult = await uploadBytes(proofRef, proofFile);
      const proofUrl = await getDownloadURL(uploadResult.ref);

      const totalAmount = amount + uniqueCode;
      const tokensToAdd = amount / feeSettings.tokenValueRp;
      
      const response = await fetch('/api/top-up', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            storeId: activeStore.id,
            storeName: activeStore.name,
            amount: amount,
            tokensToAdd: tokensToAdd,
            uniqueCode: uniqueCode,
            totalAmount: totalAmount,
            proofUrl: proofUrl,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to submit top-up request.');
      }

      toast({
        title: 'Pengajuan Top Up Terkirim!',
        description: `Pengajuan sebesar Rp ${totalAmount.toLocaleString('id-ID')} sedang diproses.`,
      });
      
      setDialogOpen(false);

    } catch (error) {
      console.error('Top-up submission error:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim Pengajuan',
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Nomor Rekening Disalin!" });
    }, (err) => {
        toast({ variant: 'destructive', title: "Gagal menyalin" });
        console.error('Could not copy text: ', err);
    });
  };

  const getStatusBadge = (status: TopUpRequest['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className='bg-yellow-500/20 text-yellow-700 border-yellow-500/50'>Pending</Badge>;
      case 'completed': return <Badge variant="secondary" className='bg-green-500/20 text-green-700 border-green-500/50'>Selesai</Badge>;
      case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }
  
  const topUpOptions = [50000, 100000, 200000, 500000];
  const tokensFromAmount = amount && feeSettings ? amount / feeSettings.tokenValueRp : 0;

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle className="font-headline tracking-wider">Top Up Pradana Token</DialogTitle>
        <DialogDescription>
          Ajukan penambahan saldo token untuk toko Anda. Saldo akan otomatis bertambah setelah pembayaran diverifikasi.
        </DialogDescription>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Banknote />
                Ajukan Top Up Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <p className="text-sm text-muted-foreground mb-2">Silakan transfer ke rekening berikut:</p>
                  {bankSettings ? (
                    <Card className="bg-secondary/50">
                        <CardContent className="p-4 space-y-2">
                           <div className="text-lg font-bold">{bankSettings.bankName}</div>
                           <div className="flex items-center justify-between">
                             <div className="font-mono text-xl text-primary">{bankSettings.accountNumber}</div>
                             <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(bankSettings.accountNumber)}>
                               <Copy className="h-4 w-4"/>
                             </Button>
                           </div>
                           <div className="text-sm">a/n {bankSettings.accountHolder}</div>
                        </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-1">
                      <Skeleton className="h-24 w-full" />
                    </div>
                  )}
               </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Top Up (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="50000"
                  step="50000"
                  disabled={isLoading}
                />
                <div className="flex flex-wrap gap-2 pt-2">
                    {topUpOptions.map(option => (
                        <Button
                            key={option}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(option)}
                        >
                            Rp {option.toLocaleString('id-ID')}
                        </Button>
                    ))}
                </div>
              </div>
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <CardDescription>Anda akan mendapatkan</CardDescription>
                         <div className="flex items-center gap-2 font-bold text-primary">
                            <Coins className="h-4 w-4" />
                            <span>{tokensFromAmount.toLocaleString('id-ID')} Token</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <CardDescription>Total Transfer (termasuk kode unik)</CardDescription>
                         <CardTitle className="text-2xl font-mono text-primary">
                            Rp {(amount + uniqueCode).toLocaleString('id-ID')}
                        </CardTitle>
                    </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label htmlFor="proof">Unggah Bukti Transfer</Label>
                <Input
                  id="proof"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, application/pdf"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !proofFile}>
                {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                Kirim Pengajuan
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <History />
                Riwayat Top Up
            </CardTitle>
             <CardDescription>Daftar 5 pengajuan top up terakhir Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Token</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.slice(0, 5).map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{format(new Date(item.requestedAt), 'dd/MM/yy HH:mm')}</TableCell>
                            <TableCell className="font-mono text-right">{(item.tokensToAdd ?? 'N/A').toLocaleString('id-ID')}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  );
}
