
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Sparkles, LogIn, Megaphone, Eye, EyeOff, MessageSquare, Phone, Building, ChefHat, Wrench, Store } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';


const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
});

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Format email tidak valid." }),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);

  // States for dialogs
  const [isPromoOpen, setIsPromoOpen] = React.useState(false);
  const [isSupportOpen, setIsSupportOpen] = React.useState(false);

  // State for the new app promo form
  const [appType, setAppType] = React.useState<'F&B' | 'Retail'>('F&B');
  const [businessType, setBusinessType] = React.useState('');

  // State for the support form
  const [supportStoreName, setSupportStoreName] = React.useState('');
  const [supportProblem, setSupportProblem] = React.useState('');

  const { toast } = useToast();
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
        email: '',
    },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoginLoading(true);
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch (error) {
        let errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = "Email atau password yang Anda masukkan salah.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Terlalu banyak percobaan login. Silakan coba lagi nanti.";
            }
        }
        toast({ variant: 'destructive', title: 'Login Gagal', description: errorMessage });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
        const email = values.email;
        await sendPasswordResetEmail(auth, email);
        toast({
            title: 'Email Terkirim!',
            description: 'Silakan periksa kotak masuk email Anda untuk instruksi reset password.',
        });
        setIsForgotPasswordOpen(false);
        forgotPasswordForm.reset();
    } catch (error) {
        let errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/user-not-found') {
                errorMessage = "Email yang Anda masukkan tidak terdaftar.";
            }
        }
        toast({
            variant: 'destructive',
            title: 'Gagal Mengirim Email',
            description: errorMessage,
        });
    }
  };

  const whatsappNumber = '6285184000800'; 
  
  // Dynamic WhatsApp URL for the promo dialog form
  const promoWhatsappMessage = `[KONSULTASI APLIKASI BARU - DARI PROMO]\n\nJenis Aplikasi: ${appType}\nJenis Usaha: ${businessType}\n\nSaya tertarik dengan promo pembuatan aplikasi kasir. Mohon informasinya.`;
  const promoWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(promoWhatsappMessage)}`;
  
  // Dynamic WhatsApp URL for the support dialog form
  const supportWhatsappMessage = `[LAPORAN TEKNIS]\n\n- Nama Toko: ${supportStoreName}\n- Kendala: ${supportProblem}`;
  const supportWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(supportWhatsappMessage)}`;


  return (
    <>
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline tracking-wider">SELAMAT DATANG</CardTitle>
              <CardDescription>Masukkan email dan password Anda.</CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)} className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="email">Email</Label>
                                <FormControl>
                                    <Input id="email" type="email" placeholder='admin@tokosaya.com' {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-xs text-primary hover:underline focus:outline-none">
                                        Lupa Password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <FormControl>
                                        <Input id="password" type={showPassword ? 'text' : 'password'} {...field} />
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full gap-2" disabled={isLoginLoading}>
                        {isLoginLoading ? <Loader className="animate-spin" /> : <LogIn />}
                        Masuk
                    </Button>
                </form>
              </Form>
          </CardContent>
           <CardFooter className="text-center text-sm flex-col gap-2">
                <p>Belum punya akun? <Link href="/register" className="font-semibold text-primary hover:underline">Daftar Toko Baru</Link></p>
            </CardFooter>
        </Card>

        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-lg font-headline tracking-wider">BUTUH BANTUAN?</CardTitle>
                <CardDescription>Pilih kebutuhan Anda dan hubungi kami langsung via WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsPromoOpen(true)}>
                    <Sparkles className="h-6 w-6" />
                    <span className="text-center">
                        Konsultasi Pembuatan
                        <br />
                        Aplikasi Baru
                    </span>
                </Button>
                 <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsSupportOpen(true)}>
                    <Wrench className="h-6 w-6" />
                    Kendala Teknis
                </Button>
            </CardContent>
        </Card>

        <Link href="https://chikapos.vercel.app" target="_blank" className="block">
            <Card className="text-center hover:bg-muted">
                <CardHeader>
                    <CardTitle className="text-lg font-headline tracking-wider">APLIKASI POS RETAIL</CardTitle>
                    <CardDescription>Coba aplikasi POS retail kami yang baru!</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center p-4">
                    <Store className="h-12 w-12 text-primary" />
                </CardContent>
            </Card>
        </Link>


      </div>
    </main>

    {/* Promo Dialog */}
    <Dialog open={isPromoOpen} onOpenChange={setIsPromoOpen}>
        <DialogContent>
            <DialogHeader className="text-center items-center">
                <div className="rounded-full bg-primary/20 p-3 w-fit mb-4">
                  <Megaphone className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="font-headline tracking-wider text-2l">PROMO SPESIAL!</DialogTitle>
                <DialogDescription>Dapatkan aplikasi kasir canggih sesuai kebutuhan Anda!</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="text-center space-y-1">
                  <p className="font-semibold text-lg">Biaya hanya Rp 500/transaksi, tanpa iuran bulanan.</p>
                  <p className="text-muted-foreground">Setup awal diskon 50%, hanya <span className="font-bold text-primary">Rp 750.000</span> (dari Rp 1.500.000).</p>
                </div>
                 <div className="space-y-2">
                    <Label>1. Pilih Jenis Aplikasi</Label>
                    <RadioGroup value={appType} onValueChange={(value: 'F&B' | 'Retail') => setAppType(value)} className="grid grid-cols-2 gap-4">
                        <div>
                            <RadioGroupItem value="F&B" id="type-fnb" className="peer sr-only" />
                            <Label htmlFor="type-fnb" className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                <ChefHat className="h-5 w-5"/> F&amp;B
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="Retail" id="type-retail" className="peer sr-only" />
                             <Label htmlFor="type-retail" className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                <Building className="h-5 w-5"/> Retail
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="business-type">2. Apa Jenis Usaha Anda?</Label>
                    <Input id="business-type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Contoh: Kafe, Barbershop, Toko Kelontong"/>
                </div>
            </div>
            <DialogFooter>
                <Button className="w-full" asChild disabled={!businessType}>
                    <Link href={promoWhatsappUrl} target="_blank">
                        <MessageSquare className="mr-2 h-4 w-4"/>
                        Konsultasi via WhatsApp
                    </Link>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Support Dialog */}
    <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline tracking-wider">Laporan Kendala Teknis</DialogTitle>
                <DialogDescription>
                    Isi form di bawah ini agar tim kami bisa membantu Anda lebih cepat.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="support-store-name">Nama Toko</Label>
                    <Input id="support-store-name" value={supportStoreName} onChange={(e) => setSupportStoreName(e.target.value)} placeholder="Toko Anda yang terdaftar"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="support-problem">Jelaskan Kendala Anda</Label>
                    <Textarea id="support-problem" value={supportProblem} onChange={(e) => setSupportProblem(e.target.value)} placeholder="Contoh: Saya tidak bisa mencetak struk dari halaman transaksi."/>
                </div>
            </div>
            <DialogFooter>
                <Button className="w-full" asChild disabled={!supportStoreName || !supportProblem}>
                    <Link href={supportWhatsappUrl} target="_blank">
                        <MessageSquare className="mr-2 h-4 w-4"/>
                        Kirim Laporan via WhatsApp
                    </Link>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    

    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Lupa Password</DialogTitle>
                <DialogDescription>
                    Masukkan email Anda yang terdaftar. Kami akan mengirimkan link untuk mereset password Anda.
                </DialogDescription>
            </DialogHeader>
            <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="grid gap-4 py-4">
                    <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="forgot-email" className="sr-only">Email</Label>
                                <FormControl>
                                    <Input id="forgot-email" placeholder="Email Anda" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit" disabled={forgotPasswordForm.formState.isSubmitting}>
                            {forgotPasswordForm.formState.isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Kirim
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
