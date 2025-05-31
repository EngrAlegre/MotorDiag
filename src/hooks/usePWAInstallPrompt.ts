
'use client';

import { useState, useEffect, useCallback } from 'react';

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

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if the app is already running in standalone mode
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPromptEvent) {
      return false;
    }
    await installPromptEvent.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation prompt');
      setIsStandalone(true); // Assume installed, or re-check display mode
    } else {
      console.log('User dismissed the PWA installation prompt');
    }
    // We can only use the prompt once, clear it.
    setInstallPromptEvent(null);
    return outcome === 'accepted';
  }, [installPromptEvent]);

  return { 
    canInstall: !!installPromptEvent && !isStandalone, 
    handleInstall,
    isStandalone
  };
}
