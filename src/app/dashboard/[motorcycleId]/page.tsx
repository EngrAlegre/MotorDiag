
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
import { Terminal, Info, Activity, AlertTriangle, ChevronLeft } from "lucide-react";
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ref, set, update } from 'firebase/database';
import { db as firebaseDB } from '@/lib/firebase';
import Link from 'next/link';

export default function MotorcycleDashboardPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const motorcycleId = params.motorcycleId as string;

  const { currentData, error, setCurrentData } = useFirebaseDiagnostics(motorcycleId);
  const isLoading = !error && !currentData.timestamp && !currentData.dataValid;
  const showData = currentData.dataValid && !error;

  const firebasePath = `users/${currentUser?.uid || '[user-id]'}/motorcycles/${motorcycleId}/latest`;

  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const availableParameters = Object.keys(currentData.parameters || {});

  useEffect(() => {
    if (availableParameters.length > 0) {
      const newParams = availableParameters.filter(p => !selectedParameters.includes(p));
      if (newParams.length > 0 || selectedParameters.length === 0 && availableParameters.length > 0) {
         setSelectedParameters(prev => {
            const updatedSelection = [...new Set([...prev, ...availableParameters])];
            return updatedSelection;
        });
      }
    }
  }, [availableParameters, selectedParameters]);

  const handleClearDTCs = async () => {
    if (!currentUser) return;
    
    try {
      const dtcRef = ref(firebaseDB, `users/${currentUser.uid}/motorcycles/${motorcycleId}/latest/dtcs`);
      await set(dtcRef, null as any); 
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 break-all">Dashboard for {motorcycleId}</h1>

            {error && !showData && (
              error.startsWith("No data at path") ? (
                <Alert variant="default" className="mb-8 border-primary/50 dark:border-primary/40">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Waiting for Initial Data</AlertTitle>
                  <AlertDescription>
                    Currently waiting for data at Firebase path: <code className="font-mono bg-muted px-1 py-0.5 rounded text-sm break-all">{firebasePath}</code>.
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
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(6)].map((_, i) => (
                    <CardSkeleton key={i}/>
                  ))}
               </div>
            ) : showData ? (
              <>
                {/* DTC Section */}
                <div className="mb-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Diagnostic Trouble Codes (DTCs)</h2>
                  {currentData.dtcs && currentData.dtcs.length > 0 ? (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Active DTCs Detected</AlertTitle>
                        <AlertDescription>
                          <div className="mt-2 space-y-2">
                            {currentData.dtcs.map((dtc, index) => (
                              <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:gap-2 text-sm">
                                <span className="font-mono shrink-0">{dtc.code}</span>
                                <span className="hidden sm:inline">-</span>
                                <span className="break-words">{dtc.description}</span>
                                <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">({dtc.severity})</span>
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

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
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
                {selectedParameters.length === 0 && availableParameters.length > 0 && (
                    <p className="text-muted-foreground md:col-span-2 lg:col-span-3 xl:col-span-4">Select parameters below to display them as cards.</p>
                )}
                {availableParameters.length === 0 && (
                     <p className="text-muted-foreground md:col-span-2 lg:col-span-3 xl:col-span-4">No diagnostic parameters currently available.</p>
                )}
              </div>

                {/* Parameter Selection */}
                {availableParameters.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Displayed Parameters</h2>
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
                        className={`px-3 py-1.5 rounded-full text-xs md:text-sm transition-colors ${
                          selectedParameters.includes(paramName)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {paramName}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* Raw Data Table */}
                {Object.keys(currentData.parameters).length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">All Received Parameters</h2>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Parameter</th>
                          <th className="px-4 py-2 text-left font-medium">Value</th>
                          <th className="px-4 py-2 text-left font-medium">Unit</th>
                          <th className="px-4 py-2 text-left font-medium">Min</th>
                          <th className="px-4 py-2 text-left font-medium">Max</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(currentData.parameters).map(([name, param]) => (
                          <tr key={name} className="border-b last:border-b-0">
                            <td className="px-4 py-2 break-words">{name}</td>
                            <td className="px-4 py-2 break-words">{param.value.toLocaleString()}</td>
                            <td className="px-4 py-2">{param.unit}</td>
                            <td className="px-4 py-2">{param.min.toLocaleString()}</td>
                            <td className="px-4 py-2">{param.max.toLocaleString()}</td>
                            <td className="px-4 py-2">
                              {param.isValid ? 
                                <span className="text-green-600 dark:text-green-400">Valid</span> : 
                                <span className="text-red-600 dark:text-red-400">Invalid</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </>
            ) : !error && !isLoading ? (
              <Alert className="mb-8">
                  <Info className="h-4 w-4" />
                  <AlertTitle>No Data Yet</AlertTitle>
                  <AlertDescription>
                    The dashboard is ready. Waiting for the first data transmission from your motorcycle.
                  </AlertDescription>
              </Alert>
            ): null }

            <PredictiveMaintenanceCard systemStatus={currentData.systemStatus} />
            
            <div className="mt-8 flex justify-center">
              <Link href="/" passHref legacyBehavior>
                <Button variant="outline" asChild>
                  <a>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to My Motorcycles
                  </a>
                </Button>
              </Link>
            </div>

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
    <div className="flex flex-col space-y-3 p-4 border rounded-lg bg-card shadow-sm">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-7 w-3/5" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}

    
