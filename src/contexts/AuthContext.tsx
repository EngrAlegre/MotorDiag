
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, AuthError } from 'firebase/auth';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification // Added
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { z } from 'zod';
import type { loginSchema, signupSchema } from '@/lib/authSchemas';
import { useToast } from "@/hooks/use-toast";


type AuthContextType = {
  currentUser: User | null;
  loading: boolean; // General auth loading (login, signup, logout, initial state)
  profileUpdateLoading: boolean; // Specific loading for profile updates
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  login: (values: z.infer<typeof loginSchema>) => Promise<void>;
  signup: (values: z.infer<typeof signupSchema>) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDisplayName: (displayName: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>; // Added
  reloadUser: () => Promise<void>; // Added
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user && !userCredential.user.emailVerified) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before logging in. Redirecting you now...",
          variant: "destructive",
        });
        router.push('/verify-email');
      } else {
        router.push('/');
      }
    } catch (err) {
      const authError = err as AuthError;
      console.error("Login error:", authError);
      setError(authError.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (values: z.infer<typeof signupSchema>) => {
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
        toast({
          title: "Signup Successful!",
          description: `A verification email has been sent to ${values.email}. Please check your inbox.`,
        });
        // Keep user logged in but unverified, redirect to verify page
        router.push('/verify-email');
      }
    } catch (err) {
      const authError = err as AuthError;
      console.error("Signup error:", authError);
      setError(authError.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      const authError = err as AuthError;
      console.error("Logout error:", authError);
      setError(authError.message || 'Failed to logout.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserDisplayName = useCallback(async (displayName: string): Promise<boolean> => {
    if (!auth.currentUser) {
      setError("No user logged in to update.");
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return false;
    }
    setProfileUpdateLoading(true);
    setError(null);
    try {
      await updateProfile(auth.currentUser, { displayName });
      setCurrentUser(prevUser => prevUser ? { ...prevUser, displayName } : null);
      toast({ title: "Success", description: "Display name updated successfully." });
      return true;
    } catch (err) {
      const authError = err as AuthError;
      console.error("Profile update error:", authError);
      setError(authError.message || 'Failed to update display name.');
      toast({ title: "Error", description: authError.message || 'Failed to update display name.', variant: "destructive" });
      return false;
    } finally {
      setProfileUpdateLoading(false);
    }
  }, [toast]);

  const resendVerificationEmail = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return;
    }
    try {
      await sendEmailVerification(currentUser);
      toast({ title: "Verification Email Sent", description: "A new verification email has been sent. Please check your inbox." });
    } catch (err) {
      const authError = err as AuthError;
      console.error("Resend verification email error:", authError);
      toast({ title: "Error", description: authError.message || "Failed to resend verification email.", variant: "destructive" });
    }
  };

  const reloadUser = async () => {
    if (!auth.currentUser) return;
    setLoading(true); // Indicate loading while reloading
    try {
      await auth.currentUser.reload();
      // onAuthStateChanged will update currentUser, so we don't strictly need setCurrentUser here for that
      // But we do want to reflect the loading state change immediately
    } catch (err) {
      console.error("Error reloading user:", err);
      toast({ title: "Error", description: "Could not refresh user status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const value = {
    currentUser,
    loading,
    profileUpdateLoading,
    error,
    setError,
    login,
    signup,
    logout,
    updateUserDisplayName,
    resendVerificationEmail,
    reloadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
