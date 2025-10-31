'use client';

import * as React from 'react';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { useTheme } from 'next-themes';
import { tourSteps } from '@/lib/tour-steps';
import { useIsMobile } from '@/hooks/use-mobile';


export function OnboardingTour() {
  const { currentUser } = useAuth();
  const { dashboardData } = useDashboard();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  
  const [runTour, setRunTour] = React.useState(false);

  React.useEffect(() => {
    // Check if the user is a new admin
    const isNewAdmin =
      currentUser?.role === 'admin' &&
      dashboardData.transactions.length === 0;

    // Use a localStorage flag to only show the tour once
    const tourViewed = localStorage.getItem('chika-tour-viewed');
    
    if (isNewAdmin && !tourViewed) {
      // Small delay to ensure the UI is fully rendered
      setTimeout(() => setRunTour(true), 1500);
    }
  }, [currentUser, dashboardData.transactions]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      localStorage.setItem('chika-tour-viewed', 'true');
      setRunTour(false);
    }
  };
  
  if (isMobile) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      run={runTour}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={tourSteps}
      styles={{
        options: {
          arrowColor: theme === 'dark' ? '#1c1917' : '#ffffff',
          backgroundColor: theme === 'dark' ? '#1c1917' : '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          primaryColor: 'hsl(var(--primary))',
          textColor: theme === 'dark' ? '#f8fafc' : '#0a0a0a',
          zIndex: 1000,
        },
        tooltip: {
            borderRadius: 'var(--radius)',
        },
        buttonClose: {
            display: 'none',
        },
      }}
    />
  );
}
