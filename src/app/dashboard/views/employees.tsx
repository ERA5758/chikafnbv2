
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import type { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddEmployeeForm } from '@/components/dashboard/add-employee-form';
import { EditEmployeeForm } from '@/components/dashboard/edit-employee-form';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function Employees() {
  const { activeStore } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = React.useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const { toast } = useToast();

  const fetchUsers = React.useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      
      const cashiersQuery = query(usersRef, where("storeId", "==", activeStore.id));
      
      const adminUids = activeStore.adminUids || [];

      const [cashiersSnapshot, adminsSnapshot] = await Promise.all([
        getDocs(cashiersQuery),
        adminUids.length > 0 ? getDocs(query(usersRef, where('__name__', 'in', adminUids))) : Promise.resolve({ docs: [] })
      ]);

      const firestoreCashiers = cashiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      const firestoreAdmins = adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

      const allUsersMap = new Map<string, User>();
      firestoreCashiers.forEach(u => allUsersMap.set(u.id, u));
      firestoreAdmins.forEach(u => allUsersMap.set(u.id, u));
      
      setUsers(Array.from(allUsersMap.values()));

    } catch (error) {
        console.error("Error fetching users:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memuat Karyawan',
            description: 'Terjadi kesalahan saat mengambil data dari database.'
        });
    } finally {
        setIsLoading(false);
    }
  }, [activeStore, toast]);

  React.useEffect(() => {
    if(activeStore) {
        fetchUsers();
    }
  }, [activeStore, fetchUsers]);


  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };
  
  const handleStatusChangeClick = (user: User) => {
    setSelectedUser(user);
    setIsStatusChangeDialogOpen(true);
  }

  const handleResetPasswordClick = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedUser) return;
    
    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    const userDocRef = doc(db, 'users', selectedUser.id);

    try {
        await updateDoc(userDocRef, { status: newStatus });
        
        setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser.id ? {...u, status: newStatus} : u));

        toast({
        title: 'Status Karyawan Diperbarui',
        description: `Status untuk ${selectedUser.name} telah diubah menjadi ${newStatus}.`,
        });

    } catch (error) {
        console.error("Error updating user status:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui Status',
            description: 'Terjadi kesalahan saat mengubah status karyawan. Silakan coba lagi.'
        });
    }

    setIsStatusChangeDialogOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser?.email) {
      toast({ variant: 'destructive', title: 'Email tidak ditemukan' });
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, selectedUser.email);
      toast({
        title: 'Email Reset Password Terkirim',
        description: `Email telah dikirim ke ${selectedUser.email}.`,
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim Email',
        description: 'Terjadi kesalahan. Pastikan email karyawan valid.',
      });
    } finally {
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
    }
  };


  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  }

  const handleUserAdded = () => {
    fetchUsers();
  }
  
  const handleUserUpdated = () => {
      fetchUsers();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Manajemen Karyawan
              </CardTitle>
              <CardDescription>
                Kelola akun dan peran karyawan untuk toko Anda.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Karyawan
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline tracking-wider">
                    Tambah Karyawan Baru
                  </DialogTitle>
                  <DialogDescription>
                    Buat akun pengguna baru untuk seorang karyawan.
                  </DialogDescription>
                </DialogHeader>
                <AddEmployeeForm setDialogOpen={setIsAddDialogOpen} onEmployeeAdded={handleUserAdded} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} onClick={() => handleEditClick(user)} className={`cursor-pointer ${user.status === 'inactive' ? 'text-muted-foreground' : ''}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                     <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'secondary' : 'destructive'}
                        className={user.status === 'active' ? 'border-green-500/50 text-green-700' : ''}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditClick(user)}>Ubah</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPasswordClick(user)}>Atur Ulang Password</DropdownMenuItem>
                          <DropdownMenuItem 
                            className={user.status === 'active' ? 'text-destructive' : 'text-green-600 focus:text-green-600'}
                            onClick={() => handleStatusChangeClick(user)}
                          >
                            {user.status === 'active' ? (
                                <>
                                 <XCircle className="mr-2 h-4 w-4"/> Nonaktifkan
                                </>
                            ) : (
                                <>
                                 <CheckCircle className="mr-2 h-4 w-4"/> Aktifkan
                                </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline tracking-wider">
                Ubah Karyawan
              </DialogTitle>
              <DialogDescription>
                Perbarui detail karyawan untuk {selectedUser.name}.
              </DialogDescription>
            </DialogHeader>
            <EditEmployeeForm 
              setDialogOpen={handleDialogClose} 
              employee={selectedUser}
              onEmployeeUpdated={handleUserUpdated}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan {selectedUser?.status === 'active' ? 'menonaktifkan' : 'mengaktifkan'} akun untuk{' '}
              <span className="font-bold">{selectedUser?.name}</span>. 
              {selectedUser?.status === 'active' 
                ? ' Mereka tidak akan bisa login lagi.' 
                : ' Mereka akan bisa login kembali.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusChange}
              className={selectedUser?.status === 'active' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Ya, {selectedUser?.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atur Ulang Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan mengirimkan email pengaturan ulang password ke{' '}
              <span className="font-bold">{selectedUser?.email}</span>. Karyawan tersebut harus mengikuti instruksi di email untuk membuat password baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmResetPassword}>
              Ya, Kirim Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
