
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast'; // Import useToast

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      console.log('PWA: beforeinstallprompt event caught.');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if the app is already running in standalone mode
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      console.log('PWA: App is running in standalone mode.');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPromptEvent) {
      toast({
        title: "Direct Install Not Ready",
        description: "The browser hasn't made a direct install prompt available yet. This could be due to testing in development, browser engagement criteria not being met, or missing PWA requirements (like icons or HTTPS in a production build). Please use your browser's menu (e.g., Chrome's 'Install app' or Safari's 'Share > Add to Home Screen').",
        variant: "default",
        duration: 10000, // Longer duration for more info
      });
      console.log('PWA Install: beforeinstallprompt event not available or already used.');
      return false;
    }
    try {
      await installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA Install: User accepted the prompt.');
        setIsStandalone(true); 
        toast({ title: "App Installed!", description: "MotoVision has been added to your device." });
      } else {
        console.log('PWA Install: User dismissed the prompt.');
        toast({ title: "Install Dismissed", description: "You can install later from the browser menu.", variant: "default" });
      }
      // The prompt can only be used once.
      setInstallPromptEvent(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA Install: Error during prompt:', error);
      toast({ title: "Install Error", description: "Could not show the install prompt.", variant: "destructive"});
      // Clear the event if there was an error trying to use it.
      setInstallPromptEvent(null);
      return false;
    }
  }, [installPromptEvent, toast]);

  return { 
    canInstall: !!installPromptEvent && !isStandalone, 
    handleInstall,
    isStandalone
  };
}
