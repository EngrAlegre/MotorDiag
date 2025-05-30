
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function ProfilePage() {
  const { currentUser, logout, loading: authLoading, updateUserDisplayName, profileUpdateLoading, error: authContextError, setError: setAuthContextError } = useAuth();
  const [editableDisplayName, setEditableDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.displayName) {
      setEditableDisplayName(currentUser.displayName);
    } else if (currentUser && !currentUser.displayName) {
      setEditableDisplayName(''); // Set to empty if no display name yet
    }
  }, [currentUser]);

  const handleNameSave = async () => {
    setLocalError(null);
    setAuthContextError(null); // Clear global auth error
    if (!editableDisplayName.trim()) {
      setLocalError("Display name cannot be empty.");
      return;
    }
    if (editableDisplayName === currentUser?.displayName) {
      // No change, maybe provide a small feedback or do nothing
      return;
    }
    await updateUserDisplayName(editableDisplayName.trim());
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4 md:p-8">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">User Profile</CardTitle>
              <CardDescription>View and manage your account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(localError || authContextError) && (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Update Failed</AlertTitle>
                  <AlertDescription>{localError || authContextError}</AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email</Label>
                {authLoading ? (
                  <Skeleton className="h-6 w-48 mt-1" />
                ) : currentUser?.email ? (
                  <p id="email" className="text-lg">{currentUser.email}</p>
                ) : (
                  <p id="email" className="text-lg text-muted-foreground">Not available</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                {authLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter your display name"
                    value={editableDisplayName}
                    onChange={(e) => setEditableDisplayName(e.target.value)}
                    disabled={profileUpdateLoading}
                  />
                )}
              </div>
              <Button 
                onClick={handleNameSave} 
                disabled={profileUpdateLoading || authLoading || editableDisplayName === (currentUser?.displayName || '')}
                className="w-full"
              >
                {profileUpdateLoading ? 'Saving Name...' : 'Save Name'}
              </Button>
            </CardContent>
            <CardFooter className="flex-col space-y-4">
              <Button asChild className="w-full">
                <Link href="/add-motorcycle">
                  Add Motorcycle Profile
                </Link>
              </Button>
              <div className="w-full border-t border-border pt-4"></div> {/* Add a separator */}

              <Button onClick={logout} disabled={authLoading} variant="destructive" className="w-full">
                {authLoading && !profileUpdateLoading ? 'Logging out...' : 'Log Out'}
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
