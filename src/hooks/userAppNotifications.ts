
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, query, orderByChild, limitToLast, get } from 'firebase/database';
import { db as firebaseDB } from '@/lib/firebase';
import type { AppNotification } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

const NOTIFICATIONS_LIMIT = 50; // Max notifications to fetch initially/display

export function useAppNotifications() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    const notificationsRef = ref(firebaseDB, `users/${currentUser.uid}/appNotifications`);
    // Order by timestamp and get the latest N notifications.
    // Firebase RTDB sorts ascending, so limitToLast gets the newest if timestamps are positive.
    // For descending server timestamps (negative), use limitToFirst.
    // Assuming positive timestamps (e.g., Date.now() or ServerValue.TIMESTAMP)
    const notificationsQuery = query(notificationsRef, orderByChild('timestamp'), limitToLast(NOTIFICATIONS_LIMIT));

    const unsubscribe = onValue(notificationsQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const newNotifications: AppNotification[] = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key],
          }))
          .sort((a, b) => b.timestamp - a.timestamp); // Sort client-side to ensure descending order

        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
        setError(null);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setError(null); // Or "No notifications found"
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching app notifications:", err);
      setError("Failed to load notifications.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser?.uid || !notificationId) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (notification && notification.read) return; // Already read

    const notificationRef = ref(firebaseDB, `users/${currentUser.uid}/appNotifications/${notificationId}/read`);
    try {
      await update(ref(firebaseDB), { [`users/${currentUser.uid}/appNotifications/${notificationId}/read`]: true });
      // Optimistic update for UI responsiveness handled by onValue, but manual if needed:
      // setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      // setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
      toast({ title: "Error", description: "Could not update notification status.", variant: "destructive" });
    }
  }, [currentUser?.uid, notifications, toast]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!currentUser?.uid || unreadCount === 0) return;

    const updates: Record<string, any> = {};
    let actuallyUpdatedCount = 0;
    notifications.forEach(n => {
      if (!n.read) {
        updates[`users/${currentUser.uid}/appNotifications/${n.id}/read`] = true;
        actuallyUpdatedCount++;
      }
    });

    if (actuallyUpdatedCount === 0) return;

    try {
      await update(ref(firebaseDB), updates);
      toast({ title: "Success", description: "All notifications marked as read." });
      // Optimistic update:
      // setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      toast({ title: "Error", description: "Could not mark all notifications as read.", variant: "destructive" });
    }
  }, [currentUser?.uid, notifications, unreadCount, toast]);
  
  const clearAllNotifications = useCallback(async () => {
    if (!currentUser?.uid) return;

    if (!window.confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      return;
    }

    const notificationsRef = ref(firebaseDB, `users/${currentUser.uid}/appNotifications`);
    try {
      await update(notificationsRef, null); // Setting to null deletes the node
      // UI will update via onValue listener
      toast({ title: "Success", description: "All notifications have been cleared." });
    } catch (err) {
      console.error("Error clearing all notifications:", err);
      toast({ title: "Error", description: "Could not clear notifications.", variant: "destructive" });
    }
  }, [currentUser?.uid, toast]);


  return { notifications, unreadCount, loading, error, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications };
}
