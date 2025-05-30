
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messagingInstance } from '@/lib/firebase'; // Import the initialized messaging instance
import { useToast } from './use-toast';

// IMPORTANT: YOU MUST GENERATE A VAPID KEY IN YOUR FIREBASE CONSOLE AND ADD IT HERE.
// Go to: Firebase Console > Project Settings > Cloud Messaging tab > Web configuration (at the bottom) > "Web Push certificates" section > Generate Key Pair.
// Then, replace "YOUR_VAPID_PUBLIC_KEY_HERE" with the generated key.
const VAPID_KEY = "BAvhUFbdb7XCE-loO_Xn9XekWZ0wEaeIzgj-yy8RcqR458ZXuSVHBML8KPa9NBOuKEYqWialsc-xBlIaFc2tv3o";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial permission status when the hook mounts
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setError(null);
    if (!messagingInstance) {
      setError("Firebase Messaging is not initialized. Ensure it's supported and configured.");
      toast({ title: "Notification Error", description: "Messaging not initialized.", variant: "destructive" });
      return false;
    }
    if (VAPID_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE") {
      setError("VAPID key is not configured. Please update it in useNotificationPermission.ts.");
      toast({ title: "Configuration Error", description: "VAPID key missing.", variant: "destructive" });
      console.error("VAPID key is not configured in useNotificationPermission.ts");
      return false;
    }

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        toast({ title: "Notifications Enabled", description: "You will now receive critical alerts." });
        // Get the FCM token
        const currentToken = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
        if (currentToken) {
          setFcmToken(currentToken);
          console.log('FCM Token:', currentToken);
          // TODO: Send this token to your server to store it against the user.
          // Example: await sendTokenToServer(currentToken);
          toast({ title: "FCM Token", description: "Token obtained (see console). Ready for backend.", duration: 5000 });
          return true;
        } else {
          setError('No registration token available. Request permission to generate one.');
          toast({ title: "Token Error", description: "Could not get FCM token.", variant: "destructive" });
          return false;
        }
      } else if (status === 'denied') {
        setError('Notification permission denied by the user.');
        toast({ title: "Notifications Denied", description: "Permission was denied.", variant: "destructive" });
        return false;
      } else {
        setError('Notification permission request dismissed.');
        toast({ title: "Notifications Dismissed", description: "Permission request was dismissed." });
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission or getting token:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Error: ${errorMessage}`);
      toast({ title: "Notification Error", description: errorMessage, variant: "destructive" });
      return false;
    }
  }, [toast]);

  // Listen for foreground messages
  useEffect(() => {
    if (messagingInstance && permission === 'granted') {
      const unsubscribe = onMessage(messagingInstance, (payload) => {
        console.log('Foreground message received. ', payload);
        // Show a toast or update UI for foreground messages
        toast({
          title: payload.notification?.title || "New Message",
          description: payload.notification?.body || "You have a new message.",
        });
      });
      return () => unsubscribe(); // Unsubscribe when component unmounts or permission changes
    }
  }, [permission, toast]);

  return { permission, fcmToken, error, requestPermission };
}
