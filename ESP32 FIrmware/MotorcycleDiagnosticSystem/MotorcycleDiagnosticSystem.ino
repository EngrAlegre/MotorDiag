/**
 * Motorcycle Diagnostic System - Main Sketch
 * 
 * This sketch integrates custom libraries to create a complete motorcycle diagnostic system
 * for Yamaha Exciter/MX King/Y15ZR using ESP32 and CAN bus communication.
 * 
 * Hardware:
 * - ESP32 microcontroller
 * - TJA1050 CAN Bus Transceiver
 * - Buck converter (12V to 5V)
 * - Filtering capacitors
 * 
 * Libraries:
 * - CanBus: For CAN communication with ECU
 * - FirebaseESP32: For WiFi and Firebase connectivity
 * - DiagnosticSystem: For processing diagnostic data
 * - DeviceProvisioning: For device provisioning
 * 
 * Created for Yamaha motorcycle diagnostic system project.
 */

// Include custom libraries
#include "CanBus.h"
#include "FirebaseESP32.h"
#include "DiagnosticSystem.h"
#include "DeviceProvisioning.h"
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Firebase Configuration
#define API_KEY "AIzaSyCTMt2Ou_5y7eiw9-XoCCf28ZdRgBDjfvg"
#define DATABASE_URL "https://motor-42313-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Device Identification
#define DEVICE_ID "yamaha_001"  // Unique identifier for this motorcycle

// Update intervals
#define DIAGNOSTIC_UPDATE_INTERVAL 1000  // 1 second
#define FIREBASE_UPLOAD_INTERVAL 5000    // 5 seconds

// Status LED pin
#define STATUS_LED_PIN 2  // Built-in LED on most ESP32 boards

// JSON buffer size
#define JSON_BUFFER_SIZE 4096

// Reset button pin
#define RESET_BUTTON_PIN 0  // GPIO0 is often available on ESP32 dev boards

// Status thresholds
#define BATTERY_WARNING_THRESHOLD 11.5
#define BATTERY_CRITICAL_THRESHOLD 10.5
#define ENGINE_WARNING_THRESHOLD 8000
#define ENGINE_CRITICAL_THRESHOLD 10000
#define COOLANT_WARNING_THRESHOLD 90
#define COOLANT_CRITICAL_THRESHOLD 100
#define OIL_WARNING_THRESHOLD 20
#define OIL_CRITICAL_THRESHOLD 10
#define FUEL_WARNING_THRESHOLD 20
#define FUEL_CRITICAL_THRESHOLD 10

// Status enum
enum SystemStatus {
    STATUS_NORMAL = 0,
    STATUS_WARNING = 1,
    STATUS_CRITICAL = 2
};

// Create instances of custom libraries
CanBus canBus;
FirebaseESP32 firebase(API_KEY, DATABASE_URL, "", "", DEVICE_ID);
DiagnosticSystem diagnostics(canBus);
DeviceProvisioning provisioning;

// Variables for timing
unsigned long lastDiagnosticUpdate = 0;
unsigned long lastFirebaseUpload = 0;
unsigned long connectionAttemptTime = 0;

// System state variables
bool systemInitialized = false;
bool wifiConnected = false;
bool firebaseAuthenticated = false;
int connectionAttempts = 0;
const int maxConnectionAttempts = 5;

// JSON buffer
char jsonBuffer[JSON_BUFFER_SIZE];

// Function prototypes
void initSystem();
void updateDiagnostics();
void uploadToFirebase();
void handleErrors();
void blinkLED(int times, int delayMs);
void initSensors();
void initDisplay();
void initGPS();
void initOBD();
void collectDynamicDiagnosticData(JsonObject& dataObj);
SystemStatus calculateBatteryStatus(float voltage);
SystemStatus calculateEngineStatus(float rpm);
SystemStatus calculateCoolantStatus(float temp);
SystemStatus calculateOilStatus(float level);
SystemStatus calculateFuelStatus(float level);
SystemStatus calculateSystemStatus(const DiagnosticData& data);

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Serial.println("\n\nYamaha Motorcycle Diagnostic System");
  Serial.println("-----------------------------------");
  
  // Initialize status LED
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Initial LED blink to indicate power-on
  blinkLED(3, 200);
  
  // Initialize device provisioning
  provisioning.begin();
  
  // If device is not provisioned, enter provisioning mode
  if (!provisioning.isDeviceProvisioned()) {
    Serial.println("Device not provisioned. Entering provisioning mode...");
    while (!provisioning.isDeviceProvisioned()) {
      provisioning.handleClient();
      delay(10);
    }
  }
  
  // Initialize system
  initSystem();
  
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP); // Initialize reset button pin
}

