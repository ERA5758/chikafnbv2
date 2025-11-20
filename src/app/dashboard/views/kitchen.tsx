
'use client';

import * as React from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChefHat, Loader, MessageSquare, Printer, CreditCard } from 'lucide-react';
import { doc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types';

type KitchenProps = {
    onFollowUpRequest: (transaction: Transaction) => void;
    onPrintStickerRequest: (transaction: Transaction) => void;
    onPaymentRequest: (transaction: Transaction) => void;
};

export default function Kitchen({ onFollowUpRequest, onPrintStickerRequest, onPaymentRequest }: KitchenProps) {
    const { dashboardData } = useDashboard();
    const { activeStore, currentUser } = useAuth();
    const { transactions } = dashboardData;
    const { toast } = useToast();
    const [completingId, setCompletingId] = React.useState<string | null>(null);

    const activeOrders = React.useMemo(() => {
        return transactions
            .filter(t => t.status === 'Diproses')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [transactions]);
    
    const handleCompleteOrder = async (transactionId: string) => {
        if (!activeStore) return;
        setCompletingId(transactionId);
        
        try {
            const transactionRef = doc(db, 'stores', activeStore.id, 'transactions', transactionId);
            const transactionDoc = await getDoc(transactionRef);

            if (!transactionDoc.exists()) {
                throw new Error("Transaksi tidak ditemukan.");
            }

            const transactionData = transactionDoc.data();
            const batch = writeBatch(db);

            // Update transaction status
            batch.update(transactionRef, { status: 'Selesai' });

            // If it's a table order, update table status
            if (transactionData.tableId) {
                const tableRef = doc(db, 'stores', activeStore.id, 'tables', transactionData.tableId);
                const tableDoc = await getDoc(tableRef);
                if (tableDoc.exists()) {
                    batch.update(tableRef, { status: 'Menunggu Dibersihkan' });
                }
            }

            await batch.commit();

            toast({
                title: 'Pesanan Selesai!',
                description: `Pesanan untuk ${transactionData.customerName} telah ditandai selesai.`,
            });
        } catch (error) {
            console.error("Error completing order from kitchen:", error);
            toast({
                variant: "destructive",
                title: "Gagal Menyelesaikan Pesanan",
                description: (error as Error).message
            });
        } finally {
            setCompletingId(null);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <ScrollArea className="flex-grow">
                <div className="space-y-4 p-1">
                    {activeOrders.length > 0 ? (
                        activeOrders.map(order => (
                            <Card key={order.id} className="flex flex-col">
                                <CardHeader>
                                    <div className='flex justify-between items-start'>
                                        <div>
                                            <CardTitle>{order.customerName}</CardTitle>
                                            <CardDescription>
                                                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: idLocale })}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="secondary" className='bg-amber-500/20 text-amber-800 border-amber-500/50'>{order.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <span className="font-semibold">{item.quantity}x</span> {item.productName}
                                                {item.notes && (
                                                    <p className="text-xs text-muted-foreground italic pl-4">&quot;{item.notes}&quot;</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="grid grid-cols-2 gap-2">
                                     <Button 
                                        variant="outline"
                                        className="w-full" 
                                        onClick={() => onFollowUpRequest(order)}
                                    >
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Follow Up Cerdas
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        className="w-full" 
                                        onClick={() => onPrintStickerRequest(order)}
                                    >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Cetak Stiker
                                    </Button>
                                    {order.paymentMethod === 'Belum Dibayar' && (currentUser?.role === 'admin' || currentUser?.role === 'cashier') && (
                                        <Button
                                            variant="secondary"
                                            className="w-full"
                                            onClick={() => onPaymentRequest(order)}
                                        >
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Proses Pembayaran
                                        </Button>
                                    )}
                                    {(currentUser?.role === 'admin' || currentUser?.role === 'cashier') && (
                                        <Button 
                                            className="w-full" 
                                            onClick={() => handleCompleteOrder(order.id)}
                                            disabled={completingId === order.id}
                                        >
                                            {completingId === order.id ? (
                                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Selesaikan Pesanan
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-96">
                            <ChefHat className="w-16 h-16 mb-4" />
                            <h3 className="text-lg font-semibold">Tidak ada pesanan aktif.</h3>
                            <p>Halaman ini akan diperbarui secara otomatis saat pesanan baru masuk.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
