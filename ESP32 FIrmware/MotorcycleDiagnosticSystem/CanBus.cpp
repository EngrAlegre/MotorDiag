#include "CanBus.h"

CanBus::CanBus() {
    g_config.mode = TWAI_MODE_NORMAL;
    g_config.tx_io = (gpio_num_t)CAN_TX_PIN;
    g_config.rx_io = (gpio_num_t)CAN_RX_PIN;
    g_config.clkout_io = TWAI_IO_UNUSED;
    g_config.bus_off_io = TWAI_IO_UNUSED;
    g_config.tx_queue_len = 5;
    g_config.rx_queue_len = 5;
    g_config.alerts_enabled = TWAI_ALERT_NONE;
    g_config.clkout_divider = 0;

    // Manually set timing config for 500kbps
    t_config.brp = 4;
    t_config.tseg_1 = 15;
    t_config.tseg_2 = 4;
    t_config.sjw = 3;
    t_config.triple_sampling = false;

    f_config.acceptance_code = 0;
    f_config.acceptance_mask = 0xFFFFFFFF;
    f_config.single_filter = true;

    currentProtocol = ProtocolType::UNKNOWN;
    lastProtocolDetection = 0;
    isInitialized = false;
}

bool CanBus::begin() {
    if (twai_driver_install(&g_config, &t_config, &f_config) != ESP_OK) {
        Serial.println("Failed to install TWAI driver");
        return false;
    }

    if (twai_start() != ESP_OK) {
        Serial.println("Failed to start TWAI driver");
        return false;
    }

    isInitialized = true;
    Serial.println("TWAI bus initialized successfully");
    return true;
}

bool CanBus::sendRequest(uint32_t id, const uint8_t* data, size_t length) {
    if (!isInitialized) return false;

    twai_message_t message;
    message.identifier = id;
    message.flags = TWAI_MSG_FLAG_NONE;
    message.data_length_code = length;
    memcpy(message.data, data, length);

    return twai_transmit(&message, pdMS_TO_TICKS(100)) == ESP_OK;
}

bool CanBus::receiveResponse(uint32_t* id, uint8_t* data, size_t* length) {
    if (!isInitialized) return false;

    twai_message_t message;
    if (twai_receive(&message, pdMS_TO_TICKS(100)) == ESP_OK) {
        *id = message.identifier;
        *length = message.data_length_code;
        memcpy(data, message.data, message.data_length_code);
        return true;
    }
    return false;
}

void CanBus::update() {
    if (!isInitialized) return;

    // Check if it's time to detect protocol
    if (millis() - lastProtocolDetection > 5000) {
        detectProtocol();
        lastProtocolDetection = millis();
    }

    // Update parameters
    detectParameters();
}

ProtocolType CanBus::getCurrentProtocol() {
    return currentProtocol;
}

std::map<String, Parameter> CanBus::getDetectedParameters() {
    return detectedParameters;
}

bool CanBus::isConnected() {
    return isInitialized;
}

void CanBus::reset() {
    if (isInitialized) {
        twai_stop();
        twai_driver_uninstall();
        isInitialized = false;
    }
    detectedParameters.clear();
    currentProtocol = ProtocolType::UNKNOWN;
}

// Protocol detection methods
bool CanBus::detectCAN11Bit() {
    // Implementation for CAN 11-bit detection
    return false;
}

bool CanBus::detectCAN29Bit() {
    // Implementation for CAN 29-bit detection
    return false;
}

bool CanBus::detectISO9141() {
    // Implementation for ISO 9141 detection
    return false;
}

bool CanBus::detectISO14230() {
    // Implementation for ISO 14230 detection
    return false;
}

bool CanBus::detectISO15765() {
    // Implementation for ISO 15765 detection
    return false;
}

bool CanBus::detectPWM() {
    // Implementation for PWM detection
    return false;
}

bool CanBus::detectVPW() {
    // Implementation for VPW detection
    return false;
}

bool CanBus::detectProtocol() {
    // Try each protocol detection method
    if (detectCAN11Bit()) {
        currentProtocol = ProtocolType::CAN_11BIT;
        return true;
    }
    if (detectCAN29Bit()) {
        currentProtocol = ProtocolType::CAN_29BIT;
        return true;
    }
    // Add other protocol detection methods as needed
    return false;
}

void CanBus::detectParameters() {
    // Implementation for parameter detection
}

void CanBus::updateParameter(const String& name, float value, const String& unit) {
    if (detectedParameters.find(name) == detectedParameters.end()) {
        Parameter param;
        param.name = name;
        param.unit = unit;
        param.value = value;
        param.min = value;
        param.max = value;
        param.isValid = true;
        param.lastUpdate = millis();
        detectedParameters[name] = param;
    } else {
        Parameter& param = detectedParameters[name];
        param.value = value;
        param.min = min(param.min, value);
        param.max = max(param.max, value);
        param.lastUpdate = millis();
    }
}

void CanBus::analyzeDataPattern(const uint8_t* data, size_t length) {
    // Implementation for data pattern analysis
} 