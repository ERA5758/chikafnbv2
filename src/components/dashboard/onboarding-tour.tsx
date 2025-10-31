'use client';

import * as React from 'react';
import Joyride, { type Step } from '@p-thomas/react-joyride';
import { useDashboard } from '@/contexts/dashboard-context';
import { useTheme } from 'next-themes';
import { tourSteps as steps } from '@/lib/tour-steps';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/auth-context';

export function OnboardingTour() {
  const { runTour, setRunTour } = useDashboard();
  const { currentUser, dashboardData } = useAuth(); // useAuth to get user info
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  
  // Ref to prevent double-running effect in React 18 Strict Mode
  const effectRan = React.useRef(false);

  React.useEffect(() => {
    // Only run this logic on the client
    if (typeof window !== 'undefined') {
      const isNewAdmin =
        currentUser?.role === 'admin' &&
        dashboardData.transactions.length === 0;

      const tourViewed = localStorage.getItem('chika-tour-viewed');

      // Check if effect has already run in development
      if (process.env.NODE_ENV === 'development' && effectRan.current === true) {
        return;
      }
      
      if (isNewAdmin && !tourViewed) {
        // Delay starting the tour to allow the UI to settle
        const timer = setTimeout(() => {
          setRunTour(true);
        }, 1500);
        return () => clearTimeout(timer);
      }

      // Mark that the effect has run
      return () => {
        effectRan.current = true;
      };
    }
  }, [currentUser, dashboardData.transactions, setRunTour]);


  if (isMobile) {
    return null;
  }
  
  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = ['finished', 'skipped'];
    if (finishedStatuses.includes(status)) {
        localStorage.setItem('chika-tour-viewed', 'true');
        setRunTour(false);
    }
  };

  return (
    <Joyride
      run={runTour}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: 'hsl(var(--card))',
          backgroundColor: 'hsl(var(--card))',
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          zIndex: 1000,
        },
        buttonClose: {
            color: 'hsl(var(--muted-foreground))',
        },
        buttonBack: {
            color: 'hsl(var(--muted-foreground))',
        }
      }}
    />
  );
}