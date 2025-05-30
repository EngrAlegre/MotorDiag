'use client';

import { Header } from '@/components/Header';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getDatabase, ref, remove, onValue, off } from 'firebase/database'; // Added for Firebase DB operations
import { db as firebaseDB } from '@/lib/firebase'; // Added Firebase DB instance
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, MoreVertical } from "lucide-react";
import { useRouter } from 'next/navigation';


// Fetch motorcycle data from Firebase
async function fetchUserMotorcycles(userId: string | undefined): Promise<{ id: string; name: string; }[]> {
  if (!userId) {
    console.log("User ID is undefined, cannot fetch motorcycles.");
    return [];
  }
  console.log(`Fetching motorcycles for user: ${userId}`);
  const db = firebaseDB; // Use the imported firebaseDB instance
  const motorcyclesRef = ref(db, `users/${userId}/motorcycles`);

  return new Promise((resolve, reject) => {
    onValue(motorcyclesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const motorcyclesArray = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name || `Motorcycle ${key}`, // Assuming 'name' is a field in your motorcycle data
          // Add other motorcycle details here if needed
        }));
        resolve(motorcyclesArray);
      } else {
        resolve([]); // No motorcycles found
      }
    }, (error) => {
      console.error("Error fetching motorcycles from Firebase:", error);
      reject(new Error("Failed to fetch motorcycles from Firebase."));
    }, { onlyOnce: true }); // Fetch data once
  });
}