void loop() {
  // Current time
  unsigned long currentMillis = millis();
  
  // Check if system is initialized
  if (!systemInitialized) {
    // Retry initialization after delay if previous attempt failed
    if (currentMillis - connectionAttemptTime > 10000) {
      Serial.println("Retrying system initialization...");
      initSystem();
    }
    return;
  }
  
  // Update diagnostics at regular intervals
  if (currentMillis - lastDiagnosticUpdate >= DIAGNOSTIC_UPDATE_INTERVAL) {
    updateDiagnostics();
    lastDiagnosticUpdate = currentMillis;
  }
  
  // Upload data to Firebase at regular intervals
  if (currentMillis - lastFirebaseUpload >= FIREBASE_UPLOAD_INTERVAL) {
    uploadToFirebase();
    lastFirebaseUpload = currentMillis;
  }
  
  // Check WiFi connection and Firebase authentication
  if (!wifiConnected || !firebaseAuthenticated) {
    handleErrors();
  }
  
  provisioning.checkPhysicalResetButton(RESET_BUTTON_PIN); // Check for physical reset
}

void initSystem() {
  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Initialize SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS Mount Failed");
    return;
  }
  
  // Initialize device provisioning
  provisioning.begin();
  
  // Check if device is provisioned
  if (provisioning.isDeviceProvisioned()) {
    // Load stored configuration
    String userUid = provisioning.getUserUid();
    String motorcycleVin = provisioning.getMotorcycleVin();
    
    // Load and set Firebase ID token
    if (provisioning.loadIdToken()) {
      String idToken = provisioning.getIdToken();
      if (idToken.length() > 0) {
        // Set Firebase authentication
        firebase.setToken(idToken.c_str());
        
        // Verify Firebase connection
        if (firebase.authenticate()) {
          firebaseAuthenticated = true;
  Serial.println("Firebase authentication successful");
        } else {
          Serial.println("Firebase authentication failed");
          firebaseAuthenticated = false;
        }
      }
    }
  }
  
  // Initialize sensors
  initSensors();
  
  // Initialize display
  initDisplay();
  
  // Initialize GPS
  initGPS();
  
  // Initialize OBD-II
  initOBD();
}

void updateDiagnostics() {
  // Update diagnostic data
  if (diagnostics.update()) {
    // Get diagnostic data
    DiagnosticData data = diagnostics.getDiagnosticData();
    
    // Calculate statuses
    SystemStatus batteryStatus = calculateBatteryStatus(data.batteryVoltage);
    SystemStatus engineStatus = calculateEngineStatus(data.engineRPM);
    SystemStatus coolantStatus = calculateCoolantStatus(data.coolantTemp);
    SystemStatus oilStatus = calculateOilStatus(data.oilLevel);
    SystemStatus fuelStatus = calculateFuelStatus(data.fuelLevel);
    SystemStatus systemStatus = calculateSystemStatus(data);
    
    // Toggle LED to indicate active diagnostics
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    
    // Print diagnostic data to serial
    Serial.println("\n--- Diagnostic Data ---");
    Serial.print("Battery: ");
    Serial.print(data.batteryVoltage);
    Serial.print("V (");
    
    switch (batteryStatus) {
      case STATUS_NORMAL:
        Serial.println("Normal)");
        break;
      case STATUS_WARNING:
        Serial.println("Warning)");
        break;
      case STATUS_CRITICAL:
        Serial.println("Critical)");
        break;
      default:
        Serial.println("Unknown)");
    }
    
    Serial.print("Engine: ");
    Serial.print(data.engineRPM);
    Serial.print(" RPM (");
    
    switch (engineStatus) {
      case STATUS_NORMAL:
        Serial.println("Normal)");
        break;
      case STATUS_WARNING:
        Serial.println("Warning)");
        break;
      case STATUS_CRITICAL:
        Serial.println("Critical)");
        break;
      default:
        Serial.println("Unknown)");
    }
    
    Serial.print("Coolant: ");
    Serial.print(data.coolantTemp);
    Serial.print("°C (");
    
    switch (coolantStatus) {
      case STATUS_NORMAL:
        Serial.println("Normal)");
        break;
      case STATUS_WARNING:
        Serial.println("Warning)");
        break;
      case STATUS_CRITICAL:
        Serial.println("Critical)");
        break;
      default:
        Serial.println("Unknown)");
    }
    
    Serial.print("Oil Level: ");
    Serial.print(data.oilLevel);
    Serial.print("% (");
    
    switch (oilStatus) {
      case STATUS_NORMAL:
        Serial.println("Normal)");
        break;
      case STATUS_WARNING:
        Serial.println("Warning)");
        break;
      case STATUS_CRITICAL:
        Serial.println("Critical)");
        break;
      default:
        Serial.println("Unknown)");
    }
    
    Serial.print("Fuel Level: ");
    Serial.print(data.fuelLevel);
    Serial.print("% (");
    
    switch (fuelStatus) {
      case STATUS_NORMAL:
        Serial.println("Normal)");
        break;
      case STATUS_WARNING:
        Serial.println("Warning)");
        break;
      case STATUS_CRITICAL:
        Serial.println("Critical)");
        break;
      default:
        Serial.println("Unknown)");
    }
    
    Serial.print("System Status: ");
    switch (systemStatus) {
      case STATUS_NORMAL:
        Serial.println("Normal");
        break;
      case STATUS_WARNING:
        Serial.println("Warning");
        break;
      case STATUS_CRITICAL:
        Serial.println("Critical");
        break;
      default:
        Serial.println("Unknown");
    }
    
    if (data.hasDTCs) {
      Serial.print("DTCs: ");
      for (int i = 0; i < data.dtcCount; i++) {
        Serial.print(data.dtcCodes[i]);
        if (i < data.dtcCount - 1) Serial.print(", ");
      }
      Serial.println();
    }
  } else {
    Serial.println("Failed to update diagnostic data");
  }
}

