
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
import type { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { cn } from '@/lib/utils';

export default function Employees() {
  const { activeStore } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
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

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };
  
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
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} onClick={() => handleRowClick(user)} className={cn(`cursor-pointer`, user.status === 'inactive' && 'text-muted-foreground')}>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={() => {
          setIsEditDialogOpen(false);
          setSelectedUser(null);
        }}>
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
              setDialogOpen={setIsEditDialogOpen} 
              employee={selectedUser}
              onEmployeeUpdated={handleUserUpdated}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
