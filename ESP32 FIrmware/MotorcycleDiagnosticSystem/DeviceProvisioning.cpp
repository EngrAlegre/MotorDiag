#include "DeviceProvisioning.h"
#include "qr_scanner.h"

DeviceProvisioning::DeviceProvisioning() : server(80) {
    isProvisioned = false;
    userUid = "";
    motorcycleVin = "";
    idToken = "";
}

void DeviceProvisioning::begin() {
    // Initialize EEPROM
    EEPROM.begin(EEPROM_SIZE);
    
    // Try to load existing configuration
    if (loadConfiguration()) {
        Serial.println("Device is already provisioned");
        return;
    }
    
    // If not provisioned, start AP mode
    Serial.println("Starting provisioning mode...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASSWORD, AP_CHANNEL, 0, AP_MAX_CONN);
    
    IPAddress IP = WiFi.softAPIP();
    Serial.print("AP IP address: ");
    Serial.println(IP);
    
    setupWebServer();
    server.begin();
}

void DeviceProvisioning::setupWebServer() {
    server.on("/", HTTP_GET, [this]() { handleRoot(); });
    server.on("/provision", HTTP_POST, [this]() { handleProvision(); });
    server.on("/reset", HTTP_POST, [this]() { handleReset(); });
    server.on("/token", HTTP_POST, [this]() { handleTokenProvision(); });
    server.on("/qr-scanner.js", HTTP_GET, [this]() { handleQRScannerJS(); });
    server.onNotFound([this]() { handleNotFound(); });
}

void DeviceProvisioning::handleQRScannerJS() {
    server.send(200, "application/javascript", QR_SCANNER_JS);
}

void DeviceProvisioning::handleRoot() {
    String html = "<html><head>";
    html += "<title>MotoVision Device Setup</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>";
    html += "body { font-family: Arial, sans-serif; margin: 20px; }";
    html += ".container { max-width: 400px; margin: 0 auto; }";
    html += "input,textarea,button { width: 100%; padding: 8px; margin: 8px 0; }";
    html += "button { background: #4CAF50; color: white; padding: 10px; border: none; width: 100%; cursor: pointer; }";
    html += ".reset-btn { background: #e53935; margin-top: 16px; }";
    html += ".scan-btn { background: #2196F3; margin-top: 8px; }";
    html += "#video-container { width: 100%; margin: 20px 0; display: none; }";
    html += "#qr-video { width: 100%; }";
    html += "</style>";
    html += "<script src='/qr-scanner.js'></script>";
    html += "</head><body>";
    html += "<div class='container'>";
    html += "<h2>MotoVision Device Setup</h2>";
    html += "<form action='/provision' method='post'>";
    html += "<input type='text' name='userUid' placeholder='User UID' required><br>";
    html += "<input type='text' name='motorcycleVin' placeholder='Motorcycle VIN' required><br>";
    html += "<input type='text' name='wifiSSID' placeholder='WiFi SSID' required><br>";
    html += "<input type='password' name='wifiPassword' placeholder='WiFi Password' required><br>";
    html += "<button type='submit'>Save Configuration</button>";
    html += "</form>";
    html += "<form action='/token' method='post'>";
    html += "<textarea name='idToken' placeholder='Paste your Firebase ID Token here' rows='4' required></textarea><br>";
    html += "<button type='submit'>Save Firebase Token</button>";
    html += "</form>";
    html += "<form action='/reset' method='post'>";
    html += "<button type='submit' class='reset-btn'>Reset Device</button>";
    html += "</form>";
    html += "<button id='scan-qr-btn' class='scan-btn'>Scan QR Code</button>";
    html += "<div id='video-container'>";
    html += "<video id='qr-video'></video>";
    html += "</div>";
    html += "<script>";
    html += "document.addEventListener('DOMContentLoaded', function() {";
    html += "  let scanner = null;";
    html += "  let videoContainer = document.getElementById('video-container');";
    html += "  let video = document.getElementById('qr-video');";
    html += "  let scanButton = document.getElementById('scan-qr-btn');";
    html += "  ";
    html += "  function onQRCodeScanned(result) {";
    html += "    console.log('QR Code scanned:', result);";
    html += "    try {";
    html += "      const data = JSON.parse(result);";
    html += "      if (data.userUid) document.querySelector('input[name=\"userUid\"]').value = data.userUid;";
    html += "      if (data.motorcycleVin) document.querySelector('input[name=\"motorcycleVin\"]').value = data.motorcycleVin;";
    html += "      if (data.wifiSSID) document.querySelector('input[name=\"wifiSSID\"]').value = data.wifiSSID;";
    html += "      if (data.wifiPassword) document.querySelector('input[name=\"wifiPassword\"]').value = data.wifiPassword;";
    html += "      if (data.idToken) document.querySelector('textarea[name=\"idToken\"]').value = data.idToken;";
    html += "      alert('QR Code scanned successfully!');";
    html += "      stopScanner();";
    html += "    } catch (e) {";
    html += "      console.error('Error parsing QR code:', e);";
    html += "      alert('Invalid QR code format: ' + e.message);";
    html += "    }";
    html += "  }";
    html += "  ";
    html += "  async function startScanner() {";
    html += "    try {";
    html += "      if (scanner) {";
    html += "        stopScanner();";
    html += "      }";
    html += "      ";
    html += "      scanner = new QRScanner(video, { onResult: onQRCodeScanned });";
    html += "      await scanner.start();";
    html += "      videoContainer.style.display = 'block';";
    html += "      scanButton.textContent = 'Stop Scanner';";
    html += "    } catch (e) {";
    html += "      console.error('Error starting scanner:', e);";
    html += "      alert('Error starting camera: ' + e.message);";
    html += "    }";
    html += "  }";
    html += "  ";
    html += "  function stopScanner() {";
    html += "    if (scanner) {";
    html += "      scanner.stop();";
    html += "      scanner = null;";
    html += "    }";
    html += "    videoContainer.style.display = 'none';";
    html += "    scanButton.textContent = 'Scan QR Code';";
    html += "  }";
    html += "  ";
    html += "  scanButton.addEventListener('click', function() {";
    html += "    if (scanner) {";
    html += "      stopScanner();";
    html += "    } else {";
    html += "      startScanner();";
    html += "    }";
    html += "  });";
    html += "});";
    html += "</script>";
    html += "</div></body></html>";
    
    server.send(200, "text/html", html);
}

void DeviceProvisioning::handleProvision() {
    if (!server.hasArg("userUid") || !server.hasArg("motorcycleVin") || !server.hasArg("wifiSSID") || !server.hasArg("wifiPassword")) {
        server.send(400, "text/plain", "Missing required fields");
        return;
    }
    
    userUid = server.arg("userUid");
    motorcycleVin = server.arg("motorcycleVin");
    wifiSSID = server.arg("wifiSSID");
    wifiPassword = server.arg("wifiPassword");
    
    // Save configuration
    saveConfiguration();
    
    // Send success response
    String html = "<html><head>";
    html += "<title>Setup Complete</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>";
    html += "body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }";
    html += ".container { max-width: 400px; margin: 0 auto; }";
    html += "</style></head><body>";
    html += "<div class='container'>";
    html += "<h2>Setup Complete!</h2>";
    html += "<p>Your device has been configured successfully.</p>";
    html += "<p>You can now close this window and restart your device.</p>";
    html += "</div></body></html>";
    
    server.send(200, "text/html", html);
    
    // Set provisioned flag
    isProvisioned = true;
    
    // Restart ESP32 after a delay
    delay(2000);
    ESP.restart();
}

void DeviceProvisioning::handleReset() {
    clearConfiguration();
    server.send(200, "text/html", "<html><body><h2>Device Reset</h2><p>Device is resetting and will enter provisioning mode.</p></body></html>");
    delay(2000);
    ESP.restart();
}

void DeviceProvisioning::clearConfiguration() {
    for (int i = 0; i < EEPROM_SIZE; i++) {
        EEPROM.write(i, 0);
    }
    EEPROM.commit();
    isProvisioned = false;
    userUid = "";
    motorcycleVin = "";
    idToken = "";
}

void DeviceProvisioning::handleNotFound() {
    server.send(404, "text/plain", "Not found");
}

void DeviceProvisioning::saveConfiguration() {
    // Save user UID
    for (int i = 0; i < userUid.length(); i++) {
        EEPROM.write(ADDR_USER_UID + i, userUid[i]);
    }
    EEPROM.write(ADDR_USER_UID + userUid.length(), 0); // Null terminator
    
    // Save motorcycle VIN
    for (int i = 0; i < motorcycleVin.length(); i++) {
        EEPROM.write(ADDR_MOTORCYCLE_VIN + i, motorcycleVin[i]);
    }
    EEPROM.write(ADDR_MOTORCYCLE_VIN + motorcycleVin.length(), 0); // Null terminator
    
    // Save WiFi SSID
    for (int i = 0; i < wifiSSID.length(); i++) {
        EEPROM.write(ADDR_WIFI_SSID + i, wifiSSID[i]);
    }
    EEPROM.write(ADDR_WIFI_SSID + wifiSSID.length(), 0); // Null terminator
    
    // Save WiFi Password
    for (int i = 0; i < wifiPassword.length(); i++) {
        EEPROM.write(ADDR_WIFI_PASSWORD + i, wifiPassword[i]);
    }
    EEPROM.write(ADDR_WIFI_PASSWORD + wifiPassword.length(), 0); // Null terminator
    
    // Save provisioned flag
    EEPROM.write(ADDR_IS_PROVISIONED, 1);
    
    EEPROM.commit();
}

bool DeviceProvisioning::loadConfiguration() {
    // Check if device is provisioned
    if (EEPROM.read(ADDR_IS_PROVISIONED) != 1) {
        return false;
    }
    
    // Read user UID
    userUid = "";
    for (int i = 0; i < 32; i++) {
        char c = EEPROM.read(ADDR_USER_UID + i);
        if (c == 0) break;
        userUid += c;
    }
    
    // Read motorcycle VIN
    motorcycleVin = "";
    for (int i = 0; i < 32; i++) {
        char c = EEPROM.read(ADDR_MOTORCYCLE_VIN + i);
        if (c == 0) break;
        motorcycleVin += c;
    }
    
    // Read WiFi SSID
    wifiSSID = "";
    for (int i = 0; i < MAX_WIFI_SSID_LENGTH; i++) {
        char c = EEPROM.read(ADDR_WIFI_SSID + i);
        if (c == 0) break;
        wifiSSID += c;
    }
    
    // Read WiFi Password
    wifiPassword = "";
    for (int i = 0; i < MAX_WIFI_PASSWORD_LENGTH; i++) {
        char c = EEPROM.read(ADDR_WIFI_PASSWORD + i);
        if (c == 0) break;
        wifiPassword += c;
    }
    
    isProvisioned = true;
    return true;
}

void DeviceProvisioning::handleClient() {
    server.handleClient();
}

bool DeviceProvisioning::isDeviceProvisioned() {
    return isProvisioned;
}

String DeviceProvisioning::getUserUid() {
    return userUid;
}

String DeviceProvisioning::getMotorcycleVin() {
    return motorcycleVin;
}

void DeviceProvisioning::checkPhysicalResetButton(int pin) {
    static unsigned long buttonPressStart = 0;
    static bool lastState = HIGH;
    bool currentState = digitalRead(pin);
    if (lastState == HIGH && currentState == LOW) {
        buttonPressStart = millis();
    } else if (lastState == LOW && currentState == LOW) {
        if (millis() - buttonPressStart > 5000) { // 5 seconds
            clearConfiguration();
            delay(100);
            ESP.restart();
        }
    }
    lastState = currentState;
}

void DeviceProvisioning::handleTokenProvision() {
    if (server.hasArg("token")) {
        String token = server.arg("token");
        if (saveIdToken(token)) {
            server.send(200, "text/plain", "Token saved successfully");
        } else {
            server.send(500, "text/plain", "Failed to save token");
        }
    } else {
        server.send(400, "text/plain", "Token not provided");
    }
}

bool DeviceProvisioning::saveIdToken(const String& token) {
    if (token.length() > MAX_ID_TOKEN_LENGTH) {
        return false;
    }
    
    // Save token to EEPROM
    for (int i = 0; i < token.length(); i++) {
        EEPROM.write(ADDR_ID_TOKEN + i, token[i]);
    }
    EEPROM.write(ADDR_ID_TOKEN + token.length(), 0); // Null terminator
    return EEPROM.commit();
}

bool DeviceProvisioning::loadIdToken() {
    idToken = "";
    for (int i = 0; i < MAX_ID_TOKEN_LENGTH; i++) {
        char c = EEPROM.read(ADDR_ID_TOKEN + i);
        if (c == 0) break;
        idToken += c;
    }
    return idToken.length() > 0;
}

String DeviceProvisioning::getIdToken() {
    return idToken;
}

String DeviceProvisioning::getWifiSSID() {
    return wifiSSID;
}

String DeviceProvisioning::getWifiPassword() {
    return wifiPassword;
}