void uploadToFirebase() {
    if (!wifiConnected) {
        Serial.println("Cannot upload to Firebase: WiFi not connected");
        return;
    }

    // Get current diagnostic data
    DiagnosticData data = diagnostics.getDiagnosticData();
    
    // Calculate statuses
    SystemStatus batteryStatus = calculateBatteryStatus(data.batteryVoltage);
    SystemStatus engineStatus = calculateEngineStatus(data.engineRPM);
    SystemStatus coolantStatus = calculateCoolantStatus(data.coolantTemp);
    SystemStatus oilStatus = calculateOilStatus(data.oilLevel);
    SystemStatus fuelStatus = calculateFuelStatus(data.fuelLevel);
    SystemStatus systemStatus = calculateSystemStatus(data);
    
    // Create JSON object
    StaticJsonDocument<JSON_BUFFER_SIZE> doc;
    JsonObject root = doc.to<JsonObject>();
    
    // Add timestamp
    root["timestamp"] = millis();
    
    // Add raw values
    root["batteryVoltage"] = data.batteryVoltage;
    root["engineRPM"] = data.engineRPM;
    root["coolantTemp"] = data.coolantTemp;
    root["oilLevel"] = data.oilLevel;
    root["fuelLevel"] = data.fuelLevel;
    root["vehicleSpeed"] = data.vehicleSpeed;
    root["throttlePosition"] = data.throttlePosition;
    
    // Add status values
    root["batteryStatus"] = batteryStatus;
    root["engineStatus"] = engineStatus;
    root["coolantStatus"] = coolantStatus;
    root["oilStatus"] = oilStatus;
    root["fuelStatus"] = fuelStatus;
    root["systemStatus"] = systemStatus;
    
    // Add DTC information
    root["hasDTCs"] = data.hasDTCs;
    if (data.hasDTCs) {
        JsonArray dtcArray = root.createNestedArray("dtcCodes");
        for (int i = 0; i < data.dtcCount; i++) {
            dtcArray.add(data.dtcCodes[i]);
        }
    }
    
    // Convert to string
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Get user UID and motorcycle VIN from provisioning
    String uid = provisioning.getUserUid();
    String vin = provisioning.getMotorcycleVin();
    
    // Create the path for this data point
    String dataPath = "/users/" + uid + "/motorcycles/" + vin + "/data/" + String(millis());
    
    // Upload to Firebase using sendData
    if (firebase.sendData(dataPath.c_str(), jsonString.c_str())) {
        Serial.println("Data uploaded to Firebase successfully");
    } else {
        Serial.println("Failed to upload data to Firebase");
    }
}

void handleErrors() {
  // Check WiFi connection
  if (!wifiConnected) {
    Serial.println("Attempting to reconnect to WiFi...");
    // Use provisioned credentials
    String ssid = provisioning.getWifiSSID();
    String password = provisioning.getWifiPassword();
    wifiConnected = firebase.connectWiFi(ssid.c_str(), password.c_str(), 10000);
    if (wifiConnected) {
      Serial.println("WiFi reconnected successfully");
      connectionAttempts = 0;
    } else {
      Serial.println("Failed to reconnect to WiFi");
      connectionAttempts++;
      if (connectionAttempts >= maxConnectionAttempts) {
        Serial.println("Too many connection attempts, restarting...");
        delay(1000);
        ESP.restart();
      }
      return;
    }
  }
  
  // Check Firebase authentication
  if (!firebaseAuthenticated) {
    Serial.println("Attempting to reauthenticate with Firebase...");
    firebaseAuthenticated = firebase.authenticate();
    
    if (firebaseAuthenticated) {
      Serial.println("Firebase reauthenticated successfully");
      connectionAttempts = 0;
      
      // Get user UID and motorcycle VIN from provisioning
      String uid = provisioning.getUserUid();
      String vin = provisioning.getMotorcycleVin();
      
      // Send status update to Firebase
      String statusJson = "{\"status\":\"reconnected\",\"device_id\":\"" DEVICE_ID "\",\"timestamp\":" + String(millis()) + "}";
      String statusPath = "/users/" + uid + "/motorcycles/" + vin + "/status";
      firebase.sendData(statusPath.c_str(), statusJson.c_str());
    } else {
      Serial.println("Failed to reauthenticate with Firebase");
      connectionAttempts++;
      
      // If too many attempts, restart the ESP32
      if (connectionAttempts >= maxConnectionAttempts) {
        Serial.println("Too many connection attempts, restarting...");
        delay(1000);
        ESP.restart();
      }
    }
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(delayMs);
  }
}

