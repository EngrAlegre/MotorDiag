import type { Timestamp } from 'firebase/firestore'; // Keep for reference, though RTDB uses numbers

export enum DiagnosticStatus {
  NORMAL = 'Normal',
  WARNING = 'Warning',
  CRITICAL = 'Critical',
  UNKNOWN = 'Unknown',
}

// Nested structure interfaces based on the user's provided JSON
interface FirebaseBatteryData {
  voltage?: number;
  status?: string; // e.g., "normal"
}

interface FirebaseEngineData {
  rpm?: number;
  status?: string; // e.g., "running", "normal"
}

interface FirebaseCoolantData {
  temperature?: number;
  status?: string; // e.g., "normal"
}

interface FirebaseOilData {
  level?: number;
  status?: string; // e.g., "normal"
}

interface FirebaseFuelData {
  level?: number;
  status?: string; // e.g., "normal"
}

interface FirebaseVehicleData {
  speed?: number;
}

interface FirebaseThrottleData {
  position?: number;
}

// Dynamic parameter interface
export interface DynamicParameter {
  name: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  isValid: boolean;
  lastUpdate: number;
}

// This interface represents the data structure expected from Firebase RTDB
// Adapted to the user's provided nested JSON structure
export interface RawDiagnosticDataFromFirebase {
  timestamp?: number;
  device_id?: string; // Present in user's JSON, can be ignored if not used by app
  protocol?: string;
  parameters?: Record<string, DynamicParameter>;
  battery?: FirebaseBatteryData;
  engine?: FirebaseEngineData;
  coolant?: FirebaseCoolantData;
  oil?: FirebaseOilData;
  fuel?: FirebaseFuelData;
  vehicle?: FirebaseVehicleData;
  throttle?: FirebaseThrottleData;
  systemStatus?: string; // Overall system status from firmware (e.g., "Normal")
  dataValid?: boolean; // Firmware might send this
  dtcs?: Array<{
    code: string;
    description: string;
    severity: 'warning' | 'error' | 'critical';
    timestamp: number;
  }>;
}

export interface DTC {
  code: string;
  description: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
}

// This interface represents the processed data used throughout the app.
export interface DiagnosticData {
  timestamp: number;
  protocol?: string;
  parameters: Record<string, DynamicParameter>;
  systemStatus: DiagnosticStatus;
  dataValid: boolean;
  dtcs?: DTC[];

  // Legacy fields - make them optional
  batteryVoltage?: number;
  batteryStatus?: DiagnosticStatus;
  engineRPM?: number;
  engineStatus?: DiagnosticStatus;
  coolantTemp?: number;
  coolantStatus?: DiagnosticStatus;
  oilPressure?: number;
  oilStatus?: DiagnosticStatus;
  fuelLevel?: number;
  fuelStatus?: DiagnosticStatus;
  speed?: number;
  speedStatus?: DiagnosticStatus;
  throttlePosition?: number;
  throttleStatus?: DiagnosticStatus;
}

// Aligns with DiagnosticDataPointSchema in predictive-maintenance-tips.ts
export interface AIDiagnosticDataPoint {
  timestamp: number; // Unix timestamp (ms)
  batteryVoltage: number;
  engineRPM: number;
  coolantTemp: number;
  oilLevel: number;
  fuelLevel: number;
  vehicleSpeed: number;
  throttlePosition: number;
}
