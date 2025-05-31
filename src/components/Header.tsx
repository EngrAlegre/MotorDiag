
'use client';

import Link from 'next/link';
import { MotoVisionLogo } from '@/components/MotoVisionLogo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, LayoutDashboard, DownloadCloud, Bell, AlertCircle, CheckCircle, Info, Loader2, Trash2 } from 'lucide-react';
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { useAppNotifications } from '../hooks/useAppNotifications'; // Changed to relative path
import type { AppNotification } from '@/lib/types';
import { useRouter } from 'next/navigation';

export function Header() {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { canInstall, handleInstall } = usePWAInstallPrompt();
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAppNotifications();

  const getInitials = (email?: string | null, displayName?: string | null) => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    }
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markNotificationAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'critical': return <AlertCircle className="h-4 w-4 mr-2 text-destructive" />;
      case 'warning': return <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 mr-2 text-blue-500" />;
      default: return <Bell className="h-4 w-4 mr-2 text-muted-foreground" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <MotoVisionLogo className="h-8 w-8" />
          <span className="font-bold text-xl text-foreground">MotoVision</span>
        </Link>
        
        <nav className="flex flex-1 items-center space-x-4 lg:space-x-6">
          {/* Navigation items can go here if needed */}
        </nav>

        <div className="flex items-center space-x-2 md:space-x-4">
          {canInstall && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstall}
              className="hidden md:inline-flex"
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Install App
            </Button>
          )}

          {authLoading && !currentUser ? ( 
            <div className="h-10 w-40 animate-pulse bg-muted rounded-md flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-muted-foreground/20 ml-2"></div>
              <div className="h-8 w-8 rounded-full bg-muted-foreground/20"></div>
            </div>
          ) : currentUser ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                    <span className="sr-only">Open notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 md:w-96" align="end">
                  <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notifications</span>
                    {notifications.length > 0 && unreadCount > 0 && (
                       <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={(e) => { e.stopPropagation(); markAllNotificationsAsRead(); }}>Mark all as read</Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notificationsLoading ? (
                     <DropdownMenuItem disabled className="flex justify-center items-center py-4">
                       <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                     </DropdownMenuItem>
                  ) : notifications.length === 0 ? (
                    <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
                      No new notifications
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`flex flex-col items-start gap-1.5 p-3 cursor-pointer ${!notification.read ? 'bg-accent/50 dark:bg-accent/20' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-center w-full">
                            {getNotificationIcon(notification.type)}
                            <span className={`font-semibold text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notification.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6 truncate w-full" title={notification.body}>{notification.body}</p>
                          <p className="text-xs text-muted-foreground/70 pl-6 self-end">{formatTimeAgo(notification.timestamp)}</p>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  )}
                   <DropdownMenuSeparator />
                   <DropdownMenuItem className="justify-center py-2" onSelect={() => router.push('/notifications')}>
                     <Link href="/notifications" className="text-sm text-primary hover:underline">
                       View all notifications
                     </Link>
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(currentUser.email, currentUser.displayName)}</AvatarFallback>
                    </Avatar>
                     <span className="sr-only">Open user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {currentUser.displayName || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canInstall && (
                    <DropdownMenuItem onClick={handleInstall} className="md:hidden">
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      <span>Install App</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>My Motorcycles</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
