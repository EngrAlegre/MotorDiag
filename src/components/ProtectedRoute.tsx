
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/app/loading'; // Assuming you have a global loading component

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    if (!currentUser) {
      router.push('/login');
    } else if (!currentUser.emailVerified) {
      // User is logged in but email is not verified
      router.push('/verify-email');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <Loading />;
  }

  // If there's a user and their email is verified, show children
  if (currentUser && currentUser.emailVerified) {
    return <>{children}</>;
  }
  
  // Otherwise, show loading (as redirection is in progress or user is null)
  // This prevents flicker of content before redirection.
  return <Loading />;
}
