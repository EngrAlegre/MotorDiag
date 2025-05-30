#ifndef DIAGNOSTIC_SYSTEM_H
#define DIAGNOSTIC_SYSTEM_H

#include "CanBus.h"
#include <cstdint>

struct DiagnosticData {
    float engineRPM;
    float batteryVoltage;
    float oilLevel;
    float coolantTemp;
    float fuelLevel;
    float vehicleSpeed;
    float throttlePosition;
    bool hasDTCs;
    uint16_t dtcCodes[10];
    uint8_t dtcCount;
};

class DiagnosticSystem {
public:
    DiagnosticSystem(CanBus& canBus);
    bool update();
    DiagnosticData getDiagnosticData();
    uint8_t checkDTCs(uint16_t* dtcCodes, uint8_t maxCodes);
    bool clearDTCs();

private:
    CanBus& _canBus;
    DiagnosticData _data;
    bool _updateEngineStatus();
    bool _updateBatteryStatus();
    bool _updateOilStatus();
    bool _updateCoolantStatus();
    bool _updateFuelStatus();
    bool _updateVehicleData();
};

#endif