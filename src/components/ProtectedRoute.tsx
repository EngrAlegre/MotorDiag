
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
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    // This will be brief as the useEffect above will redirect.
    // You could show a specific "Redirecting to login..." message here.
    return <Loading />; 
  }

  return <>{children}</>;
}
