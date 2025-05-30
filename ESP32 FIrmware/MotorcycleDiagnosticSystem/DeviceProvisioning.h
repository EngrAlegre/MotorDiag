#ifndef DEVICE_PROVISIONING_H
#define DEVICE_PROVISIONING_H

#include <WiFi.h>
#include <WebServer.h>
#include <EEPROM.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

// EEPROM addresses for storing configuration
#define EEPROM_SIZE 512
#define ADDR_USER_UID 0
#define ADDR_MOTORCYCLE_VIN 32
#define ADDR_IS_PROVISIONED 64
#define ADDR_ID_TOKEN 96
#define ADDR_WIFI_SSID 128
#define ADDR_WIFI_PASSWORD 256
#define MAX_ID_TOKEN_LENGTH 512
#define MAX_WIFI_SSID_LENGTH 32
#define MAX_WIFI_PASSWORD_LENGTH 64

// WiFi AP configuration
#define AP_SSID "MotoVision_Setup"
#define AP_PASSWORD "12345678"  // Simple password for setup
#define AP_CHANNEL 1
#define AP_MAX_CONN 4

class DeviceProvisioning {
private:
    WebServer server;
    bool isProvisioned;
    String userUid;
    String motorcycleVin;
    String idToken;
    String wifiSSID;
    String wifiPassword;
    bool loadUserUid();
    bool loadMotorcycleVin();
    bool saveUserUid(const String& uid);
    bool saveMotorcycleVin(const String& vin);
    bool saveIdToken(const String& token);
    void handleRoot();
    void handleProvision();
    void handleReset();
    void handleNotFound();
    void startAP();
    void stopAP();
    void setupWebServer();
    void clearConfiguration();
    void saveConfiguration();
    bool loadConfiguration();
    void handleTokenProvision();
    void handleQRScannerJS();

public:
    DeviceProvisioning();
    void begin();
    void handleClient();
    bool isDeviceProvisioned();
    String getUserUid();
    String getMotorcycleVin();
    bool loadIdToken();
    String getIdToken();
    String getWifiSSID();
    String getWifiPassword();
    void reset();
    void checkPhysicalResetButton(int pin);
};

#endif 