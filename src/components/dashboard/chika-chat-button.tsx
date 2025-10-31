
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { BusinessAnalystChatDialog } from './business-analyst-chat-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function ChikaChatButton() {
  const { currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // This button is only for admins.
  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <div data-tour="chika-chat-button" className="fixed bottom-16 right-4 z-50 non-printable">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className="rounded-full shadow-lg h-14 w-14 p-0 bg-primary hover:bg-primary/90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Sparkles className="h-7 w-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tanya Chika AI</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <BusinessAnalystChatDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
