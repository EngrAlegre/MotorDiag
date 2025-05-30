import type { DiagnosticStatus } from './types';
import { DiagnosticStatus as DS } from './types'; // Renaming to avoid conflict with type-only import

export const STATUS_THRESHOLDS = {
  batteryVoltage: { warning: 12.0, critical: 11.5 }, // Volts
  engineRPM: { warning: 10000, critical: 11500 }, // RPM (example, adjust per bike)
  coolantTemp: { warning: 95, critical: 105 }, // Celsius
  oilLevel: { warning: 30, critical: 15 }, // Percentage
  fuelLevel: { warning: 15, critical: 5 }, // Percentage
};

export const STATUS_COLORS: Record<DiagnosticStatus, string> = {
  [DS.NORMAL]: 'bg-accent', // Electric Lime
  [DS.WARNING]: 'bg-yellow-400', // Standard Yellow
  [DS.CRITICAL]: 'bg-destructive', // Theme's destructive color (Red)
  [DS.UNKNOWN]: 'bg-gray-500',
};

export const STATUS_TEXT_COLORS: Record<DiagnosticStatus, string> = {
  [DS.NORMAL]: 'text-accent-foreground',
  [DS.WARNING]: 'text-yellow-900',
  [DS.CRITICAL]: 'text-destructive-foreground',
  [DS.UNKNOWN]: 'text-gray-100',
};

export const DIAGNOSTIC_ITEMS_CONFIG = [
  { key: 'batteryVoltage', name: 'Battery Voltage', unit: 'V', icon: 'BatteryFull' as const, statusKey: 'batteryStatus' as const },
  { key: 'engineRPM', name: 'Engine RPM', unit: 'RPM', icon: 'Gauge' as const, statusKey: 'engineStatus' as const },
  { key: 'coolantTemp', name: 'Coolant Temp', unit: '°C', icon: 'Thermometer' as const, statusKey: 'coolantStatus' as const },
  { key: 'oilLevel', name: 'Oil Level', unit: '%', icon: 'Droplets' as const, statusKey: 'oilStatus' as const },
  { key: 'fuelLevel', name: 'Fuel Level', unit: '%', icon: 'Fuel' as const, statusKey: 'fuelStatus' as const },
  { key: 'vehicleSpeed', name: 'Vehicle Speed', unit: 'km/h', icon: 'Speedometer' as const },
  { key: 'throttlePosition', name: 'Throttle Position', unit: '%', icon: 'SlidersHorizontal' as const },
  { key: 'systemStatus', name: 'System Status', unit: '', icon: 'ShieldCheck' as const, isOverallStatus: true },
] as const;

export const MAX_HISTORY_LENGTH = 50; // Number of data points for AI
