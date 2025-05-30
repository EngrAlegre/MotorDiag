
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MailCheck, AlertTriangle, RefreshCw, LogOutIcon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { MotoVisionLogo } from '@/components/MotoVisionLogo';

export default function VerifyEmailPage() {
  const { currentUser, loading, logout, resendVerificationEmail, reloadUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If user becomes verified and is on this page, redirect them
    if (currentUser && currentUser.emailVerified) {
      toast({ title: "Email Verified!", description: "Redirecting to your dashboard..." });
      router.push('/');
    }
    // If user is somehow logged out while on this page, redirect to login
    if (!loading && !currentUser) {
        router.push('/login');
    }
  }, [currentUser, loading, router, toast]);

  const handleResendEmail = async () => {
    await resendVerificationEmail();
  };

  const handleCheckVerification = async () => {
    await reloadUser(); // This will trigger onAuthStateChanged if status changes
    // The useEffect above will handle redirection if emailVerified becomes true
    // Or, provide immediate feedback if still not verified:
    if (auth.currentUser && !auth.currentUser.emailVerified) {
        toast({
            title: "Still Pending",
            description: "Email not yet verified. Please check your inbox or try resending.",
            variant: "default"
        });
    }
  };

  if (loading && !currentUser) { // Show loading only if there's no user yet (initial load)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <MotoVisionLogo className="h-12 w-12 mb-4 animate-pulse" />
        <p>Loading user status...</p>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MailCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            {currentUser?.email ? 
              `A verification link has been sent to ${currentUser.email}. Please check your inbox (and spam folder).`
              : "Please log in to verify your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser && !currentUser.emailVerified && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  You need to verify your email address to access all features of MotoVision.
                </AlertDescription>
              </Alert>
              <Button onClick={handleResendEmail} className="w-full" variant="outline" disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" /> Resend Verification Email
              </Button>
              <Button onClick={handleCheckVerification} className="w-full" disabled={loading}>
                 I&apos;ve Verified, Check Status
              </Button>
            </>
          )}
           {currentUser && currentUser.emailVerified && (
             <Alert variant="default" className="border-green-500 dark:border-green-400">
                <MailCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-400">Email Already Verified!</AlertTitle>
                <AlertDescription>
                  Your email is verified. Redirecting you shortly...
                </AlertDescription>
              </Alert>
           )}
          <Button onClick={logout} className="w-full" variant="destructive" disabled={loading}>
            <LogOutIcon className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
