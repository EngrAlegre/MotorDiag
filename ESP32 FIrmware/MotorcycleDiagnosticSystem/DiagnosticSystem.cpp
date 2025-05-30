#include "DiagnosticSystem.h"
#include <cstdint>

// Constructor
DiagnosticSystem::DiagnosticSystem(CanBus& canBus) : _canBus(canBus) {
    // Initialize data structure
    _data.engineRPM = 0.0f;
    _data.batteryVoltage = 0.0f;
    _data.oilLevel = 0.0f;
    _data.coolantTemp = 0.0f;
    _data.fuelLevel = 0.0f;
    _data.vehicleSpeed = 0.0f;
    _data.throttlePosition = 0.0f;
    _data.hasDTCs = false;
    _data.dtcCount = 0;
}

// Update all diagnostic data
bool DiagnosticSystem::update() {
    bool success = true;
    
    // Update each subsystem
    success &= _updateEngineStatus();
    success &= _updateBatteryStatus();
    success &= _updateOilStatus();
    success &= _updateCoolantStatus();
    success &= _updateFuelStatus();
    success &= _updateVehicleData();
    
    // Check for DTCs
    _data.dtcCount = checkDTCs(_data.dtcCodes, 10);
    _data.hasDTCs = (_data.dtcCount > 0);
    
    return success;
}

// Get current diagnostic data
DiagnosticData DiagnosticSystem::getDiagnosticData() {
    return _data;
}

// In checkDTCs, clearDTCs, _updateBatteryStatus, _updateEngineStatus, _updateOilStatus, _updateCoolantStatus, _updateFuelStatus, and _updateVehicleData, replace fixed getter calls with dynamic lookups.

// Example for _updateEngineStatus:
bool DiagnosticSystem::_updateEngineStatus() {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("EngineRPM");
    if (it != params.end() && it->second.isValid) {
        float rpm = it->second.value;
        // Store the value in the parameter map
        params["EngineRPM"] = it->second;
    }
    return true;
}

// Example for _updateBatteryStatus:
bool DiagnosticSystem::_updateBatteryStatus() {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("BatteryVoltage");
    if (it != params.end() && it->second.isValid) {
        float voltage = it->second.value;
        // Store the value in the parameter map
        params["BatteryVoltage"] = it->second;
    }
    return true;
}

// Example for _updateOilStatus:
bool DiagnosticSystem::_updateOilStatus() {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("OilLevel");
    if (it != params.end() && it->second.isValid) {
        float level = it->second.value;
        // Store the value in the parameter map
        params["OilLevel"] = it->second;
    }
    return true;
}

// Example for _updateCoolantStatus:
bool DiagnosticSystem::_updateCoolantStatus() {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("CoolantTemperature");
    if (it != params.end() && it->second.isValid) {
        float temp = it->second.value;
        // Store the value in the parameter map
        params["CoolantTemperature"] = it->second;
    }
    return true;
}

// Example for _updateFuelStatus:
bool DiagnosticSystem::_updateFuelStatus() {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("FuelLevel");
    if (it != params.end() && it->second.isValid) {
        float level = it->second.value;
        // Store the value in the parameter map
        params["FuelLevel"] = it->second;
    }
    return true;
}

// Example for _updateVehicleData:
bool DiagnosticSystem::_updateVehicleData() {
    auto params = _canBus.getDetectedParameters();
    
    // Update Vehicle Speed
    auto speedIt = params.find("VehicleSpeed");
    if (speedIt != params.end() && speedIt->second.isValid) {
        float speed = speedIt->second.value;
        // Store the value in the parameter map
        params["VehicleSpeed"] = speedIt->second;
    }
    
    // Update Throttle Position
    auto throttleIt = params.find("ThrottlePosition");
    if (throttleIt != params.end() && throttleIt->second.isValid) {
        float position = throttleIt->second.value;
        // Store the value in the parameter map
        params["ThrottlePosition"] = throttleIt->second;
    }
    return true;
}

// Implement dynamic DTC handling in DiagnosticSystem.cpp

// Example for checkDTCs:
uint8_t DiagnosticSystem::checkDTCs(uint16_t* dtcCodes, uint8_t maxCodes) {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("DTCs");
    if (it != params.end() && it->second.isValid) {
        // Get the DTCs value from the parameter map
        float dtcValue = it->second.value;
        String dtcString = String(dtcValue);
        
        int count = 0;
        int startIndex = 0;
        int endIndex = dtcString.indexOf(',');
        
        // Parse the comma-separated DTC codes
        while (endIndex >= 0 && count < maxCodes) {
            dtcCodes[count++] = dtcString.substring(startIndex, endIndex).toInt();
            startIndex = endIndex + 1;
            endIndex = dtcString.indexOf(',', startIndex);
        }
        
        // Handle the last DTC code if there is one
        if (startIndex < dtcString.length() && count < maxCodes) {
            dtcCodes[count++] = dtcString.substring(startIndex).toInt();
        }
        
        // Update the DTCs parameter in the map
        params["DTCs"] = it->second;
        return count;
    }
    return 0;
}

// Example for clearDTCs:
bool DiagnosticSystem::clearDTCs() {
    auto params = _canBus.getDetectedParameters();
    auto it = params.find("DTCs");
    if (it != params.end()) {
        // Create a new parameter with cleared values
        Parameter clearedParam;
        clearedParam.value = 0.0f;
        clearedParam.isValid = false;
        
        // Update the parameter in the map
        params["DTCs"] = clearedParam;
        return true;
    }
    return false;
} 