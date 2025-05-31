#ifndef CAN_BUS_H
#define CAN_BUS_H

#include <driver/gpio.h>
#include <driver/twai.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include <map>

// Protocol types
enum class ProtocolType {
    UNKNOWN,
    CAN_11BIT,    // Standard CAN
    CAN_29BIT,    // Extended CAN
    ISO_9141,     // ISO 9141-2
    ISO_14230,    // ISO 14230 (KWP2000)
    ISO_15765,    // ISO 15765 (CAN)
    PWM,          // PWM (Ford)
    VPW,          // VPW (GM)
    ISO_9141_2,   // ISO 9141-2
    ISO_14230_4,  // ISO 14230-4
    ISO_15765_4   // ISO 15765-4
};

// Parameter structure
struct Parameter {
    String name;
    String unit;
    float value;
    float min;
    float max;
    bool isValid;
    unsigned long lastUpdate;
};

class CanBus {
private:
    static const int CAN_RX_PIN = 4;  // GPIO4 for CAN RX
    static const int CAN_TX_PIN = 5;  // GPIO5 for CAN TX
    static const int CAN_SPEED = 500000;  // 500 kbps
    twai_general_config_t g_config;
    twai_timing_config_t t_config;
    twai_filter_config_t f_config;
    ProtocolType currentProtocol;
    std::map<String, Parameter> detectedParameters;
    unsigned long lastProtocolDetection;
    bool isInitialized;

    // Protocol detection methods
    bool detectCAN11Bit();
    bool detectCAN29Bit();
    bool detectISO9141();
    bool detectISO14230();
    bool detectISO15765();
    bool detectPWM();
    bool detectVPW();

    // Parameter detection methods
    void detectParameters();
    void updateParameter(const String& name, float value, const String& unit = "");
    void analyzeDataPattern(const uint8_t* data, size_t length);

public:
    CanBus();
    bool begin();
    bool detectProtocol();
    bool sendRequest(uint32_t id, const uint8_t* data, size_t length);
    bool receiveResponse(uint32_t* id, uint8_t* data, size_t* length);
    void update();
    ProtocolType getCurrentProtocol();
    std::map<String, Parameter> getDetectedParameters();
    bool isConnected();
    void reset();
};

#endif 