export default function HomePage() { // Renamed to HomePage to avoid confusion
  const { currentUser, loading: authLoading } = useAuth();
  const [motorcycles, setMotorcycles] = useState<{ id: string; name: string }[]>([]);
  const [loadingMotorcycles, setLoadingMotorcycles] = useState(true);
  const [errorFetchingMotorcycles, setErrorFetchingMotorcycles] = useState<string | null>(null);
  const router = useRouter();

  const handleEditMotorcycle = (motorcycleId: string) => {
    router.push(`/dashboard/${motorcycleId}/edit`);
  };

  const handleRemoveMotorcycle = async (motorcycleId: string) => {
    if (!currentUser?.uid) {
      alert("User not authenticated. Cannot remove motorcycle.");
      return;
    }

    if (window.confirm(`Are you sure you want to remove motorcycle ${motorcycleId}? This action cannot be undone.`)) {
      console.log(`Attempting to remove motorcycle: ${motorcycleId} for user: ${currentUser.uid}`);
      const motorcycleRef = ref(firebaseDB, `users/${currentUser.uid}/motorcycles/${motorcycleId}`);
      try {
        await remove(motorcycleRef);
        setMotorcycles(prevMotorcycles => prevMotorcycles.filter(m => m.id !== motorcycleId));
        alert(`Motorcycle ${motorcycleId} removed successfully.`);
        console.log(`Motorcycle ${motorcycleId} removed from Firebase.`);
      } catch (error) {
        console.error(`Error removing motorcycle ${motorcycleId} from Firebase:`, error);
        alert(`Failed to remove motorcycle ${motorcycleId}. Please try again.`);
      }
    }
  };

  useEffect(() => {
    const loadMotorcycles = async () => {
      if (!currentUser) {
        // Wait for user to be loaded by ProtectedRoute or AuthContext
        setLoadingMotorcycles(authLoading);
        return;
      }
      setLoadingMotorcycles(true);
      setErrorFetchingMotorcycles(null);
      try {
        const userMotorcycles = await fetchUserMotorcycles(currentUser.uid);
        setMotorcycles(userMotorcycles);
      } catch (error: any) {
        setErrorFetchingMotorcycles(error.message);
        console.error("Error fetching motorcycles:", error);
      } finally {
        setLoadingMotorcycles(false);
      }
    };

    loadMotorcycles();
  }, [currentUser, authLoading]); // Depend on currentUser and authLoading


  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex-1 p-4 md:p-8">
          <div className="container mx-auto max-w-7xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">My Motorcycles</h1>

            {/* Features Overview Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">Features Overview</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {/* Feature Card: Real-Time Monitoring */}
                <div className="min-w-[220px] bg-card rounded-lg shadow p-4 flex flex-col items-center">
                  <span className="text-4xl mb-2">⏱️</span>
                  <h3 className="font-bold mb-1">Real-Time Monitoring</h3>
                  <p className="text-sm text-center text-muted-foreground">See your motorcycle's health live. Instantly view engine stats, battery voltage, and more—right on your dashboard.</p>
                </div>
                {/* Feature Card: DTC Alerts */}
                <div className="min-w-[220px] bg-card rounded-lg shadow p-4 flex flex-col items-center">
                  <span className="text-4xl mb-2">🚨</span>
                  <h3 className="font-bold mb-1">DTC Alerts</h3>
                  <p className="text-sm text-center text-muted-foreground">Get notified about problems. Receive immediate alerts for any trouble codes, so you know when your motorcycle needs attention.</p>
                </div>
                {/* Feature Card: Multi-Motorcycle Support */}
                <div className="min-w-[220px] bg-card rounded-lg shadow p-4 flex flex-col items-center">
                  <span className="text-4xl mb-2">🏍️</span>
                  <h3 className="font-bold mb-1">Multi-Motorcycle Support</h3>
                  <p className="text-sm text-center text-muted-foreground">Manage all your bikes in one place. Easily switch between different motorcycles and keep track of each one's diagnostics.</p>
                </div>
                {/* Feature Card: Cloud Sync */}
                <div className="min-w-[220px] bg-card rounded-lg shadow p-4 flex flex-col items-center">
                  <span className="text-4xl mb-2">☁️</span>
                  <h3 className="font-bold mb-1">Cloud Sync (Firebase)</h3>
                  <p className="text-sm text-center text-muted-foreground">Access your data anywhere. Your diagnostic data is securely stored in the cloud, so you can check it from any device.</p>
                </div>
                {/* Feature Card: Mobile-Friendly Dashboard */}
                <div className="min-w-[220px] bg-card rounded-lg shadow p-4 flex flex-col items-center">
                  <span className="text-4xl mb-2">📱</span>
                  <h3 className="font-bold mb-1">Mobile-Friendly Dashboard</h3>
                  <p className="text-sm text-center text-muted-foreground">Works great on any device. Our dashboard is designed to look and work perfectly on both phones and computers.</p>
                </div>
                {/* Feature Card: Predictive Maintenance */}
                <div className="min-w-[220px] bg-card rounded-lg shadow p-4 flex flex-col items-center">
                  <span className="text-4xl mb-2">🔧</span>
                  <h3 className="font-bold mb-1">Predictive Maintenance</h3>
                  <p className="text-sm text-center text-muted-foreground">Stay ahead with smart tips. Get maintenance reminders and predictions based on your motorcycle's real data.</p>
                </div>
              </div>
            </section>

            {loadingMotorcycles && (
              <p>Loading motorcycles...</p>
            )}

            {errorFetchingMotorcycles && (
               <Alert variant="destructive" className="mb-8">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Error Loading Motorcycles</AlertTitle>
                  <AlertDescription>
                    {errorFetchingMotorcycles}
                  </AlertDescription>
                </Alert>
            )}

            {!loadingMotorcycles && !errorFetchingMotorcycles && (
              motorcycles.length === 0 ? (
                <p>No motorcycles added yet. Add your first motorcycle!</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {motorcycles.map((motorcycle) => (
                    <Card key={motorcycle.id}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>{motorcycle.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditMotorcycle(motorcycle.id)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRemoveMotorcycle(motorcycle.id)} className="text-red-600 hover:!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-700/50 dark:hover:!text-red-50">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">ID: {motorcycle.id}</p>
                      </CardContent>
                      <CardContent className="pt-4 flex flex-col space-y-2">
                         <Link href={`/dashboard/${motorcycle.id}`} passHref legacyBehavior>
                           <Button asChild className="w-full"><a href={`/dashboard/${motorcycle.id}`}>View Dashboard</a></Button>
                         </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}

            <div className="mt-8">
              <Link href="/add-motorcycle" passHref>
                <Button>Add New Motorcycle</Button>
              </Link>
            </div>

          </div>
        </main>
        <footer className="py-6 md:px-8 md:py-0 border-t mt-auto">
            <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">\
              <p className="text-balance text-center text-sm leading-loose text-muted-foreground">\
                Built with passion for motorcycles. © {new Date().getFullYear()} MotoVision.\
              </p>\
            </div>\
          </footer>\
      </div>
    </ProtectedRoute>
  );
}

// Removed CardSkeleton as it's no longer needed on this page
