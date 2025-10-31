'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { AIHint } from './ai-hint';
import { aiFeatures } from '@/lib/ai-features';

export function Header({
  title,
  view,
}: {
  title: string;
  view: string;
}) {

  const aiFeatureInfo = aiFeatures[view];

  return (
    <header className="sticky top-0 z-10 flex h-auto flex-col gap-4 border-b bg-background px-4 pt-4 sm:px-6">
      <div className="flex h-12 items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="lg:hidden" />
          <h1 data-tour="header-title" className="font-headline text-2xl tracking-wide text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
      </div>
      {aiFeatureInfo && (
         <div className='pb-4'>
            <AIHint 
                title={aiFeatureInfo.title}
                description={aiFeatureInfo.description}
            />
         </div>
      )}
    </header>
  );
}
