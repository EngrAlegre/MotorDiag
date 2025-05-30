
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, BellRing, Settings2, SlidersHorizontal, Wifi, QrCode, Copy, Eye, EyeOff } from 'lucide-react';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useToast } from '@/hooks/use-toast';
import { getAuth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QRCodeCanvas } from 'qrcode.react';
import { ref, onValue } from 'firebase/database';
import { db as firebaseDB } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // For QR code logo

export default function SettingsPage() {
  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(false);
  const [measurementUnits, setMeasurementUnits] = useState<'metric' | 'imperial'>('metric');
  const [idToken, setIdToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'connected' | 'disconnected' | 'provisioning'>('disconnected');
  const [deviceId, setDeviceId] = useState<string>('');
  const [motorcycleVin, setMotorcycleVin] = useState<string>('');
  const [showProvisioningDialog, setShowProvisioningDialog] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState<'start' | 'connect' | 'configure'>('start');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSSID, setWifiSSID] = useState('');
  const [motorcycles, setMotorcycles] = useState<{ id: string; name: string; vin: string; wifiSSID: string; wifiPassword: string; make: string; model: string; }[]>([]);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<string>('');
  const [showSensitiveData, setShowSensitiveData] = useState<Record<string, boolean>>({});


  const {
    permission: notificationPermission,
    fcmToken,
    error: notificationError,
    requestPermission
  } = useNotificationPermission();
  const { toast } = useToast();

  useEffect(() => {
    if (notificationPermission === 'granted') {
      setCriticalAlertsEnabled(true);
    } else {
      setCriticalAlertsEnabled(false);
    }
  }, [notificationPermission]);


  const handleCriticalAlertsToggle = async (checked: boolean) => {
    if (checked) {
      if (notificationPermission !== 'granted') {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          setCriticalAlertsEnabled(false);
        }
      } else {
        setCriticalAlertsEnabled(true);
        toast({ title: "Critical Alerts Active", description: "Notification permission is already granted." });
      }
    } else {
      setCriticalAlertsEnabled(false);
      toast({ title: "Critical Alerts Paused", description: "App-level alerts paused. Browser permission may still exist." });
    }
  };

  const [maintenanceRemindersEnabled, setMaintenanceRemindersEnabled] = useState(true);

  const handleMaintenanceRemindersToggle = (checked: boolean) => {
    setMaintenanceRemindersEnabled(checked);
  };

  const handleDeviceProvisionComplete = async () => {
    setDeviceStatus('provisioning'); 
    toast({
      title: "Provisioning Initiated",
      description: "The device should now attempt to connect using the provided details.",
    });
    setTimeout(() => {
      setDeviceStatus('connected');
      setDeviceId('ESP32_MotoVision_' + (motorcycleVin || selectedMotorcycleId || '').slice(-4)); 
      toast({
        title: "Device Provisioned (Simulated)",
        description: `Device for ${motorcycleVin || 'selected motorcycle'} is now marked as connected.`,
      });
      setShowProvisioningDialog(false); 
      setProvisioningStep('start'); 
    }, 3000);
  };

  const handleDeviceReset = async () => {
    setDeviceStatus('disconnected');
    setDeviceId('');
    toast({
      title: "Device Reset (Simulated)",
      description: "The device connection status has been reset in the web app.",
    });
  };

  useEffect(() => {
    if (!showProvisioningDialog) return;
    const user = getAuth().currentUser;
    if (!user) return;
    const motorcyclesRef = ref(firebaseDB, `users/${user.uid}/motorcycles`);
    const unsubscribe = onValue(motorcyclesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name || `${data[key].make || ''} ${data[key].model || ''}`.trim() || `Motorcycle ${key}`,
          vin: data[key].vin || key,
          wifiSSID: data[key].wifiSSID || '',
          wifiPassword: data[key].wifiPassword || '',
          make: data[key].make || '',
          model: data[key].model || '',
        }));
        setMotorcycles(arr);
        if (arr.length > 0 && !selectedMotorcycleId) {
          setSelectedMotorcycleId(arr[0].id);
        }
      } else {
        setMotorcycles([]);
        setSelectedMotorcycleId('');
        setMotorcycleVin('');
        setWifiSSID('');
        setWifiPassword('');
      }
    }, (error) => {
      console.error("Error fetching motorcycles for provisioning: ", error);
      toast({title: "Error", description: "Could not fetch motorcycle list.", variant: "destructive"});
    });
    return () => unsubscribe();
  }, [showProvisioningDialog, toast]); 

  useEffect(() => {
    const selected = motorcycles.find(m => m.id === selectedMotorcycleId);
    if (selected) {
      setMotorcycleVin(selected.vin);
      setWifiSSID(selected.wifiSSID || '');
      setWifiPassword(selected.wifiPassword || '');
    } else if (motorcycles.length > 0 && !selectedMotorcycleId) {
      setSelectedMotorcycleId(motorcycles[0].id);
    } else if (motorcycles.length === 0) {
        setMotorcycleVin('');
        setWifiSSID('');
        setWifiPassword('');
    }
  }, [selectedMotorcycleId, motorcycles]);


  useEffect(() => {
    const fetchToken = async () => {
      setTokenError(null); 
      setIdToken(null); 
      try {
        const user = getAuth().currentUser;
        if (user) {
          const token = await user.getIdToken(true); 
          setIdToken(token);
        } else {
          setTokenError('User not authenticated. Cannot fetch token.');
        }
      } catch (err) {
        console.error('Error fetching ID token:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to get Firebase ID token.';
        setTokenError(errorMessage);
        toast({
          title: "Token Error",
          description: errorMessage + " Please try again or re-login.",
          variant: "destructive",
        });
      }
    };

    if (showProvisioningDialog && provisioningStep === 'configure') {
      fetchToken();
    }
  }, [showProvisioningDialog, provisioningStep, toast]);
  
  const toggleSensitiveData = (label: string) => {
    setShowSensitiveData(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderProvisioningStepContent = () => {
    const selectedMotorcycle = motorcycles.find(m => m.id === selectedMotorcycleId);

    switch (provisioningStep) {
      case 'start':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              1. Select the motorcycle this ESP32 device will be associated with:
            </p>
            {motorcycles.length > 0 ? (
              <select
                className="w-full border border-input bg-background rounded-md p-2 text-sm focus:ring-ring focus:outline-none focus:ring-2 focus:ring-offset-2"
                value={selectedMotorcycleId}
                onChange={e => setSelectedMotorcycleId(e.target.value)}
                required
              >
                {motorcycles.map(m => (
                  <option key={m.id} value={m.id}>{m.name} (VIN: {m.vin})</option>
                ))}
              </select>
            ) : (
               <Alert variant="default">
                 <Wifi className="h-4 w-4"/>
                <AlertTitle>No Motorcycles Found</AlertTitle>
                <AlertDescription>
                  Please <Link href="/add-motorcycle" className="underline">add a motorcycle</Link> first before provisioning a device.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              2. Power on your ESP32 device. It should create a WiFi network named <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">MotoVision_Setup</code>. Connect your computer/phone to this network.
            </p>
            <p className="text-sm text-muted-foreground">
              3. Once connected, open a web browser and go to <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">http://192.168.4.1</code> (this is usually the ESP32's address in AP mode).
            </p>
            <Button onClick={() => setProvisioningStep('connect')} disabled={!selectedMotorcycleId || motorcycles.length === 0}>
              Next: Enter WiFi Details
            </Button>
          </div>
        );
      case 'connect':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              4. On the ESP32's web page (from <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">http://192.168.4.1</code>), you should see fields to enter your WiFi network details and other information. Use the details shown in the next step.
            </p>
            <div className="space-y-2">
              <Label htmlFor="prov-wifi-ssid">Your WiFi Network Name (SSID)</Label>
              <Input
                id="prov-wifi-ssid"
                value={wifiSSID}
                onChange={(e) => setWifiSSID(e.target.value)}
                placeholder="Enter your WiFi network name"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prov-wifi-password">Your WiFi Network Password</Label>
              <Input
                id="prov-wifi-password"
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Enter your WiFi network password"
                className="text-sm"
              />
            </div>
             <div className="space-y-1">
                <Label htmlFor="prov-vin-readonly" className="text-xs text-muted-foreground">Selected Motorcycle VIN (read-only)</Label>
                <Input id="prov-vin-readonly" value={motorcycleVin} disabled readOnly className="text-sm bg-muted"/>
            </div>
            <Button onClick={() => setProvisioningStep('configure')} disabled={!wifiSSID || !motorcycleVin}>
              Next: Get Device Configuration Data
            </Button>
          </div>
        );
      case 'configure':
        const provisioningData = [
          { label: 'User UID', value: getAuth().currentUser?.uid || 'N/A (Log in first)' },
          { label: 'Motorcycle VIN', value: motorcycleVin || 'N/A (Select motorcycle)' },
          { label: 'Make', value: selectedMotorcycle?.make || 'N/A (Select motorcycle)' },
          { label: 'Model', value: selectedMotorcycle?.model || 'N/A (Select motorcycle)' },
          { label: 'WiFi SSID', value: wifiSSID || 'N/A (Enter WiFi details)' },
          { label: 'WiFi Password', value: wifiPassword || 'N/A (Enter WiFi details)', isSensitive: true },
          { label: 'Firebase ID Token', value: idToken || (tokenError || 'Loading token...'), isSensitive: true },
        ];
        const qrPayload = {
          uid: getAuth().currentUser?.uid || '',
          vin: motorcycleVin || '',
          make: selectedMotorcycle?.make || '',
          model: selectedMotorcycle?.model || '',
          ssid: wifiSSID || '',
          password: wifiPassword || '',
          token: idToken || '',
        };

        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              5. Enter the following details into the ESP32's web page, or scan the QR code if your ESP32 supports it.
            </p>
            {tokenError && !idToken && ( 
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Token Error</AlertTitle>
                  <AlertDescription>{tokenError}</AlertDescription>
                </Alert>
            )}
            <div className="space-y-2 max-h-[350px] overflow-y-auto overflow-x-hidden p-1">
              {provisioningData.map(({ label, value, isSensitive }) => (
                <div key={label} className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')} className="text-xs">
                      {label}:
                    </Label>
                    <div className="flex items-center">
                      {isSensitive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSensitiveData(label)}
                          className="h-auto p-1 text-xs mr-1"
                          aria-label={showSensitiveData[label] ? "Hide" : "Show"}
                        >
                          {showSensitiveData[label] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const actualValue = label === 'Firebase ID Token' ? idToken : value;
                          if (actualValue && actualValue !== 'Loading token...' && !tokenError) {
                            navigator.clipboard.writeText(actualValue);
                            toast({ title: `${label} copied!`, duration: 2000 });
                          }
                        }}
                        aria-label={`Copy ${label}`}
                        className="h-auto p-1 text-xs"
                        disabled={label === 'Firebase ID Token' && (!idToken || !!tokenError)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div
                    id={label.toLowerCase().replace(/\s/g, '-')}
                    className={cn(
                      "w-full border border-input bg-muted px-2 py-1.5 rounded-md text-xs text-muted-foreground min-h-[30px] overflow-hidden min-w-0", // Base styles
                      isSensitive && !showSensitiveData[label] // Condition for blurred state
                        ? "blur-sm select-none flex items-center" // Classes for blurred state (centers "Click to reveal")
                        : (label === 'Firebase ID Token' ? "break-all" : "break-words") // Classes for revealed state: break-all for token, break-words for others
                    )}
                    onClick={() => { if (isSensitive && !showSensitiveData[label]) toggleSensitiveData(label);}}
                    title={isSensitive && !showSensitiveData[label] ? "Click to reveal" : (value && value.length > 50 ? value: "")}
                  >
                     {isSensitive && !showSensitiveData[label] ? "Click to reveal" : (label === 'Firebase ID Token' ? (idToken || (tokenError || 'Loading token...')) : value)}
                  </div>
                </div>
              ))}
            </div>

            {idToken && !tokenError && (
              <div className="mt-4 flex flex-col items-center space-y-2">
                <p className="text-xs text-muted-foreground">Or scan this QR code with your device:</p>
                <div className="p-2 bg-white rounded-md inline-block shadow">
                  <QRCodeCanvas
                    value={JSON.stringify(qrPayload)}
                    size={128} 
                    level="M"
                    includeMargin={true}
                    imageSettings={{ 
                        src: '/favicon.ico', 
                        height: 20,
                        width: 20,
                        excavate: true,
                    }}
                  />
                </div>
              </div>
            )}
            <Alert variant="default" className="mt-4">
                <Wifi className="h-4 w-4"/>
                <AlertTitle className="text-sm">After Submission on ESP32</AlertTitle>
                <AlertDescription className="text-xs">
                  Once you submit these details on the ESP32's web page, it will attempt to connect to your WiFi and then to Firebase. It might take a minute or two.
                </AlertDescription>
            </Alert>
            <Button onClick={handleDeviceProvisionComplete} disabled={!idToken || !!tokenError} className="w-full">
             Done, I've Provisioned My Device
            </Button>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4 md:p-8">
          <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <Settings2 className="mr-3 h-6 w-6 text-primary" />
                Settings
              </CardTitle>
              <CardDescription>Manage your application preferences and account settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center mb-4">
                  <Palette className="mr-3 h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Appearance</h3>
                </div>
                <div className="space-y-4 pl-8">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="theme" className="font-medium">Theme</Label>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred light or dark mode.
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center mb-4">
                  <BellRing className="mr-3 h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
                </div>
                <div className="space-y-4 pl-8">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="critical-alerts" className="font-medium">Critical Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications for critical system issues.
                      </p>
                      {notificationPermission && notificationPermission !== 'default' && (
                        <p className={`text-xs mt-1 ${notificationPermission === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
                          Browser permission: {notificationPermission}
                        </p>
                      )}
                      {notificationError && <p className="text-xs text-destructive mt-1">{notificationError}</p>}
                    </div>
                    <Switch
                      id="critical-alerts"
                      checked={criticalAlertsEnabled}
                      onCheckedChange={handleCriticalAlertsToggle}
                      aria-label="Toggle critical alerts"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="maintenance-reminders" className="font-medium">Maintenance Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminders for scheduled motorcycle maintenance.
                      </p>
                    </div>
                    <Switch
                      id="maintenance-reminders"
                      aria-label="Toggle maintenance reminders"
                      checked={maintenanceRemindersEnabled}
                      onCheckedChange={handleMaintenanceRemindersToggle}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center mb-4">
                  <SlidersHorizontal className="mr-3 h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">General Preferences</h3>
                </div>
                <div className="space-y-4 pl-8">
                  <div className="rounded-lg border p-4">
                    <Label className="font-medium">Measurement Units</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Choose your preferred units for speed, temperature, etc.
                    </p>
                    <RadioGroup
                      value={measurementUnits}
                      onValueChange={(value: string) => setMeasurementUnits(value as 'metric' | 'imperial')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="metric" id="metric-units" />
                        <Label htmlFor="metric-units" className="font-normal">Metric (km/h, °C)</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="imperial" id="imperial-units" />
                        <Label htmlFor="imperial-units" className="font-normal">Imperial (mph, °F)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center mb-4">
                  <Wifi className="mr-3 h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">Device Provisioning</h3>
                </div>
                <div className="space-y-4 pl-8">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Label className="font-medium">Device Status (Web App)</Label>
                         <p className="text-xs text-muted-foreground">
                          Indicates if web app thinks a device is set up.
                        </p>
                        <p className="text-sm text-foreground font-semibold mt-1">
                          {deviceStatus === 'connected' ? 'Paired & Configured' :
                           deviceStatus === 'provisioning' ? 'Attempting to Pair...' :
                           'Not Paired'}
                        </p>
                      </div>
                        <Button
                          onClick={() => {
                            setProvisioningStep('start'); 
                            setShowSensitiveData({}); 
                            setShowProvisioningDialog(true);
                          }}
                          variant={deviceStatus === 'disconnected' ? 'default' : 'outline'}
                        >
                          {deviceStatus === 'disconnected' ? 'Pair New Device' : 'Reconfigure Device'}
                        </Button>
                    </div>

                    {deviceStatus !== 'disconnected' && (
                      <>
                      <Separator className="my-3"/>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Paired Device ID (Simulated)</Label>
                        <p className="text-sm text-foreground">{deviceId || 'N/A'}</p>
                      </div>
                      <div className="space-y-1 mt-2">
                        <Label className="text-xs text-muted-foreground">Associated Motorcycle VIN</Label>
                        <p className="text-sm text-foreground">{motorcycleVin || 'N/A'}</p>
                      </div>
                       <Button variant="destructive" onClick={handleDeviceReset} className="w-full mt-4 text-xs h-8">
                          Unpair Device (Web App)
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
               <Separator />
                <div>
                    <div className="flex items-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-muted-foreground"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M12 12H2"></path><path d="M12 12H10"></path><path d="M12 12H14"></path></svg>
                        <h3 className="text-lg font-semibold text-foreground">Legal & Terms</h3>
                    </div>
                    <div className="space-y-2 pl-8">
                        <Button variant="link" asChild className="p-0 h-auto justify-start">
                            <Link href="/user-agreement" className="text-sm">View User Agreement</Link>
                        </Button>
                    </div>
                </div>


            </CardContent>
          </Card>
        </main>

        <Dialog open={showProvisioningDialog} onOpenChange={(isOpen) => {
            setShowProvisioningDialog(isOpen);
            if (!isOpen) {
                setProvisioningStep('start'); 
                setShowSensitiveData({});
            }
        }}>
          <DialogContent className="sm:max-w-md"> 
            <DialogHeader>
              <DialogTitle className="text-lg">Device Provisioning Steps</DialogTitle>
              <DialogDescription className="text-sm">
                Follow these steps to configure your ESP32 device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2"> 
              {renderProvisioningStepContent()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
