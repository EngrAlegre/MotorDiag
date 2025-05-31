
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messagingInstance, db as firebaseDB, auth as firebaseAuth } from '@/lib/firebase'; // Import RTDB and Auth
import { ref, set, serverTimestamp } from 'firebase/database'; // Firebase RTDB functions
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

  const saveTokenToDatabase = async (token: string) => {
    if (!token) {
        const msg = 'FCM Save Error: Attempted to save an empty or null token.';
        console.error(msg);
        toast({ title: "Token Error", description: "Cannot save an invalid token. No token was provided.", variant: "destructive" });
        setError(msg);
        return;
    }
    const user = firebaseAuth.currentUser;
    if (!user) {
        const msg = 'FCM Save Error: User not authenticated at the time of saving token.';
        console.error(msg);
        toast({ title: "Authentication Error", description: "User not logged in. Cannot save token.", variant: "destructive" });
        setError(msg);
        return;
    }

    const tokenPath = `users/${user.uid}/fcmTokens/${token}`;
    try {
      await set(ref(firebaseDB, tokenPath), true); 
      console.log('FCM Token saved to database for user:', user.uid, 'at path:', tokenPath);
      toast({ title: "Token Synced Successfully!", description: "FCM token has been saved to your profile, enabling push notifications for this device.", duration: 5000});
    } catch (dbError) {
      console.error('Failed to save FCM token to database:', dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error.";
      toast({ title: "Token Sync Error", description: `Could not save FCM token to profile: ${errorMessage}`, variant: "destructive" });
      setError(`Failed to save token to DB: ${errorMessage}`);
    }
  };

  const requestPermission = useCallback(async () => {
    setError(null); // Clear previous errors

    if (!messagingInstance) {
      const msg = "Firebase Messaging is not initialized or not supported in this browser. Cannot request token or permissions.";
      console.error(msg);
      setError(msg);
      toast({ title: "Notification Setup Error", description: msg, variant: "destructive", duration: 7000 });
      return false;
    }

    if (VAPID_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE" || !VAPID_KEY) {
      const msg = "VAPID key is not configured. Please update it in src/hooks/useNotificationPermission.ts.";
      console.error(msg);
      setError(msg);
      toast({ title: "Configuration Error", description: "VAPID key missing. Update in code.", variant: "destructive" });
      return false;
    }

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        toast({ title: "Notifications Enabled", description: "Attempting to retrieve and save FCM token..." });
        const currentToken = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
        if (currentToken) {
          setFcmToken(currentToken);
          console.log('FCM Token retrieved:', currentToken);
          await saveTokenToDatabase(currentToken); 
          return true;
        } else {
          const msg = 'No registration token available. Could not retrieve FCM token. Ensure VAPID key is correct and service worker is active. Check browser console for errors like "messaging/failed-service-worker-registration".';
          setError(msg);
          toast({ title: "Token Retrieval Failed", description: msg, variant: "destructive", duration: 10000 });
          console.error(msg);
          return false;
        }
      } else if (status === 'denied') {
        const msg = 'Notification permission denied by the user.';
        setError(msg);
        toast({ title: "Notifications Denied", description: "Permission was denied by the user.", variant: "destructive" });
        return false;
      } else { // status === 'default' (dismissed)
        const msg = 'Notification permission request dismissed by the user.';
        setError(msg); // Set error for internal tracking if needed
        toast({ title: "Notifications Dismissed", description: "Permission request was dismissed." });
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission or getting token:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during notification setup.';
      setError(`Notification Setup Error: ${errorMessage}`); // More specific error
      toast({ title: "Notification Setup Error", description: errorMessage, variant: "destructive" });
      return false;
    }
  }, [toast]); // Removed messagingInstance from deps as it's stable after init

  // Listen for foreground messages
  useEffect(() => {
    if (messagingInstance && permission === 'granted') {
      const unsubscribe = onMessage(messagingInstance, (payload) => {
        console.log('Foreground message received. ', payload);
        toast({
          title: payload.notification?.title || "New Message",
          description: payload.notification?.body || "You have a new message.",
        });
      });
      return () => unsubscribe();
    }
  }, [permission, toast]); // Removed messagingInstance from deps

  useEffect(() => {
    const initToken = async () => {
      if (permission === 'granted' && !fcmToken && messagingInstance) {
         if (VAPID_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE" || !VAPID_KEY) {
            console.error("VAPID key is not configured in useNotificationPermission.ts. Cannot fetch token on init.");
            return;
         }
        try {
          console.log("Attempting to get token on init as permission is granted.");
          const currentToken = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
          if (currentToken) {
            setFcmToken(currentToken);
            console.log('FCM Token on init:', currentToken);
            await saveTokenToDatabase(currentToken);
          } else {
            console.log('No token on init, might need to re-request permission or issue with VAPID key/SW.');
            // Do not show error toast here, as requestPermission will handle user interaction
          }
        } catch (err) {
          console.error('Error getting token on init:', err);
          // Do not show error toast here to avoid spamming if there's a persistent issue.
          // The user can manually try via the "FCM Token" button which will show errors.
        }
      }
    };
    initToken();
  }, [permission, fcmToken, toast]); // Removed messagingInstance from deps

  return { permission, fcmToken, error, requestPermission };
}
