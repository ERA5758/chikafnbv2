

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Armchair, Trash2, Edit, MoreVertical, Check, BookMarked, SprayCan, Loader2, ServerCog, Wallet, QrCode } from 'lucide-react';
import type { Table, TableStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Tables() {
  const { currentUser, activeStore } = useAuth();
  const { dashboardData, isLoading, refreshData } = useDashboard();
  const { tables } = dashboardData || {};

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const { toast } = useToast();
  const router = useRouter();

  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = React.useState(false);
  const [isAddSingleDialogOpen, setIsAddSingleDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isClearTableDialogOpen, setIsClearTableDialogOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const [selectedTable, setSelectedTable] = React.useState<Table | null>(null);
  
  const [tableName, setTableName] = React.useState('');
  const [tableCapacity, setTableCapacity] = React.useState(2);

  const [tablePrefix, setTablePrefix] = React.useState('Meja');
  const [tableCount, setTableCount] = React.useState(10);
  const [bulkCapacity, setBulkCapacity] = React.useState(2);


  const handleBulkGenerateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !tablePrefix || tableCount <= 0 || bulkCapacity <= 0) {
      toast({ variant: 'destructive', title: 'Data tidak valid', description: 'Pastikan semua kolom terisi dengan benar.' });
      return;
    }
    setIsProcessing(true);

    const batch = writeBatch(db);
    const tablesCollectionRef = collection(db, 'stores', activeStore.id, 'tables');

    for (let i = 1; i <= tableCount; i++) {
        const newTableName = `${tablePrefix} ${i}`;
        const newTableRef = doc(tablesCollectionRef);
        batch.set(newTableRef, {
            name: newTableName,
            capacity: bulkCapacity,
            status: 'Tersedia',
            currentOrder: null,
        });
    }

    try {
        await batch.commit();
        toast({ title: `${tableCount} meja berhasil digenerate!` });
        refreshData();
        closeDialogs();
    } catch (error) {
        console.error("Error bulk generating tables:", error);
        toast({ variant: 'destructive', title: 'Gagal generate meja' });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleSaveSingleTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !tableName || tableCapacity <= 0) {
      toast({ variant: 'destructive', title: 'Data tidak valid' });
      return;
    }
    setIsProcessing(true);

    try {
        await addDoc(collection(db, 'stores', activeStore.id, 'tables'), {
            name: tableName,
            capacity: tableCapacity,
            status: 'Tersedia',
            currentOrder: null
        });
        toast({ title: 'Meja baru ditambahkan!' });
        refreshData();
        closeDialogs();
    } catch (error) {
        console.error("Error adding table:", error);
        toast({ variant: 'destructive', title: 'Gagal menambah meja' });
    } finally {
        setIsProcessing(false);
    }
  }


  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !tableName || tableCapacity <= 0 || !selectedTable) {
      toast({ variant: 'destructive', title: 'Data tidak valid' });
      return;
    }
    setIsProcessing(true);

    const tableRef = doc(db, 'stores', activeStore.id, 'tables', selectedTable.id);
    
    try {
        await updateDoc(tableRef, { name: tableName, capacity: tableCapacity });
        toast({ title: 'Meja diperbarui!' });
        refreshData();
        closeDialogs();
    } catch (error) {
      console.error("Error saving table:", error);
      toast({ variant: 'destructive', title: 'Gagal menyimpan meja' });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleDeleteTable = async () => {
    if (!activeStore || !selectedTable) return;
    setIsProcessing(true);
    const tableRef = doc(db, 'stores', activeStore.id, 'tables', selectedTable.id);
    
    try {
      await deleteDoc(tableRef);
      toast({ title: `Meja ${selectedTable.name} dihapus` });
      refreshData();
      closeDialogs();
    } catch (error) {
       console.error("Error deleting table:", error);
       toast({ variant: 'destructive', title: 'Gagal menghapus meja' });
    } finally {
        setIsProcessing(false);
    }
  }

  const handleClearTable = async () => {
    if (!activeStore || !selectedTable) return;
    setIsProcessing(true);
    
    try {
      const tableRef = doc(db, 'stores', activeStore.id, 'tables', selectedTable.id);

      // If the table is virtual, delete it. Otherwise, just update the status.
      if (selectedTable.isVirtual) {
        await deleteDoc(tableRef);
        toast({ title: `Meja virtual ${selectedTable.name} telah dihapus.` });
      } else {
        await updateDoc(tableRef, {
            status: 'Tersedia',
            currentOrder: null
        });
        toast({ title: `Meja ${selectedTable.name} telah dibersihkan.` });
      }

      refreshData();
      closeDialogs();

    } catch (error) {
      console.error("Error clearing or deleting table:", error);
      toast({ variant: 'destructive', title: 'Gagal memproses meja', description: (error as Error).message });
    } finally {
      setIsProcessing(false);
    }
  }
  
  const openEditDialog = (table: Table) => {
    setSelectedTable(table);
    setTableName(table.name);
    setTableCapacity(table.capacity);
    setIsEditDialogOpen(true);
  }
  
  const openDeleteDialog = (table: Table) => {
    setSelectedTable(table);
    setIsDeleteDialogOpen(true);
  }
  
  const openClearDialog = (table: Table) => {
    setSelectedTable(table);
    setIsClearTableDialogOpen(true);
  }

  const handleChangeStatus = async (table: Table, newStatus: TableStatus) => {
    if (!activeStore) return;
    const tableRef = doc(db, 'stores', activeStore.id, 'tables', table.id);
    try {
        await updateDoc(tableRef, { status: newStatus });
        toast({ title: `Status meja ${table.name} diubah menjadi ${newStatus}` });
        refreshData();
    } catch(error) {
        console.error("Error changing status:", error);
        toast({ variant: 'destructive', title: 'Gagal mengubah status' });
    }
  }
  
  const closeDialogs = () => {
    setIsBulkAddDialogOpen(false);
    setIsAddSingleDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsClearTableDialogOpen(false);
    setIsProcessing(false);
    setSelectedTable(null);
    setTableName('');
    setTableCapacity(2);
    setTablePrefix('Meja');
    setTableCount(10);
  }
  
  const handleTableClick = (table: Table) => {
    if (table.status === 'Tersedia' || table.status === 'Dipesan' || table.status === 'Terisi') {
      const params = new URLSearchParams();
      params.set('view', 'pos');
      params.set('tableId', table.id);
      params.set('tableName', table.name);
      router.push(`/dashboard?${params.toString()}`);
    } else if (table.status === 'Menunggu Dibersihkan') {
        openClearDialog(table);
    }
  }

  const getStatusColor = (status: TableStatus) => {
    switch(status) {
        case 'Tersedia':
            return 'bg-green-100/10 border-green-500/30 hover:border-green-500';
        case 'Terisi':
            return 'bg-amber-100/10 border-amber-500/30 hover:border-amber-500';
        case 'Dipesan':
            return 'bg-blue-100/10 border-blue-500/30 hover:border-blue-500';
        case 'Menunggu Dibersihkan':
            return 'bg-slate-100/10 border-slate-500/30 hover:border-slate-500';
        default:
            return '';
    }
  }

  const getBadgeStyle = (status: TableStatus) => {
      switch(status) {
        case 'Tersedia':
            return 'bg-green-500/20 text-green-700 border-green-500/50';
        case 'Terisi':
            return 'bg-amber-500/20 text-amber-800 border-amber-500/50';
        case 'Dipesan':
            return 'bg-blue-500/20 text-blue-800 border-blue-500/50';
        case 'Menunggu Dibersihkan':
            return 'bg-slate-500/20 text-slate-800 border-slate-500/50';
        default:
            return '';
    }
  }
  
  const getPaymentIndicator = (table: Table) => {
      if (table.status !== 'Terisi' || !table.isVirtual || !table.currentOrder?.paymentMethod) {
          return null;
      }

      if (table.currentOrder.paymentMethod === 'QRIS') {
          return <QrCode className="h-4 w-4 text-green-600" />;
      }
      
      if (table.currentOrder.paymentMethod === 'CASHIER') {
          return <Wallet className="h-4 w-4 text-blue-600" />;
      }

      return null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Manajemen Meja
              </CardTitle>
              <CardDescription>
                Lihat status meja, buat pesanan, dan kelola tata letak meja Anda.
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                 <Dialog open={isAddSingleDialogOpen} onOpenChange={(open) => {
                    if (open) setIsAddSingleDialogOpen(true);
                    else closeDialogs();
                }}>
                    <DialogTrigger asChild>
                    <Button size="sm" className="gap-1" variant="outline">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Tambah Meja
                        </span>
                    </Button>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleSaveSingleTable}>
                            <DialogHeader>
                            <DialogTitle className="font-headline tracking-wider">Tambah Meja Baru</DialogTitle>
                            <DialogDescription>
                                Buat satu meja baru dengan nama dan kapasitas spesifik.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name-single" className="text-right">Nama</Label>
                                <Input id="name-single" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3" placeholder="e.g., VIP 1"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="capacity-single" className="text-right">Kapasitas</Label>
                                <Input id="capacity-single" type="number" value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} className="col-span-3" />
                            </div>
                            </div>
                            <DialogFooter>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Simpan Meja
                            </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isBulkAddDialogOpen} onOpenChange={(open) => {
                    if (open) setIsBulkAddDialogOpen(true);
                    else closeDialogs();
                }}>
                    <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                        <ServerCog className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Generate Meja
                        </span>
                    </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleBulkGenerateTables}>
                        <DialogHeader>
                        <DialogTitle className="font-headline tracking-wider">Generate Meja Massal</DialogTitle>
                        <DialogDescription>
                            Buat beberapa meja sekaligus dengan nama dan kapasitas yang sama.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="prefix" className="text-right">Awalan</Label>
                            <Input id="prefix" value={tablePrefix} onChange={(e) => setTablePrefix(e.target.value)} className="col-span-3" placeholder="e.g., Meja"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="count" className="text-right">Jumlah</Label>
                            <Input id="count" type="number" value={tableCount} onChange={(e) => setTableCount(Number(e.target.value))} className="col-span-3" placeholder="e.g., 10"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="capacity-bulk" className="text-right">Kapasitas</Label>
                            <Input id="capacity-bulk" type="number" value={bulkCapacity} onChange={(e) => setBulkCapacity(Number(e.target.value))} className="col-span-3" />
                        </div>
                        </div>
                        <DialogFooter>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Generate Meja
                        </Button>
                        </DialogFooter>
                    </form>
                    </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-32 rounded-lg" />
                ))
            ) : (tables || []).map(table => (
              <Card 
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={cn(
                    "flex flex-col justify-between p-4 cursor-pointer transition-all hover:shadow-lg relative",
                    getStatusColor(table.status)
                )}
              >
                <div className="absolute top-2 right-2">{getPaymentIndicator(table)}</div>
                <CardHeader className="p-0 flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-5 w-5" />
                    <CardTitle className="text-lg">{table.name}</CardTitle>
                  </div>
                   {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Aksi Cepat</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleChangeStatus(table, 'Dipesan')} disabled={table.status !== 'Tersedia'}>
                          <BookMarked className="mr-2 h-4 w-4" /> Tandai Dipesan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openClearDialog(table)}>
                          <SprayCan className="mr-2 h-4 w-4" /> Tandai Siap Digunakan
                        </DropdownMenuItem>
                         <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(table)}>
                          <Edit className="mr-2 h-4 w-4" /> Ubah Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(table)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Hapus Meja
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
                <CardContent className="p-0 mt-2">
                    <Badge variant={'secondary'} className={cn('font-semibold', getBadgeStyle(table.status))}>{table.status}</Badge>
                </CardContent>
                <CardFooter className="p-0 mt-2 text-xs text-muted-foreground">
                    {table.status === 'Terisi' && table.currentOrder ? (
                         <span>Rp {table.currentOrder.totalAmount.toLocaleString('id-ID')}</span>
                    ) : (
                         <span>Kapasitas: {table.capacity} orang</span>
                    )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditTable}>
            <DialogHeader>
              <DialogTitle className="font-headline tracking-wider">Ubah Meja</DialogTitle>
              <DialogDescription>
                Ubah nama atau kapasitas untuk meja {selectedTable?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-edit" className="text-right">Nama</Label>
                <Input id="name-edit" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capacity-edit" className="text-right">Kapasitas</Label>
                <Input id="capacity-edit" type="number" value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus meja 
              <span className="font-bold"> {selectedTable?.name}</span> secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} disabled={isProcessing} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Clear Table Confirmation */}
       <AlertDialog open={isClearTableDialogOpen} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bersihkan Meja?</AlertDialogTitle>
            <AlertDialogDescription>
                Ini akan menandai meja <span className="font-bold">{selectedTable?.name}</span> sebagai &apos;Tersedia&apos; dan siap untuk pelanggan berikutnya.
                {selectedTable?.isVirtual && <span className="block mt-2 font-semibold">Karena ini adalah meja virtual, meja ini juga akan dihapus dari daftar.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearTable} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              <Check className="mr-2 h-4 w-4" /> Ya, Tandai Siap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
