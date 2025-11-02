'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Customer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { AddCustomerForm } from '@/components/dashboard/add-customer-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Customers() {
  const { activeStore, currentUser } = useAuth();
  const { dashboardData, isLoading, refreshData } = useDashboard();
  const customers = dashboardData?.customers || [];
  const isAdmin = currentUser?.role === 'admin';

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const { toast } = useToast();

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
  };
  
  const handleCustomerAdded = () => {
    refreshData();
  }

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(null); // Close detail dialog
    setCustomerToDelete(customer);
  };
  
  const handleConfirmDelete = async () => {
    if (!customerToDelete || !activeStore?.id) return;

    try {
        await deleteDoc(doc(db, 'stores', activeStore.id, 'customers', customerToDelete.id));
        toast({
            title: 'Pelanggan Dihapus',
            description: `Pelanggan "${customerToDelete.name}" telah dihapus.`,
        });
        refreshData();
    } catch {
        toast({
            variant: 'destructive',
            title: 'Gagal Menghapus',
            description: 'Terjadi kesalahan saat menghapus pelanggan.',
        });
    } finally {
        setCustomerToDelete(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Pelanggan
              </CardTitle>
              <CardDescription>
                Kelola data pelanggan dan lihat status loyalitas mereka untuk toko {activeStore?.name}.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Pelanggan
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline tracking-wider">
                    Daftar Pelanggan Baru
                  </DialogTitle>
                  <DialogDescription>
                    Tambahkan pelanggan baru dan Dapatkan Fitur Menarik Chika AI
                  </DialogDescription>
                </DialogHeader>
                <AddCustomerForm setDialogOpen={setIsAddDialogOpen} onCustomerAdded={handleCustomerAdded} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="hidden md:table-cell">Telepon</TableHead>
                <TableHead className="hidden md:table-cell">Tier</TableHead>
                <TableHead className="text-right">Poin Loyalitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                customers.map((customer) => (
                    <TableRow key={customer.id} onClick={() => handleRowClick(customer)} className={cn(isAdmin && 'cursor-pointer')}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/50">
                            <AvatarImage
                            src={customer.avatarUrl}
                            alt={customer.name}
                            />
                            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{customer.name}</div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{customer.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <Badge
                        variant={
                            customer.memberTier === 'Gold'
                            ? 'default'
                            : 'secondary'
                        }
                        >
                        {customer.memberTier}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {customer.loyaltyPoints.toLocaleString('id-ID')}
                    </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">{selectedCustomer.name}</DialogTitle>
                    <DialogDescription>
                        ID Pelanggan: {selectedCustomer.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-4 py-4">
                    <Avatar className="h-24 w-24 border-4 border-primary/50">
                        <AvatarImage src={selectedCustomer.avatarUrl} alt={selectedCustomer.name} />
                        <AvatarFallback>{selectedCustomer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 text-sm">
                        <div><strong>Telepon:</strong> {selectedCustomer.phone}</div>
                        <div className="flex items-center gap-1"><strong>Tier:</strong> <Badge variant={selectedCustomer.memberTier === 'Gold' ? 'default' : 'secondary'}>{selectedCustomer.memberTier}</Badge></div>
                        <div><strong>Poin:</strong> {selectedCustomer.loyaltyPoints.toLocaleString('id-ID')}</div>
                        <div><strong>Bergabung:</strong> {new Date(selectedCustomer.joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        {new Date(selectedCustomer.birthDate).getFullYear() > 1970 && (
                             <div><strong>Ulang Tahun:</strong> {new Date(selectedCustomer.birthDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long' })}</div>
                        )}
                    </div>
                </div>
                 <DialogFooter className='border-t pt-4'>
                    <div className='flex w-full justify-between'>
                        <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Tutup</Button>
                        {isAdmin && (
                            <div className='flex gap-2'>
                                <Button variant="outline" disabled><Edit className="mr-2 h-4 w-4"/> Ubah</Button>
                                <Button variant="destructive" onClick={() => handleDeleteClick(selectedCustomer)}><Trash2 className="mr-2 h-4 w-4"/> Hapus</Button>
                            </div>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
       <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pelanggan
              <span className="font-bold"> {customerToDelete?.name} </span> secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
