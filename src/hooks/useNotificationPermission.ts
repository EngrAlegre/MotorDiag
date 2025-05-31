
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
        console.error('FCM Save Error: Attempted to save an empty or null token.');
        toast({ title: "Token Error", description: "Cannot save an invalid token. No token was provided.", variant: "destructive" });
        return;
    }
    const user = firebaseAuth.currentUser;
    if (!user) {
        console.error('FCM Save Error: User not authenticated at the time of saving token.');
        toast({ title: "Authentication Error", description: "User not logged in. Cannot save token.", variant: "destructive" });
        return;
    }

    // If we reach here, user and token are valid
    const tokenPath = `users/${user.uid}/fcmTokens/${token}`;
    try {
      await set(ref(firebaseDB, tokenPath), true); // Using true as a placeholder value
      console.log('FCM Token saved to database for user:', user.uid, 'at path:', tokenPath);
      toast({ title: "Token Synced", description: "FCM token has been successfully saved to your profile.", duration: 4000});
    } catch (dbError) {
      console.error('Failed to save FCM token to database:', dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error.";
      toast({ title: "Token Sync Error", description: `Could not save FCM token to profile: ${errorMessage}`, variant: "destructive" });
    }
  };

  const requestPermission = useCallback(async () => {
    setError(null);
    if (!messagingInstance) {
      setError("Firebase Messaging is not initialized. Ensure it's supported and configured.");
      toast({ title: "Notification Error", description: "Messaging not initialized.", variant: "destructive" });
      return false;
    }
    if (VAPID_KEY === "YOUR_VAPID_PUBLIC_KEY_HERE" || !VAPID_KEY) {
      setError("VAPID key is not configured. Please update it in useNotificationPermission.ts.");
      toast({ title: "Configuration Error", description: "VAPID key missing. Update in code.", variant: "destructive" });
      console.error("VAPID key is not configured in useNotificationPermission.ts");
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
          await saveTokenToDatabase(currentToken); // Save the token
          return true;
        } else {
          setError('No registration token available. Could not retrieve FCM token.');
          toast({ title: "Token Retrieval Failed", description: "Could not get FCM token. Ensure VAPID key is correct and service worker is active. Check browser console for errors.", variant: "destructive", duration: 7000 });
          return false;
        }
      } else if (status === 'denied') {
        setError('Notification permission denied by the user.');
        toast({ title: "Notifications Denied", description: "Permission was denied by the user.", variant: "destructive" });
        return false;
      } else {
        setError('Notification permission request dismissed.');
        toast({ title: "Notifications Dismissed", description: "Permission request was dismissed by the user." });
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission or getting token:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Error: ${errorMessage}`);
      toast({ title: "Notification Setup Error", description: errorMessage, variant: "destructive" });
      return false;
    }
  }, [toast]);

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
  }, [permission, toast]);

  // Effect to re-fetch and save token if permission is already granted on load
  // but token isn't set in state (e.g. after a page refresh)
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
          }
        } catch (err) {
          console.error('Error getting token on init:', err);
        }
      }
    };
    initToken();
  }, [permission, fcmToken, toast]); // Added toast to dependency array

  return { permission, fcmToken, error, requestPermission };
}
