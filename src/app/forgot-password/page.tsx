
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, InfoIcon, ChevronLeft } from "lucide-react";
import { MotoVisionLogo } from '@/components/MotoVisionLogo';
import { useToast } from '@/hooks/use-toast';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSuccessMessage("If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).");
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email to reset your password.",
      });
      form.reset(); 
    } catch (err: any) {
      console.error("Forgot password error:", err);
      // Firebase often doesn't reveal if an email doesn't exist for security reasons.
      // So, we show a generic message even on most errors, unless it's a clear client-side issue.
      // However, for development, showing specific errors can be helpful.
      // For production, consider a more generic message on error too.
      if (err.code === 'auth/user-not-found') {
         setSuccessMessage("If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).");
      } else if (err.code === 'auth/invalid-email') {
        setError("The email address is not valid.");
      } else {
        setError(err.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MotoVisionLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Your Password?</CardTitle>
          <CardDescription>Enter your email address and we&apos;ll send you a link to reset your password.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default" className="mb-4 border-green-500/50 dark:border-green-500/40">
              <InfoIcon className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-600 dark:text-green-400">Email Sent</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/login" onClick={() => {setError(null); setSuccessMessage(null);}}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
