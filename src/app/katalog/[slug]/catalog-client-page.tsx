'use client';

import * as React from 'react';
import type { Store, Product, ProductCategory, RedemptionOption, Customer, OrderPayload, CartItem, TableOrder, ProductInfo } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { ChefHat, PackageX, MessageCircle, Sparkles, Send, Loader, Gift, ShoppingCart, PlusCircle, MinusCircle, XCircle, LogIn, UserCircle, LogOut, Crown, Coins, Receipt, Percent, HandCoins, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { CatalogAssistantInput, CatalogAssistantOutput } from '@/lib/types';
import { useParams } from 'next/navigation';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { cn } from '@/lib/utils';
import { CustomerAuthDialog } from '@/components/catalog/customer-auth-dialog';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

function groupProducts(products: Product[]): Record<string, Product[]> {
    return products.reduce((acc, product) => {
        const category = product.category || 'Lainnya';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<ProductCategory, Product[]>);
}


type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
};

function CatalogAIChat({ store, productContext, open, onOpenChange, initialQuestion }: { store: Store, productContext: ProductInfo, open: boolean, onOpenChange: (open: boolean) => void, initialQuestion: string | null }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  const sendMessage = React.useCallback(async (question: string) => {
    setIsLoading(true);
    setInput('');
    
    // Add user message immediately if it's not the initial, automated question
    if (question !== initialQuestion) {
       setMessages(prev => [...prev, { sender: 'user', text: question }]);
    }

    try {
        const payload: CatalogAssistantInput = {
            userQuestion: question,
            productContext: productContext,
            storeName: store.name,
        };

        const response = await fetch('/api/catalog-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Gagal mendapatkan jawaban dari AI.');
        }

        const result: CatalogAssistantOutput = await response.json();
        setMessages(prev => [...prev, { sender: 'ai', text: result.answer }]);

    } catch (error) {
        setMessages(prev => [...prev, { sender: 'ai', text: `Maaf, terjadi kesalahan: ${(error as Error).message}` }]);
    } finally {
        setIsLoading(false);
    }
  }, [initialQuestion, productContext, store.name]);

  React.useEffect(() => {
    if (open) {
      const introMessage = { sender: 'ai' as const, text: `Halo! Saya asisten AI dari ${store.name}. Ada yang bisa saya bantu terkait produk ${productContext.name}?` };
      setMessages([introMessage]);
      if (initialQuestion) {
        sendMessage(initialQuestion);
      }
    }
  }, [open, initialQuestion, store.name, productContext.name, sendMessage]);
  
  React.useEffect(() => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTop = viewport.scrollHeight;
        }, 100);
    }
}, [messages]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col h-screen sm:h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-headline tracking-wider flex items-center gap-2">
            <Sparkles className="text-primary"/> Asisten AI - {store.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
                {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-2 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                         {message.sender === 'ai' && (
                            <Avatar className='h-8 w-8'>
                                <AvatarFallback className='bg-primary text-primary-foreground'><Sparkles className='h-5 w-5'/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`rounded-lg p-3 max-w-[80%] ${message.sender === 'ai' ? 'bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                             <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{message.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-2">
                        <Avatar className='h-8 w-8'>
                            <AvatarFallback className='bg-primary text-primary-foreground'><Sparkles className='h-5 w-5'/></AvatarFallback>
                        </Avatar>
                         <div className="rounded-lg p-3 bg-secondary">
                            <Loader className="h-5 w-5 animate-spin" />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <DialogFooter>
            <form onSubmit={handleFormSubmit} className="flex w-full items-center space-x-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tanya tentang produk ini..." disabled={isLoading} />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PromotionSection({ promotions }: { promotions: RedemptionOption[] }) {
    if (promotions.length === 0) return null;

    if (promotions.length === 1) {
        const promo = promotions[0];
        return (
            <section className="mb-8">
                 <Card className="bg-primary/10 border-primary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary"><Gift /> Promo Spesial!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-semibold">{promo.description}</p>
                        <p className="text-muted-foreground">Tukarkan dengan {promo.pointsRequired.toLocaleString('id-ID')} Poin</p>
                    </CardContent>
                </Card>
            </section>
        )
    }

    return (
        <section className="mb-8">
            <Carousel
                plugins={[
                    Autoplay({
                        delay: 5000,
                    }),
                ]}
                className="w-full"
            >
                <CarouselContent>
                    {promotions.map((promo) => (
                        <CarouselItem key={promo.id}>
                            <Card className="bg-primary/10 border-primary/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-primary"><Gift /> Promo Spesial!</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg font-semibold">{promo.description}</p>
                                    <p className="text-muted-foreground">Tukarkan dengan {promo.pointsRequired.toLocaleString('id-ID')} Poin</p>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
            </Carousel>
        </section>
    );
}

function OrderStatusCard({ order, onComplete }: { order: TableOrder, onComplete: () => void }) {
    return (
        <Card className="mb-8 bg-amber-500/10 border-amber-500/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Loader className="animate-spin"/> Pesanan Anda Sedang Diproses
                </CardTitle>
                <CardDescription>Pesanan Anda telah diterima oleh dapur. Mohon tunggu panggilan dari kasir untuk pengambilan.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <h4 className="font-semibold">Rincian Pesanan:</h4>
                     {order.items.map(item => (
                        <div key={item.productId} className="flex justify-between items-start text-sm">
                            <div>
                                <p>{item.quantity}x {item.productName}</p>
                                {item.notes && <p className="text-xs italic text-gray-600 pl-2"> &#x21B3; {item.notes}</p>}
                            </div>
                            <p className="font-mono">Rp {(item.quantity * item.price).toLocaleString('id-ID')}</p>
                        </div>
                    ))}
                    <Separator className="my-2"/>
                    <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>Rp {order.totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" className="text-muted-foreground" onClick={onComplete}>
                    Pesanan Sudah Diterima? Hapus Status
                </Button>
            </CardFooter>
        </Card>
    )
}

function NoteDialog({ open, onOpenChange, note, onSave }: { open: boolean, onOpenChange: (open: boolean) => void, note: string, onSave: (newNote: string) => void }) {
    const [currentNote, setCurrentNote] = React.useState(note);

    React.useEffect(() => {
        if(open) {
            setCurrentNote(note);
        }
    }, [open, note]);

    const handleSave = () => {
        onSave(currentNote);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Catatan</DialogTitle>
                </DialogHeader>
                <Textarea 
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Contoh: ekstra pedas, tanpa gula, dll."
                    rows={4}
                />
                <DialogFooter>
                    <Button onClick={handleSave}>Simpan Catatan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CatalogPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { toast } = useToast();

    const [data, setData] = React.useState<{
        store: Store | null;
        products: Product[];
        promotions: RedemptionOption[];
        error?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [initialChatQuestion, setInitialChatQuestion] = React.useState<string | null>(null);
    const [currentProductContext, setCurrentProductContext] = React.useState<ProductInfo | null>(null);
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [cart, setCart] = React.useState<CartItem[]>([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = React.useState(false);
    const [noteProduct, setNoteProduct] = React.useState<CartItem | null>(null);
    const [isAuthDialogOpen, setIsAuthDialogOpen] = React.useState(false);
    const [loggedInCustomer, setLoggedInCustomer] = React.useState<Customer | null>(null);
    const [activeOrder, setActiveOrder] = React.useState<TableOrder | null>(null);

    const sessionKey = `chika-customer-session-${slug}`;
    const activeOrderKey = `chika-active-order-${slug}`;

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/catalog-data?slug=${slug}`);
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Gagal memuat data katalog.');
                }
                setData(result);
            } catch (err) {
                setData({ store: null, products: [], promotions: [], error: (err as Error).message });
            } finally {
                setIsLoading(false);
            }
        };

        if (slug) {
            fetchData();
        }

        const savedSession = localStorage.getItem(sessionKey);
        if (savedSession) {
            try {
                setLoggedInCustomer(JSON.parse(savedSession));
            } catch {
                localStorage.removeItem(sessionKey);
            }
        }
        const savedOrder = localStorage.getItem(activeOrderKey);
        if (savedOrder) {
            try {
                setActiveOrder(JSON.parse(savedOrder));
            } catch {
                localStorage.removeItem(activeOrderKey);
            }
        }
    }, [slug, sessionKey, activeOrderKey]);

    const { store, products, promotions, error } = data || { store: null, products: [], promotions: [], error: undefined };
    
    const {
        cartSubtotal,
        taxAmount,
        serviceFeeAmount,
        totalAmount
    } = React.useMemo(() => {
        const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
        const taxRate = store?.financialSettings?.taxPercentage ?? 0;
        const serviceRate = store?.financialSettings?.serviceFeePercentage ?? 0;
        
        const tax = subtotal * (taxRate / 100);
        const service = subtotal * (serviceRate / 100);
        const total = subtotal + tax + service;

        return {
            cartSubtotal: subtotal,
            taxAmount: tax,
            serviceFeeAmount: service,
            totalAmount: total
        };
    }, [cart, store]);

    const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

    const handleLoginSuccess = (customer: Customer) => {
        setLoggedInCustomer(customer);
        localStorage.setItem(sessionKey, JSON.stringify(customer));
        setIsAuthDialogOpen(false);
        toast({
            title: `Selamat Datang, ${customer.name}!`,
            description: "Anda berhasil masuk. Sekarang Anda bisa memesan langsung.",
        });
    };
    
    const handleLogout = () => {
        setLoggedInCustomer(null);
        localStorage.removeItem(sessionKey);
        toast({
            title: "Anda telah keluar.",
        });
    };


    const addToCart = (product: Product) => {
        setCart(currentCart => {
            const existingItem = currentCart.find(item => item.productId === product.id);
            if (existingItem) {
                return currentCart.map(item =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...currentCart, { productId: product.id, productName: product.name, price: product.price, quantity: 1, notes: '' }];
        });
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCart(currentCart => currentCart.filter(item => item.productId !== productId));
        } else {
            setCart(currentCart =>
                currentCart.map(item =>
                    item.productId === productId ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };
    
     const handleNoteSave = (productId: string, newNote: string) => {
        setCart(currentCart =>
            currentCart.map(item =>
                item.productId === productId ? { ...item, notes: newNote } : item
            )
        );
    };

    const handleAskAI = (product: Product) => {
        setCurrentProductContext({
            name: product.name,
            description: product.description,
            price: product.price,
        });
        setInitialChatQuestion(`Jelaskan tentang ${product.name}`);
        setIsChatOpen(true);
    };

    const handleCreateOrder = async () => {
        if (!loggedInCustomer || !store || cart.length === 0) return;
        setIsSubmittingOrder(true);
        try {
            const payload: OrderPayload = {
                storeId: store.id,
                customer: loggedInCustomer,
                cart: cart.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    price: item.price,
                    quantity: item.quantity,
                    notes: item.notes,
                })),
                subtotal: cartSubtotal,
                taxAmount: taxAmount,
                serviceFeeAmount: serviceFeeAmount,
                totalAmount: totalAmount,
            };
            const response = await fetch('/api/catalog/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal membuat pesanan.');
            }
            const result = await response.json();
            
            if (result.success && result.table?.currentOrder) {
                const newOrder = result.table.currentOrder as TableOrder;
                setActiveOrder(newOrder);
                localStorage.setItem(activeOrderKey, JSON.stringify(newOrder));
            }
            
            toast({
                title: 'Pesanan Berhasil Dibuat!',
                description: 'Pesanan Anda sedang diproses oleh dapur. Silakan tunggu notifikasi selanjutnya.',
            });
            setCart([]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Membuat Pesanan',
                description: (error as Error).message,
            });
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const handleCompleteOrder = () => {
        setActiveOrder(null);
        localStorage.removeItem(activeOrderKey);
        toast({
            title: "Status Dihapus",
            description: "Terima kasih atas kunjungan Anda!",
        });
    }

    const categories = React.useMemo(() => {
        if (!products) return [];
        const uniqueCategories = new Set(products.map(p => p.category));
        return ['Semua', ...Array.from(uniqueCategories)];
    }, [products]);
    
    const filteredProducts = React.useMemo(() => {
        if (!products) return {};
        if (!selectedCategory || selectedCategory === 'Semua') {
            return groupProducts(products);
        }
        return {
            [selectedCategory]: products.filter(p => p.category === selectedCategory)
        };
    }, [products, selectedCategory]);

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error || !store) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
                <Alert variant="destructive" className="w-auto max-w-md">
                    <ChefHat className="h-4 w-4" />
                    <AlertTitle>Katalog Tidak Tersedia</AlertTitle>
                    <AlertDescription>{error || "Katalog yang Anda cari tidak dapat ditemukan."}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <>
        <Sheet>
        <div className="min-h-screen bg-background">
            <header className="p-4 border-b text-center sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <div className="flex justify-between items-center container mx-auto max-w-4xl">
                     <div className="w-24 text-left">
                        {loggedInCustomer && (
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
                                <LogOut className="mr-2 h-4 w-4" />
                                Keluar
                            </Button>
                        )}
                    </div>
                    <div className='text-center'>
                         <h1 className="text-3xl font-headline tracking-wider font-bold">{store.name}</h1>
                         <p className="text-muted-foreground">{store.location}</p>
                    </div>
                     <div className="w-24 text-right">
                        {loggedInCustomer ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className='text-sm font-semibold flex items-center justify-end gap-2 cursor-pointer' role="button">
                                        <UserCircle className="h-5 w-5" />
                                        <span className='truncate'>{loggedInCustomer.name.split(' ')[0]}</span>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 mr-4 space-y-2">
                                    <h4 className="font-medium leading-none">{loggedInCustomer.name}</h4>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Coins className="h-4 w-4 text-primary" /> Poin Anda: <span className="font-bold text-primary">{loggedInCustomer.loyaltyPoints}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Crown className="h-4 w-4 text-amber-500" /> Tier: <span className="font-bold text-foreground">{loggedInCustomer.memberTier}</span>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setIsAuthDialogOpen(true)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Login
                            </Button>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="container mx-auto max-w-4xl p-4 md:p-8">
                 {activeOrder ? (
                    <OrderStatusCard order={activeOrder} onComplete={handleCompleteOrder} />
                 ) : (
                    promotions && <PromotionSection promotions={promotions} />
                 )}
                 
                {products && products.length > 0 && (
                    <div className="mb-8">
                        <ScrollArea className="w-full whitespace-nowrap">
                             <div className="flex space-x-2 pb-4">
                                {categories.map(category => (
                                    <Button
                                        key={category}
                                        variant={(selectedCategory === category || (selectedCategory === null && category === 'Semua')) ? 'default' : 'outline'}
                                        onClick={() => setSelectedCategory(category === 'Semua' ? null : category)}
                                        className="shrink-0"
                                    >
                                        {category}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                 {products && products.length > 0 ? (
                    <div className="space-y-12">
                        {Object.entries(filteredProducts).map(([category, productsInCategory]) => (
                            <section key={category} id={category.replace(/\s+/g, '-')}>
                                <h2 className="text-2xl font-bold font-headline mb-6 border-b-2 border-primary pb-2">{category}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {productsInCategory.map(product => {
                                        const itemInCart = cart.find(item => item.productId === product.id);
                                        return (
                                        <Card key={product.id} className="overflow-hidden group flex flex-col">
                                            <div className="relative aspect-square">
                                                <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" unoptimized/>
                                                {product.stock === 0 && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                      <div className="text-center text-white">
                                                        <PackageX className="mx-auto h-8 w-8" />
                                                        <p className="font-bold">Stok Habis</p>
                                                      </div>
                                                    </div>
                                                )}
                                            </div>
                                            <CardHeader className="flex-grow">
                                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                                <CardDescription className="text-primary font-bold text-base">
                                                    Rp {product.price.toLocaleString('id-ID')}
                                                </CardDescription>
                                            </CardHeader>
                                            {product.description && (
                                                <CardContent className="flex-grow">
                                                    <p className="text-sm text-muted-foreground">{product.description}</p>
                                                </CardContent>
                                            )}
                                             <CardFooter className="flex-col items-stretch gap-2">
                                                {itemInCart?.notes && (
                                                    <Button variant="outline" size="sm" className="w-full text-xs text-muted-foreground truncate" onClick={() => setNoteProduct(itemInCart)}>
                                                        Catatan: {itemInCart.notes}
                                                    </Button>
                                                )}
                                                <Button variant="secondary" size="sm" className="w-full" onClick={() => handleAskAI(product)}>
                                                    <Sparkles className="mr-2 h-4 w-4" /> Tanya Chika AI
                                                </Button>
                                                {product.stock > 0 ? (
                                                    itemInCart ? (
                                                        <div className="flex items-center gap-2 w-full">
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(product.id, itemInCart.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                                            <span className="font-bold text-center flex-grow">{itemInCart.quantity}</span>
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(product.id, itemInCart.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNoteProduct(itemInCart)}><MessageSquare className="h-4 w-4" /></Button>
                                                        </div>
                                                    ) : (
                                                        <Button variant="outline" className="w-full" onClick={() => addToCart(product)} disabled={!!activeOrder}>Tambah</Button>
                                                    )
                                                ) : (
                                                    <Button variant="outline" className="w-full" disabled>Stok Habis</Button>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    )})}
                                </div>
                            </section>
                        ))}
                    </div>
                 ) : (
                    <p className="text-center text-muted-foreground py-10">Belum ada produk untuk ditampilkan di katalog ini.</p>
                 )}
            </main>
        </div>

        {cartItemCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
            <SheetTrigger asChild>
                <Button size="lg" className="rounded-full shadow-lg h-16 w-auto pl-4 pr-6">
                    <ShoppingCart className="h-7 w-7 mr-3"/>
                    <div className="text-left">
                        <p className="font-bold">{cartItemCount} Item</p>
                        <p className="text-xs">Rp {cartSubtotal.toLocaleString('id-ID')}</p>
                    </div>
                </Button>
            </SheetTrigger>
          </div>
        )}
        
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-headline tracking-wider text-2xl">Pesanan Anda</SheetTitle>
          </SheetHeader>
            {cart.length > 0 ? (
                <>
                <ScrollArea className="flex-grow my-4 pr-4 -mr-6">
                    <div className="space-y-4">
                        {cart.map(item => (
                            <div key={item.productId} className="flex items-start gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold">{item.productName}</p>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground italic pl-2 border-l-2 ml-2 my-1">
                                            &quot;{item.notes}&quot;
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">Rp {item.price.toLocaleString('id-ID')}</p>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                    <span className="font-bold text-center w-4">{item.quantity}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                                <p className="font-mono text-sm w-20 text-right">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setNoteProduct(item)}><MessageSquare className="h-5 w-5" /></Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <SheetFooter className="flex-col space-y-4 pt-4 border-t">
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                        </div>
                         {taxAmount > 0 && store?.financialSettings?.taxPercentage && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3"/> Pajak ({store.financialSettings.taxPercentage}%)</span>
                                <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {serviceFeeAmount > 0 && store?.financialSettings?.serviceFeePercentage && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1"><HandCoins className="h-3 w-3"/> Biaya Layanan ({store.financialSettings.serviceFeePercentage}%)</span>
                                <span>Rp {serviceFeeAmount.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                    </div>
                    <Separator />

                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                    {loggedInCustomer ? (
                         <Button className="w-full" onClick={handleCreateOrder} disabled={isSubmittingOrder}>
                           {isSubmittingOrder ? <Loader className="animate-spin" /> : <Receipt className="mr-2 h-4 w-4"/>}
                           Konfirmasi & Buat Pesanan
                         </Button>
                    ) : (
                         <Alert>
                            <ChefHat className="h-4 w-4" />
                            <AlertTitle>Langkah Berikutnya</AlertTitle>
                            <AlertDescription>
                                Tunjukkan pesanan ini di kasir, atau <Button variant="link" className="p-0 h-auto" onClick={() => {
                                    // Close the sheet before opening the dialog
                                    const closeButton = document.querySelector('button[aria-label="Close"]');
                                    if(closeButton instanceof HTMLElement) closeButton.click();
                                    setIsAuthDialogOpen(true)
                                }}>masuk/daftar</Button> untuk memesan langsung.
                            </AlertDescription>
                        </Alert>
                    )}
                </SheetFooter>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                    <ShoppingCart className="h-16 w-16 mb-4" />
                    <p className="font-semibold">Keranjang Anda Kosong</p>
                    <p className="text-sm">Tambahkan item dari menu untuk memulai.</p>
                </div>
            )}
        </SheetContent>
        </Sheet>
        
        {store && currentProductContext && (
            <CatalogAIChat 
                store={store}
                productContext={currentProductContext}
                open={isChatOpen}
                onOpenChange={setIsChatOpen}
                initialQuestion={initialChatQuestion}
            />
        )}
        
        {store && <CustomerAuthDialog
            open={isAuthDialogOpen}
            onOpenChange={setIsAuthDialogOpen}
            storeId={store.id}
            onLoginSuccess={handleLoginSuccess}
        />}

        {noteProduct && (
            <NoteDialog
                open={!!noteProduct}
                onOpenChange={() => setNoteProduct(null)}
                note={noteProduct.notes || ''}
                onSave={(newNote) => handleNoteSave(noteProduct.productId, newNote)}
            />
        )}
        </>
    );
}