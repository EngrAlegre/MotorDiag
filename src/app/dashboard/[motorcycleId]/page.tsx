'use client';

import { Header } from '@/components/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PredictiveMaintenanceCard } from '@/components/dashboard/PredictiveMaintenanceCard';
import { useFirebaseDiagnostics } from '@/hooks/useFirebaseDiagnostics';
import { DIAGNOSTIC_ITEMS_CONFIG } from '@/lib/constants';
import type { DiagnosticData, DiagnosticStatus } from '@/lib/types';
import { DiagnosticStatus as StatusEnum } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Info, Activity, AlertTriangle } from "lucide-react";
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ref, set, update } from 'firebase/database';
import { db as firebaseDB } from '@/lib/firebase';

export default function MotorcycleDashboardPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const motorcycleId = params.motorcycleId as string;

  const { currentData, error, setCurrentData } = useFirebaseDiagnostics(motorcycleId);
  const isLoading = !currentData.dataValid && !error;
  const showData = currentData.dataValid && !error;

  // Determine the path for display in the \"Waiting for Data\" message.
  const firebasePath = `users/${currentUser?.uid || '[user-id]'}/motorcycles/${motorcycleId}/latest`;

  // Type guard for statusKey
  function hasStatusKey(item: any): item is { statusKey: string } {
    return 'statusKey' in item;
  }
  // Type guard for isOverallStatus
  function hasIsOverallStatus(item: any): item is { isOverallStatus: boolean } {
    return 'isOverallStatus' in item;
  }

  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);

  // Get all available parameters
  const availableParameters = Object.keys(currentData.parameters || {});

  // Update selected parameters when new ones are detected
  useEffect(() => {
    setSelectedParameters(prev => {
      const newParams = availableParameters.filter(p => !prev.includes(p));
      if (newParams.length === 0) return prev; // Prevent unnecessary update
      return [...prev, ...newParams];
    });
  }, [availableParameters]);

  const handleClearDTCs = async () => {
    if (!currentUser) return;
    
    try {
      const dtcRef = ref(firebaseDB, `users/${currentUser.uid}/motorcycles/${motorcycleId}/latest/dtcs`);
      await set(dtcRef, null as any); // Use set to delete the dtcs node, cast null to any to fix linter error
      // Update local state
      setCurrentData(prev => ({
        ...prev,
        dtcs: []
      }));
    } catch (error) {
      console.error('Failed to clear DTCs:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex-1 p-4 md:p-8">
          <div className="container mx-auto max-w-7xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Dashboard for {motorcycleId}</h1> {/* Display motorcycleId in title */}

            {error && !currentData.dataValid && (
              error.startsWith("No data at path") ? (
                <Alert variant="default" className="mb-8 border-primary/50 dark:border-primary/40">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Waiting for Initial Data</AlertTitle>
                  <AlertDescription>
                    Currently waiting for data at Firebase path: <code className="font-mono bg-muted px-1 py-0.5 rounded text-sm">{firebasePath}</code>.
                    <br />
                    Once data is received from your motorcycle, the dashboard will update.
                    If you&apos;ve already sent data, please double-check the path in your Firebase Realtime Database and ensure your device ID matches.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="mb-8">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Realtime Database Error</AlertTitle>
                  <AlertDescription>
                    {error} Please check your Firebase setup, network connection, and security rules.
                  </AlertDescription>
                </Alert>
              )
            )}

            {isLoading ? (
               <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">\
                  {[...Array(DIAGNOSTIC_ITEMS_CONFIG.length)].map((_, i) => (
                    <CardSkeleton key={i}/>
                  ))}\
               </div>
            ) : showData ? (
              <>
                {/* DTC Section */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Diagnostic Trouble Codes (DTCs)</h2>
                  {currentData.dtcs && currentData.dtcs.length > 0 ? (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Active DTCs Detected</AlertTitle>
                        <AlertDescription>
                          <div className="mt-2">
                            {currentData.dtcs.map((dtc, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="font-mono">{dtc.code}</span>
                                <span>-</span>
                                <span>{dtc.description}</span>
                              </div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                      <Button 
                        variant="outline" 
                        onClick={handleClearDTCs}
                      >
                        Clear DTCs
                      </Button>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>No Active DTCs</AlertTitle>
                      <AlertDescription>
                        Your motorcycle is currently operating without any diagnostic trouble codes.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
                  {selectedParameters.map(paramName => {
                    const param = currentData.parameters[paramName];
                    if (!param) return null;

                     return (
                      <MetricCard
                        key={paramName}
                        title={paramName}
                        value={param.value.toLocaleString()}
                        unit={param.unit}
                        iconName="Activity"
                        status={param.isValid ? StatusEnum.NORMAL : StatusEnum.CRITICAL}
                    />
                  );
                })}
              </div>

                {/* Parameter Selection */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Available Parameters</h2>
                  <div className="flex flex-wrap gap-2">
                    {availableParameters.map(paramName => (
                      <button
                        key={paramName}
                        onClick={() => {
                          setSelectedParameters(prev =>
                            prev.includes(paramName)
                              ? prev.filter(p => p !== paramName)
                              : [...prev, paramName]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          selectedParameters.includes(paramName)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {paramName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Raw Data Table */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">All Parameters</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="border px-4 py-2">Parameter</th>
                          <th className="border px-4 py-2">Value</th>
                          <th className="border px-4 py-2">Unit</th>
                          <th className="border px-4 py-2">Min</th>
                          <th className="border px-4 py-2">Max</th>
                          <th className="border px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(currentData.parameters).map(([name, param]) => (
                          <tr key={name}>
                            <td className="border px-4 py-2">{name}</td>
                            <td className="border px-4 py-2">{param.value.toLocaleString()}</td>
                            <td className="border px-4 py-2">{param.unit}</td>
                            <td className="border px-4 py-2">{param.min.toLocaleString()}</td>
                            <td className="border px-4 py-2">{param.max.toLocaleString()}</td>
                            <td className="border px-4 py-2">
                              {param.isValid ? 'Valid' : 'Invalid'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : !error ? ( // If not loading, not showing data, and no error, means we're still in an initial state or waiting
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(DIAGNOSTIC_ITEMS_CONFIG.length)].map((_, i) => (
                  <CardSkeleton key={i}/>
                ))}\
              </div>
            ): null }

            <PredictiveMaintenanceCard systemStatus={currentData.systemStatus} />
          </div>
        </main>
        <footer className="py-6 md:px-8 md:py-0 border-t mt-auto">
            <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
              <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
                Built with passion for motorcycles. © {new Date().getFullYear()} MotoVision.
              </p>
            </div>
          </footer>
      </div>
    </ProtectedRoute>
  );
}


function CardSkeleton() {
  return (
    <div className="flex flex-col space-y-3 p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-8 w-3/5" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  )
}