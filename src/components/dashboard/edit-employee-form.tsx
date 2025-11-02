
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User } from '@/lib/types';
import * as React from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
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
import { sendPasswordResetEmail } from 'firebase/auth';
import { DialogFooter } from '../ui/dialog';

const FormSchema = z.object({
    name: z.string().min(2, {
      message: 'Nama minimal 2 karakter.',
    }),
    role: z.enum(['admin', 'cashier', 'kitchen'], {
        required_error: "Silakan pilih peran."
    }),
  });

type EditEmployeeFormProps = {
  setDialogOpen: (open: boolean) => void;
  employee: User;
  onEmployeeUpdated: () => void;
};

export function EditEmployeeForm({ setDialogOpen, employee, onEmployeeUpdated }: EditEmployeeFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = React.useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: employee.name,
      role: employee.role,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSaving(true);
    const userDocRef = doc(db, 'users', employee.id);

    try {
        await updateDoc(userDocRef, {
            name: data.name,
            role: data.role,
        });
        
        toast({
        title: 'Karyawan Diperbarui!',
        description: `Data untuk ${data.name} telah berhasil diperbarui.`,
        });

        onEmployeeUpdated();
        setDialogOpen(false);
    } catch (error) {
        console.error("Error updating employee:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui',
            description: 'Terjadi kesalahan saat menyimpan perubahan. Silakan coba lagi.'
        });
    } finally {
        setIsSaving(false);
    }
  }

  const handleConfirmStatusChange = async () => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    const userDocRef = doc(db, 'users', employee.id);

    try {
        await updateDoc(userDocRef, { status: newStatus });
        toast({
        title: 'Status Karyawan Diperbarui',
        description: `Status untuk ${employee.name} telah diubah menjadi ${newStatus}.`,
        });
        onEmployeeUpdated();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui Status',
        });
    }
    setIsStatusChangeDialogOpen(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!employee?.email) return;
    try {
      await sendPasswordResetEmail(auth, employee.email);
      toast({
        title: 'Email Reset Password Terkirim',
        description: `Email telah dikirim ke ${employee.email}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim Email',
      });
    } finally {
      setIsResetPasswordDialogOpen(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Budi Perkasa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Peran</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="cashier">Kasir</SelectItem>
                        <SelectItem value="kitchen">Dapur</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
          />
          <DialogFooter className="pt-4 border-t flex-col sm:flex-col sm:space-x-0 gap-2">
            <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
            </Button>
             <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(true)}>Atur Ulang Password</Button>
                <Button 
                    type="button" 
                    variant={employee.status === 'active' ? 'destructive' : 'secondary'} 
                    onClick={() => setIsStatusChangeDialogOpen(true)}
                >
                    {employee.status === 'active' ? (
                        <><XCircle className="mr-2 h-4 w-4" /> Nonaktifkan</>
                    ) : (
                        <><CheckCircle className="mr-2 h-4 w-4" /> Aktifkan</>
                    )}
                </Button>
            </div>
          </DialogFooter>
        </form>
      </Form>
      
      {/* Status Change Dialog */}
      <AlertDialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan {employee?.status === 'active' ? 'menonaktifkan' : 'mengaktifkan'} akun untuk{' '}
              <span className="font-bold">{employee?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusChange}
              className={employee?.status === 'active' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Ya, {employee?.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atur Ulang Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Email pengaturan ulang password akan dikirim ke <span className="font-bold">{employee?.email}</span>.
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
