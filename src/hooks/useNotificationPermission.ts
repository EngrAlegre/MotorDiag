
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messagingInstance, db as firebaseDB, auth as firebaseAuth } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { useToast } from './use-toast';

// IMPORTANT: Replace "YOUR_VAPID_PUBLIC_KEY_HERE" with your actual VAPID key from your Firebase project console.
const VAPID_KEY = "BAvhUFbdb7XCE-loO_Xn9XekWZ0wEaeIzgj-yy8RcqR458ZXuSVHBML8KPa9NBOuKEYqWialsc-xBlIaFc2tv3o"; // <<< MAKE SURE THIS IS YOUR REAL KEY

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
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
    setError(null);

    if (typeof window !== 'undefined' && !('Notification' in window)) {
      const msg = "This browser does not support desktop notification.";
      setError(msg);
      toast({ title: "Unsupported Browser", description: msg, variant: "destructive" });
      return false;
    }
    
    if (!messagingInstance) {
      const msg = "Firebase Messaging is not initialized. This might be due to browser incompatibility (e.g., Firefox private browsing, or if service workers are disabled).";
      console.error(msg);
      setError(msg);
      toast({ title: "Notification Setup Error", description: msg, variant: "destructive", duration: 10000 });
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
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      if (currentPermission === 'granted') {
        toast({ title: "Permission Granted", description: "Attempting to retrieve FCM token..." });
      } else if (currentPermission === 'default') {
        const requestedStatus = await Notification.requestPermission();
        setPermission(requestedStatus);
        if (requestedStatus !== 'granted') {
          const msg = `Notification permission was ${requestedStatus}.`;
          setError(msg);
          toast({ title: `Notifications ${requestedStatus === 'denied' ? 'Denied' : 'Dismissed'}`, description: msg, variant: "destructive" });
          return false;
        }
        toast({ title: "Permission Granted!", description: "Attempting to retrieve FCM token..." });
      } else { // denied
        const msg = 'Notification permission has been denied. You may need to reset it in browser settings.';
        setError(msg);
        toast({ title: "Notifications Denied", description: msg, variant: "destructive" });
        return false;
      }
      
      // If permission is granted (either initially or after request)
      console.log('[useNotificationPermission] Attempting to get FCM token with VAPID key:', VAPID_KEY);
      const currentToken = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
      
      if (currentToken) {
        setFcmToken(currentToken);
        console.log('[useNotificationPermission] FCM Token retrieved:', currentToken);
        await saveTokenToDatabase(currentToken);
        return true;
      } else {
        const msg = 'Failed to retrieve FCM token. This can happen if the service worker registration fails or if the VAPID key is incorrect. Please check the browser console for more specific errors like "messaging/failed-service-worker-registration" or VAPID key issues.';
        setError(msg);
        toast({ title: "Token Retrieval Failed", description: msg, variant: "destructive", duration: 15000 });
        console.error(msg);
        return false;
      }
    } catch (err) {
      console.error('[useNotificationPermission] Error during permission request or token retrieval:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Notification Setup Error: ${errorMessage}`);
      toast({ title: "Notification Setup Error", description: errorMessage, variant: "destructive" });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    if (messagingInstance && permission === 'granted') {
      const unsubscribe = onMessage(messagingInstance, (payload) => {
        console.log('[useNotificationPermission] Foreground message received: ', payload);
        toast({
          title: payload.notification?.title || "New Message",
          description: payload.notification?.body || "You have a new message.",
        });
      });
      return () => unsubscribe();
    }
  }, [permission, toast]);

  // Attempt to get token if permission is already granted on load
  useEffect(() => {
    const initTokenWithExistingPermission = async () => {
      if (permission === 'granted' && !fcmToken && messagingInstance) {
        if (VAPID_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE" || !VAPID_KEY) {
          console.warn("[useNotificationPermission] VAPID key not configured. Cannot auto-fetch token on load.");
          return;
        }
        try {
          console.log("[useNotificationPermission] Permission already granted. Attempting to get token on load...");
          const currentToken = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
          if (currentToken) {
            setFcmToken(currentToken);
            console.log('[useNotificationPermission] FCM Token retrieved on load:', currentToken);
            // Optionally save to DB again, or assume it's there if fcmToken state was just unset
            await saveTokenToDatabase(currentToken); 
          } else {
            console.warn('[useNotificationPermission] No token retrieved on load despite granted permission. Service worker might still be an issue.');
          }
        } catch (err) {
          console.error('[useNotificationPermission] Error getting token on load:', err);
        }
      }
    };
    initTokenWithExistingPermission();
  }, [permission, fcmToken, toast]); // Added fcmToken to prevent re-running if token is already set

  return { permission, fcmToken, error, requestPermission };
}
