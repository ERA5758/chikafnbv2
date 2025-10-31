
'use client';

import * as React from 'react';
import { ShepherdTour, ShepherdTourContext, Tour } from 'react-shepherd';
import 'shepherd.js/dist/css/shepherd.css';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { useTheme } from 'next-themes';
import { tourSteps as steps } from '@/lib/tour-steps';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '../ui/button';

// Custom CSS to override Shepherd styles and make it theme-aware
const tourStyles = `
  .shepherd-element {
    background: hsl(var(--card));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
  .shepherd-header {
    background: hsl(var(--card));
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .shepherd-title {
    color: hsl(var(--card-foreground));
    font-weight: 600;
  }
  .shepherd-text {
    color: hsl(var(--muted-foreground));
    padding: 1rem;
  }
  .shepherd-button {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-weight: 500;
    transition: background-color 0.2s;
  }
  .shepherd-button-primary {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  .shepherd-button-primary:hover {
    background: hsl(var(--primary)) / 0.9;
  }
  .shepherd-button-secondary {
    background: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
  }
   .shepherd-button-secondary:hover {
    background: hsl(var(--secondary)) / 0.8;
  }
  .shepherd-arrow::before {
    background: hsl(var(--card));
  }
`;

function TourController() {
  const { runTour, setRunTour } = useDashboard();
  const tour = React.useContext(ShepherdTourContext);

  React.useEffect(() => {
    if (runTour && tour) {
      tour.start();
      setRunTour(false);
    }
  }, [runTour, tour, setRunTour]);
  
  React.useEffect(() => {
    if (tour) {
      const onComplete = () => {
        localStorage.setItem('chika-tour-viewed', 'true');
        setRunTour(false);
      }
      const onCancel = () => {
        localStorage.setItem('chika-tour-viewed', 'true');
        setRunTour(false);
      }

      tour.on('complete', onComplete);
      tour.on('cancel', onCancel);

      return () => {
        tour.off('complete', onComplete);
        tour.off('cancel', onCancel);
      }
    }
  }, [tour, setRunTour]);

  return null;
}

export function OnboardingTour() {
  const { currentUser } = useAuth();
  const { dashboardData, setRunTour } = useDashboard();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  React.useEffect(() => {
    const isNewAdmin =
      currentUser?.role === 'admin' &&
      dashboardData.transactions.length === 0;

    const tourViewed = localStorage.getItem('chika-tour-viewed');

    if (isNewAdmin && !tourViewed) {
      setTimeout(() => setRunTour(true), 1500);
    }
  }, [currentUser, dashboardData.transactions, setRunTour]);

  if (isMobile) {
    return null;
  }

  const tourOptions: Tour.TourOptions = {
    defaultStepOptions: {
      cancelIcon: {
        enabled: true,
      },
      classes: 'shadow-md bg-background border',
      scrollTo: { behavior: 'smooth', block: 'center' },
    },
    useModalOverlay: true,
  };

  return (
    <>
      <style>{tourStyles}</style>
      <ShepherdTour steps={steps} tourOptions={tourOptions}>
        <TourController />
      </ShepherdTour>
    </>
  );
}
