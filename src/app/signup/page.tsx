
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { signupSchema } from '@/lib/authSchemas';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { MotoVisionLogo } from '@/components/MotoVisionLogo';
import { UserAgreementDisplay } from '@/components/UserAgreementDisplay';
import { PrivacyPolicyDisplay } from '@/components/PrivacyPolicyDisplay';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SignupPage() {
  const { signup, loading, error, setError } = useAuth();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      agreedToTerms: false,
      agreedToPrivacyPolicy: false,
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    await signup(values);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MotoVisionLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <CardDescription>Join MotoVision to monitor your ride.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Signup Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1 mb-3">
                {/* User Agreement Dialog Trigger */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-sm font-normal block w-full text-left" type="button">
                      View User Agreement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>User Agreement</DialogTitle>
                      <DialogDescription>
                        Please read the terms and conditions carefully.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[50vh] w-full rounded-md border p-3 bg-muted/50">
                      <UserAgreementDisplay />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                {/* Privacy Policy Dialog Trigger */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-sm font-normal block w-full text-left" type="button">
                      View Privacy Policy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Privacy Policy</DialogTitle>
                      <DialogDescription>
                        Please read our privacy practices carefully.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[50vh] w-full rounded-md border p-3 bg-muted/50">
                      <PrivacyPolicyDisplay />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
              
              <FormField
                control={form.control}
                name="agreedToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading}
                        aria-label="Agree to User Agreement"
                        id="agreedToTerms"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="agreedToTerms" className="text-sm font-normal">
                        I have read and agree to the User Agreement.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agreedToPrivacyPolicy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading}
                        aria-label="Agree to Privacy Policy"
                        id="agreedToPrivacyPolicy"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="agreedToPrivacyPolicy" className="text-sm font-normal">
                        I have read and agree to the Privacy Policy.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/login" onClick={() => setError(null)}>Sign In</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
