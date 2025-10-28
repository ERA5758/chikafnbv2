
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode as QrCodeIcon, Download, ChefHat } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/auth-context';

interface QrCodeDialogProps {
  catalogUrl: string;
  storeName: string;
  children: React.ReactNode;
}

function QRCodeDisplay({ catalogUrl, storeName }: { catalogUrl: string, storeName: string }) {
    const { activeStore } = useAuth();
    
    return (
        <div className="bg-white text-black p-6 rounded-lg w-[320px] font-sans flex flex-col items-center gap-4 text-center">
             <div className="flex items-center gap-2 text-slate-800">
                <ChefHat className="h-8 w-8" />
                <span className="font-headline text-3xl tracking-wider font-bold">{storeName}</span>
            </div>

            <div className="p-2 bg-white rounded-md border-2 border-slate-200">
                 <QRCodeCanvas value={catalogUrl} size={200} />
            </div>

            <div className="flex flex-col items-center">
                 <p className="font-bold text-lg leading-tight">Lihat Menu & Promo</p>
                 <p className="text-slate-600">Scan QR Code di atas</p>
            </div>
        </div>
    )
}

export function QrCodeDialog({ catalogUrl, storeName, children }: QrCodeDialogProps) {
  const printableRef = React.useRef<HTMLDivElement>(null);

  const downloadQRCode = () => {
    if (printableRef.current) {
      html2canvas(printableRef.current, { 
          backgroundColor: null, // Use transparent background for canvas
          scale: 3 // Increase scale for higher resolution
      }).then((canvas) => {
        const pngUrl = canvas.toDataURL('image/png');
        let downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `qr-code-${storeName.toLowerCase().replace(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pratinjau QR Code</DialogTitle>
          <DialogDescription>
            Unduh gambar ini dan letakkan di meja untuk memudahkan pelanggan mengakses katalog digital Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 bg-gray-200 rounded-md">
           <div ref={printableRef}>
             <QRCodeDisplay catalogUrl={catalogUrl} storeName={storeName} />
           </div>
        </div>
        <Button onClick={downloadQRCode}>
          <Download className="mr-2 h-4 w-4" />
          Download Gambar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
