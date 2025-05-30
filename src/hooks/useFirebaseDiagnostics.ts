'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { db as firebaseDB } from '@/lib/firebase';
import type { DiagnosticData, RawDiagnosticDataFromFirebase } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { DiagnosticStatus as StatusEnum } from '@/lib/types';
import { STATUS_THRESHOLDS } from '@/lib/constants';

const initialData: DiagnosticData = {
  timestamp: 0,
  batteryVoltage: 0,
  batteryStatus: StatusEnum.UNKNOWN,
  engineRPM: 0,
  engineStatus: StatusEnum.UNKNOWN,
  coolantTemp: 0,
  coolantStatus: StatusEnum.UNKNOWN,
  oilLevel: 0,
  oilStatus: StatusEnum.UNKNOWN,
  fuelLevel: 0,
  fuelStatus: StatusEnum.UNKNOWN,
  vehicleSpeed: 0,
  throttlePosition: 0,
  systemStatus: StatusEnum.UNKNOWN,
  dataValid: false,
};

// Helper to determine status based on value and thresholds
function determineStatus(value: number, thresholds: { warning: number; critical: number } | undefined, isHigherBetter: boolean = true): StatusEnum {
  if (thresholds === undefined) return StatusEnum.NORMAL;
  if (value === undefined || isNaN(value)) return StatusEnum.UNKNOWN;

  if (isHigherBetter) {
    if (value < thresholds.critical) return StatusEnum.CRITICAL;
    if (value < thresholds.warning) return StatusEnum.WARNING;
  } else { // Lower is better (e.g., temperature, RPM)
    if (value > thresholds.critical) return StatusEnum.CRITICAL;
    if (value > thresholds.warning) return StatusEnum.WARNING;
  }
  return StatusEnum.NORMAL;
}

// Helper to parse status string from firmware or fall back to calculated status
// Now handles lowercase and specific mappings like "running"
function parseFirmwareStatus(rawStatusStr: string | undefined, calculatedStatus: StatusEnum): StatusEnum {
  if (!rawStatusStr) return calculatedStatus;

  const lowerStatus = rawStatusStr.toLowerCase();
  if (lowerStatus === "normal" || lowerStatus === "running") return StatusEnum.NORMAL;
  if (lowerStatus === "warning") return StatusEnum.WARNING;
  if (lowerStatus === "critical") return StatusEnum.CRITICAL;
  
  // Check against enum values as a fallback (for title case)
  if (Object.values(StatusEnum).map(s => s.toLowerCase()).includes(lowerStatus)) {
     return Object.values(StatusEnum).find(s => s.toLowerCase() === lowerStatus) as StatusEnum;
  }

  return calculatedStatus; // Fallback to calculated if string is unrecognized
}


export function useFirebaseDiagnostics(motorcycleId: string = 'yamaha_001') {
  const { currentUser } = useAuth();
  const [currentData, setCurrentData] = useState<DiagnosticData>({
    timestamp: Date.now(),
    parameters: {},
    systemStatus: StatusEnum.UNKNOWN,
    dataValid: false,
    dtcs: []
  });
  const [error, setError] = useState<string | null>("Waiting for data...");

  const processFirebaseData = useCallback((rawData: RawDiagnosticDataFromFirebase | null): DiagnosticData => {
    if (!rawData) {
      return {
        timestamp: Date.now(),
        parameters: {},
        systemStatus: StatusEnum.UNKNOWN,
        dataValid: false,
        dtcs: []
      };
    }

    const timestamp = typeof rawData.timestamp === 'number' ? rawData.timestamp : Date.now();
    const parameters = rawData.parameters || {};
    const dataValid = rawData.dataValid === undefined ? true : rawData.dataValid;
    const dtcs = rawData.dtcs || [];  // Get DTCs from raw data

    // Calculate overall system status based on parameter validity and DTCs
    let systemStatus = StatusEnum.NORMAL;
    if (!dataValid) {
      systemStatus = StatusEnum.UNKNOWN;
    } else {
      const hasCritical = Object.values(parameters).some(p => !p.isValid) || 
                         dtcs.some(dtc => dtc.severity === 'critical');
      const hasWarning = Object.values(parameters).some(p => p.value < p.min || p.value > p.max) ||
                        dtcs.some(dtc => dtc.severity === 'warning');
      
      if (hasCritical) systemStatus = StatusEnum.CRITICAL;
      else if (hasWarning) systemStatus = StatusEnum.WARNING;
    }

    return {
      timestamp,
      protocol: rawData.protocol,
      parameters,
      systemStatus,
      dataValid,
      dtcs
    };
  }, []);

  useEffect(() => {
    // currentUser is now obtained at the hook's top level
    const userUID = currentUser?.uid;

    if (!motorcycleId) {
      setError("No motorcycle ID provided.");
      setCurrentData(prev => ({ ...prev, dataValid: false, systemStatus: StatusEnum.UNKNOWN }));
      return;
    }
    if (!userUID) {
      setError("User UID is not set.");
      setCurrentData(prev => ({ ...initialData, dataValid: false, systemStatus: StatusEnum.UNKNOWN }));
      return;
    }
    
    const dbPath = `users/${userUID}/motorcycles/${motorcycleId}/latest`; // Use dynamic userUID
    const dataRef = ref(firebaseDB, dbPath);

    const listener = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.val() as RawDiagnosticDataFromFirebase;
        setCurrentData(processFirebaseData(rawData));
        setError(null);
      } else {
        setError(`No data at path: ${dbPath}. Waiting for data...`);
        setCurrentData(processFirebaseData(null));
      }
    }, (err) => {
      console.error("Error fetching data from Firebase RTDB:", err);
      setError(`Error fetching data: ${(err as Error).message}`);
      setCurrentData(processFirebaseData(null));
    });

    return () => {
      off(dataRef, 'value', listener);
    };
  }, [motorcycleId, processFirebaseData, currentUser]); // Added currentUser to dependencies

  return { currentData, error, setCurrentData };
}