// Add missing initialization functions
void initSensors() {
  // Initialize all sensors
  Serial.println("Initializing sensors...");
  // Add sensor initialization code here
}

void initDisplay() {
  // Initialize display
  Serial.println("Initializing display...");
  // Add display initialization code here
}

void initGPS() {
  // Initialize GPS module
  Serial.println("Initializing GPS...");
  // Add GPS initialization code here
}

void initOBD() {
  // Initialize OBD-II interface
  Serial.println("Initializing OBD-II...");
  // Add OBD-II initialization code here
}

// Add a function to collect dynamic diagnostic data
void collectDynamicDiagnosticData(JsonObject& dataObj) {
  // Example: Replace these with actual dynamic detection logic
  // For each detected parameter, add to dataObj
  // In real use, loop over detected parameters from the CAN bus or sensors
  dataObj["batteryVoltage"] = diagnostics.getDiagnosticData().batteryVoltage;
  dataObj["engineRPM"] = diagnostics.getDiagnosticData().engineRPM;
  dataObj["coolantTemp"] = diagnostics.getDiagnosticData().coolantTemp;
  dataObj["oilLevel"] = diagnostics.getDiagnosticData().oilLevel;
  dataObj["fuelLevel"] = diagnostics.getDiagnosticData().fuelLevel;
  dataObj["vehicleSpeed"] = diagnostics.getDiagnosticData().vehicleSpeed;
  dataObj["throttlePosition"] = diagnostics.getDiagnosticData().throttlePosition;
  // Add more parameters as detected
}

// Function to calculate battery status
SystemStatus calculateBatteryStatus(float voltage) {
    if (voltage <= BATTERY_CRITICAL_THRESHOLD) return STATUS_CRITICAL;
    if (voltage <= BATTERY_WARNING_THRESHOLD) return STATUS_WARNING;
    return STATUS_NORMAL;
}

// Function to calculate engine status
SystemStatus calculateEngineStatus(float rpm) {
    if (rpm >= ENGINE_CRITICAL_THRESHOLD) return STATUS_CRITICAL;
    if (rpm >= ENGINE_WARNING_THRESHOLD) return STATUS_WARNING;
    return STATUS_NORMAL;
}

// Function to calculate coolant status
SystemStatus calculateCoolantStatus(float temp) {
    if (temp >= COOLANT_CRITICAL_THRESHOLD) return STATUS_CRITICAL;
    if (temp >= COOLANT_WARNING_THRESHOLD) return STATUS_WARNING;
    return STATUS_NORMAL;
}

// Function to calculate oil status
SystemStatus calculateOilStatus(float level) {
    if (level <= OIL_CRITICAL_THRESHOLD) return STATUS_CRITICAL;
    if (level <= OIL_WARNING_THRESHOLD) return STATUS_WARNING;
    return STATUS_NORMAL;
}

// Function to calculate fuel status
SystemStatus calculateFuelStatus(float level) {
    if (level <= FUEL_CRITICAL_THRESHOLD) return STATUS_CRITICAL;
    if (level <= FUEL_WARNING_THRESHOLD) return STATUS_WARNING;
    return STATUS_NORMAL;
}

// Function to calculate overall system status
SystemStatus calculateSystemStatus(const DiagnosticData& data) {
    SystemStatus status = STATUS_NORMAL;
    
    // Check each subsystem
    status = max(status, calculateBatteryStatus(data.batteryVoltage));
    status = max(status, calculateEngineStatus(data.engineRPM));
    status = max(status, calculateCoolantStatus(data.coolantTemp));
    status = max(status, calculateOilStatus(data.oilLevel));
    status = max(status, calculateFuelStatus(data.fuelLevel));
    
    // Check for DTCs
    if (data.hasDTCs) {
        status = max(status, STATUS_WARNING);
    }
    
    return status;
}
