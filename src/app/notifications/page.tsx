
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import type { AppNotification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info, Bell, Loader2, Inbox, Trash2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
  } = useAppNotifications();
  const router = useRouter();

  const handleNotificationClick = (notification: AppNotification) => {
    markNotificationAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return 'Unknown time';
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: AppNotification['type'], isRead: boolean) => {
    const iconColor = isRead ? "text-muted-foreground/70" : "";
    switch (type) {
      case 'critical': return <AlertCircle className={cn("h-5 w-5 mr-3 shrink-0", isRead ? "text-destructive/70" : "text-destructive", iconColor)} />;
      case 'warning': return <AlertCircle className={cn("h-5 w-5 mr-3 shrink-0", isRead ? "text-yellow-500/70" : "text-yellow-500", iconColor)} />;
      case 'info': return <Info className={cn("h-5 w-5 mr-3 shrink-0", isRead ? "text-blue-500/70" : "text-blue-500", iconColor)} />;
      default: return <Bell className={cn("h-5 w-5 mr-3 shrink-0", iconColor)} />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex-1 p-4 md:p-8">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center">
                <Bell className="mr-3 h-7 w-7 text-primary" /> Notifications
              </h1>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearAllNotifications} disabled={loading}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All
                  </Button>
                )}
                {unreadCount > 0 && (
                  <Button variant="default" size="sm" onClick={markAllNotificationsAsRead} disabled={loading}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark all as read ({unreadCount})
                  </Button>
                )}
              </div>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading notifications...</p>
              </div>
            )}

            {error && !loading && (
              <Card className="text-center p-6 border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center justify-center">
                    <AlertCircle className="mr-2 h-6 w-6" /> Error Loading Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-destructive/90">{error}</p>
                  <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {!loading && !error && notifications.length === 0 && (
              <Card className="text-center p-10">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <Inbox className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl text-muted-foreground">No Notifications Yet</CardTitle>
                  <CardDescription className="text-sm">
                    You&apos;re all caught up! Any new alerts for your motorcycles will appear here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="link">
                        <Link href="/">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to My Motorcycles
                        </Link>
                    </Button>
                </CardContent>
              </Card>
            )}

            {!loading && !error && notifications.length > 0 && (
              <ScrollArea className="h-[calc(100vh-220px)] md:h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        notification.read ? "bg-card/70 opacity-75 hover:opacity-100" : "bg-card border-primary/30 hover:border-primary/50"
                      )}
                    >
                      <CardContent className="p-4 flex items-start">
                        {getNotificationIcon(notification.type, notification.read)}
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <h3 className={cn("font-semibold text-sm md:text-base", notification.read ? "text-muted-foreground" : "text-foreground")}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <Badge variant="default" className="ml-2 text-xs h-5 px-1.5 py-0 leading-none">New</Badge>
                            )}
                          </div>
                          <p className={cn("text-xs md:text-sm mt-1", notification.read ? "text-muted-foreground/80" : "text-muted-foreground")}>
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-2">
                            {formatTimestamp(notification.timestamp)} - {notification.motorcycleName}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
