
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ref, get, set, update } from "firebase/database";
import { db as firebaseDB } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, ChevronLeft } from "lucide-react";

export default function EditMotorcyclePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const motorcycleId = params.motorcycleId as string;

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [wifiSSID, setWifiSSID] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !motorcycleId) return;
    const motorcycleRef = ref(firebaseDB, `users/${currentUser.uid}/motorcycles/${motorcycleId}`);
    get(motorcycleRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMake(data.make || "");
        setModel(data.model || "");
        setYear(data.year || "");
        setVin(data.vin || "");
        setWifiSSID(data.wifiSSID || "");
        // For security, password fields are generally not pre-filled or fetched.
        // setWifiPassword(data.wifiPassword || ""); 
      } else {
        setError("Motorcycle not found.");
      }
    }).catch((err) => {
      setError("Failed to load motorcycle data.");
    });
  }, [currentUser, motorcycleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (!currentUser) throw new Error("You must be logged in to edit a motorcycle");
      
      const updates: any = {
        make,
        model,
        year,
        vin,
        wifiSSID,
      };
      // Only update password if a new one is entered
      if (wifiPassword) {
        updates.wifiPassword = wifiPassword;
      }

      const motorcycleRef = ref(firebaseDB, `users/${currentUser.uid}/motorcycles/${motorcycleId}`);
      await update(motorcycleRef, updates);
      setSuccessMessage("Motorcycle updated successfully!");
      setTimeout(() => {
        router.push(`/dashboard/${motorcycleId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update motorcycle");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Edit Motorcycle</CardTitle>
              <CardDescription>Update your motorcycle details below.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {successMessage && (
                <Alert className="mb-4">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    type="text"
                    placeholder="Enter motorcycle make"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    type="text"
                    placeholder="Enter motorcycle model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="Enter year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    type="text"
                    placeholder="Enter VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    required
                    disabled={loading || motorcycleId !== vin} // Disable if VIN is changed, as it's the key
                    title={motorcycleId !== vin ? "VIN cannot be changed after creation as it's the ID." : ""}
                  />
                   {motorcycleId !== vin && (
                    <p className="text-xs text-muted-foreground">
                      Note: VIN acts as the ID and cannot be changed after creation. If you need to change the VIN, please remove and re-add the motorcycle.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifiSSID">WiFi SSID</Label>
                  <Input
                    id="wifiSSID"
                    type="text"
                    placeholder="Enter WiFi SSID"
                    value={wifiSSID}
                    onChange={(e) => setWifiSSID(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifiPassword">WiFi Password</Label>
                  <Input
                    id="wifiPassword"
                    type="password"
                    placeholder="Enter new password if you want to change it"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleCancel} className="w-full" disabled={loading}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
