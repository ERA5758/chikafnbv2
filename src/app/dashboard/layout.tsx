'use client';

import { FloatingStoreIndicator } from "@/components/dashboard/floating-store-indicator";
import { ChikaChatButton } from "@/components/dashboard/chika-chat-button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { DashboardProvider } from "@/contexts/dashboard-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChefHat } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router]);

  // While loading, show a full-screen loader
  if (isLoading || !currentUser) {
    return (
       <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <ChefHat className="h-16 w-16 animate-pulse-slow text-primary/50" />
                <p className="font-headline text-xl tracking-wider text-muted-foreground">
                    Loading Session...
                </p>
            </div>
        </div>
    )
  }

  // If logged in, render the dashboard layout
  return (
    <DashboardProvider>
      <SidebarProvider>
         <TooltipProvider>
            <div className="flex min-h-screen w-full bg-background">
              {children}
              {currentUser.role === 'cashier' && <FloatingStoreIndicator />}
              <ChikaChatButton />
            </div>
         </TooltipProvider>
      </SidebarProvider>
    </DashboardProvider>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
