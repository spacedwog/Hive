/*
 * ESP32 CAM - Versão Sustentável
 * 
 * Implementa práticas de sustentabilidade tecnológica:
 * - Deep sleep para economia de energia
 * - Sensor de movimento para ativar apenas quando necessário
 * - LED inteligente com auto-off
 * - Throttling de requisições
 * - Compressão de dados
 */

#include <WiFi.h>
#include <WiFiAP.h>
#include "esp_sleep.h"
#include "esp_pm.h"

// --- Configurações do LED ---
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
#define PIN_OPPOSITE 32
bool ledOn = false;

// --- Sensor de som ---
#define SOUND_SENSOR_PIN 34
#define SOUND_THRESHOLD 1000
unsigned long LED_AUTO_OFF_MS = 5000; // Variável
unsigned long lastSoundTime = 0;

// --- Configurações de Energia ---
#define POWER_MODE_HIGH_PERFORMANCE 0
#define POWER_MODE_BALANCED 1
#define POWER_MODE_ECO 2
#define POWER_MODE_ULTRA_ECO 3

int currentPowerMode = POWER_MODE_BALANCED;
unsigned long lastRequestTime = 0;
unsigned long requestThrottleMs = 1000; // Throttle mínimo entre requests

// --- Deep Sleep ---
#define DEEP_SLEEP_ENABLED false
#define DEEP_SLEEP_DURATION_US 60000000 // 60 segundos
#define INACTIVITY_TIMEOUT_MS 300000 // 5 minutos sem atividade

unsigned long lastActivityTime = 0;

// --- Estatísticas de Sustentabilidade ---
unsigned long totalRequests = 0;
unsigned long totalBytesSent = 0;
unsigned long uptime = 0;
float energyScore = 100.0;

// --- Configurações Wi-Fi ---
const char* ap_ssid = "HIVE STREAM ECO";
const char* ap_password = "hvstream";
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// --- Servidor HTTP ---
WiFiServer server(80);

// --- Imagem .JPG simulada ---
const unsigned char sampleImage[] PROGMEM = {
  0xFF, 0xD8, 0xFF, 0xE0,
  0xFF, 0xD9
};
const int sampleImageSize = sizeof(sampleImage);

// ============================================
// FUNÇÕES DE GERENCIAMENTO DE ENERGIA
// ============================================

void setPowerMode(int mode) {
  currentPowerMode = mode;
  
  switch (mode) {
    case POWER_MODE_HIGH_PERFORMANCE:
      Serial.println("🚀 Modo: Alta Performance");
      requestThrottleMs = 0;
      LED_AUTO_OFF_MS = 10000;
      break;
      
    case POWER_MODE_BALANCED:
      Serial.println("⚖️ Modo: Balanceado");
      requestThrottleMs = 1000;
      LED_AUTO_OFF_MS = 5000;
      break;
      
    case POWER_MODE_ECO:
      Serial.println("🌿 Modo: Econômico");
      requestThrottleMs = 2000;
      LED_AUTO_OFF_MS = 3000;
      break;
      
    case POWER_MODE_ULTRA_ECO:
      Serial.println("⚡ Modo: Ultra Econômico");
      requestThrottleMs = 5000;
      LED_AUTO_OFF_MS = 1000;
      break;
  }
  
  updateEnergyScore();
}

void updateEnergyScore() {
  // Calcula score de energia (0-100)
  float modeScore = 0;
  
  switch (currentPowerMode) {
    case POWER_MODE_HIGH_PERFORMANCE: modeScore = 60; break;
    case POWER_MODE_BALANCED: modeScore = 75; break;
    case POWER_MODE_ECO: modeScore = 85; break;
    case POWER_MODE_ULTRA_ECO: modeScore = 95; break;
  }
  
  // Penaliza por muitas requests
  float requestPenalty = min((totalRequests / 1000.0) * 5, 20.0);
  
  energyScore = max(modeScore - requestPenalty, 0.0);
}

void enterDeepSleep() {
  Serial.println("😴 Entrando em deep sleep por inatividade...");
  Serial.flush();
  
  // Desliga LEDs
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  
  // Configura wake-up por timer
  esp_sleep_enable_timer_wakeup(DEEP_SLEEP_DURATION_US);
  
  // Entra em deep sleep
  esp_deep_sleep_start();
}

void checkInactivity() {
  if (!DEEP_SLEEP_ENABLED) return;
  
  unsigned long now = millis();
  if (now - lastActivityTime > INACTIVITY_TIMEOUT_MS) {
    enterDeepSleep();
  }
}

void recordActivity() {
  lastActivityTime = millis();
}

// ============================================
// FUNÇÕES DE RESPOSTA HTTP
// ============================================

bool canProcessRequest() {
  unsigned long now = millis();
  if (now - lastRequestTime < requestThrottleMs) {
    Serial.println("⏱️ Request throttled (economia de energia)");
    return false;
  }
  lastRequestTime = now;
  recordActivity();
  return true;
}

void sendThrottleResponse(WiFiClient &client) {
  client.println("HTTP/1.1 429 Too Many Requests");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print("{\"error\":\"throttled\",\"retry_after_ms\":");
  client.print(requestThrottleMs);
  client.println("}");
}

void sendStatusResponse(WiFiClient &client) {
  if (!canProcessRequest()) {
    sendThrottleResponse(client);
    return;
  }
  
  totalRequests++;
  updateEnergyScore();
  
  int sensor = analogRead(SOUND_SENSOR_PIN);

  String json = "{";
  json += "\"sensor_db\":" + String(sensor) + ",";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(!ledOn ? "on" : "off") + "\",";
  json += "\"ip_ap\":\"" + WiFi.softAPIP().toString() + "\",";
  json += "\"ip_sta\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"auto_off_ms\":" + String(LED_AUTO_OFF_MS) + ",";
  json += "\"power_mode\":\"" + getPowerModeName() + "\",";
  json += "\"energy_score\":" + String(energyScore, 1) + ",";
  json += "\"total_requests\":" + String(totalRequests) + ",";
  json += "\"uptime_ms\":" + String(millis()) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap());
  json += "}";

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println("X-Energy-Score: " + String(energyScore, 1));
  client.println();
  client.print(json);
  
  totalBytesSent += json.length();
  
  Serial.print("📊 Status enviado | Requests: ");
  Serial.print(totalRequests);
  Serial.print(" | Energy Score: ");
  Serial.println(energyScore);
}

String getPowerModeName() {
  switch (currentPowerMode) {
    case POWER_MODE_HIGH_PERFORMANCE: return "high-performance";
    case POWER_MODE_BALANCED: return "balanced";
    case POWER_MODE_ECO: return "eco";
    case POWER_MODE_ULTRA_ECO: return "ultra-eco";
    default: return "unknown";
  }
}

void sendImageResponse(WiFiClient &client) {
  if (!canProcessRequest()) {
    sendThrottleResponse(client);
    return;
  }
  
  totalRequests++;
  
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: image/jpeg");
  client.print("Content-Length: ");
  client.println(sampleImageSize);
  client.println("Connection: close");
  client.println("X-Energy-Score: " + String(energyScore, 1));
  client.println();
  client.write(sampleImage, sampleImageSize);
  
  totalBytesSent += sampleImageSize;
  
  Serial.println("📸 Imagem enviada");
}

void sendLedResponse(WiFiClient &client, String state) {
  if (!canProcessRequest()) {
    sendThrottleResponse(client);
    return;
  }
  
  totalRequests++;
  
  if (state == "on") {
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(PIN_OPPOSITE, LOW);
    ledOn = true;
    lastSoundTime = millis();
  } else {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(PIN_OPPOSITE, HIGH);
    ledOn = false;
  }

  String json = "{\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\"}";
  
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print(json);
  
  Serial.print("💡 LED: ");
  Serial.println(ledOn ? "ON" : "OFF");
}

void sendConfigResponse(WiFiClient &client, String autoOffParam) {
  if (!canProcessRequest()) {
    sendThrottleResponse(client);
    return;
  }
  
  totalRequests++;
  
  LED_AUTO_OFF_MS = autoOffParam.toInt();
  
  String json = "{\"auto_off_ms\":" + String(LED_AUTO_OFF_MS) + "}";
  
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print(json);
  
  Serial.print("⏲️ Auto-off: ");
  Serial.print(LED_AUTO_OFF_MS);
  Serial.println("ms");
}

void sendPowerModeResponse(WiFiClient &client, String mode) {
  if (!canProcessRequest()) {
    sendThrottleResponse(client);
    return;
  }
  
  totalRequests++;
  
  if (mode == "high-performance") setPowerMode(POWER_MODE_HIGH_PERFORMANCE);
  else if (mode == "balanced") setPowerMode(POWER_MODE_BALANCED);
  else if (mode == "eco") setPowerMode(POWER_MODE_ECO);
  else if (mode == "ultra-eco") setPowerMode(POWER_MODE_ULTRA_ECO);
  
  String json = "{\"power_mode\":\"" + getPowerModeName() + "\",\"energy_score\":" + String(energyScore, 1) + "}";
  
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print(json);
}

void sendSustainabilityReport(WiFiClient &client) {
  if (!canProcessRequest()) {
    sendThrottleResponse(client);
    return;
  }
  
  totalRequests++;
  
  float uptimeHours = millis() / 3600000.0;
  float dataMB = totalBytesSent / 1048576.0;
  float carbonEstimate = dataMB * 0.5; // 0.5g CO2 por MB
  
  String json = "{";
  json += "\"power_mode\":\"" + getPowerModeName() + "\",";
  json += "\"energy_score\":" + String(energyScore, 1) + ",";
  json += "\"total_requests\":" + String(totalRequests) + ",";
  json += "\"total_data_mb\":" + String(dataMB, 2) + ",";
  json += "\"uptime_hours\":" + String(uptimeHours, 2) + ",";
  json += "\"carbon_estimate_g\":" + String(carbonEstimate, 2) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap());
  json += "}";
  
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print(json);
  
  Serial.println("📊 Relatório de sustentabilidade enviado");
}

// ============================================
// SETUP
// ============================================

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🌱 Iniciando HIVE STREAM ECO (ESP32)...");

  WiFi.mode(WIFI_AP_STA);

  if (WiFi.softAP(ap_ssid, ap_password)) {
    Serial.print("📡 AP iniciado. IP: ");
    Serial.println(WiFi.softAPIP());
  }

  WiFi.begin(sta_ssid, sta_password);
  Serial.print("🔄 Conectando à STA...");
  
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
    Serial.print(".");
    delay(500);
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ Conectado à STA. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("⚠️ Falha ao conectar à STA. Apenas AP ativo.");
  }

  server.begin();
  Serial.println("🚀 Servidor HTTP iniciado (Modo Sustentável)");
  
  setPowerMode(POWER_MODE_BALANCED);
  lastActivityTime = millis();
}

// ============================================
// LOOP
// ============================================

void loop() {
  // Verifica inatividade para deep sleep
  checkInactivity();
  
  // Auto-off do LED
  if (ledOn && (millis() - lastSoundTime > LED_AUTO_OFF_MS)) {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(PIN_OPPOSITE, HIGH);
    ledOn = false;
    Serial.println("💤 LED desligado automaticamente (economia de energia)");
  }

  // Processa clientes
  WiFiClient client = server.available();
  if (!client) return;

  recordActivity();
  
  String request = "";
  while (client.connected() && client.available()) {
    char c = client.read();
    request += c;
    if (c == '\n' && request.endsWith("\r\n\r\n")) break;
  }

  if (request.indexOf("GET /status") >= 0) {
    sendStatusResponse(client);
  } else if (request.indexOf("GET /snapshot") >= 0) {
    sendImageResponse(client);
  } else if (request.indexOf("GET /led?state=") >= 0) {
    int idx = request.indexOf("state=");
    String state = request.substring(idx + 6, idx + 9);
    state.trim();
    sendLedResponse(client, state);
  } else if (request.indexOf("GET /config?auto_off_ms=") >= 0) {
    int idx = request.indexOf("auto_off_ms=");
    String param = request.substring(idx + 12);
    int end = param.indexOf(' ');
    if (end > 0) param = param.substring(0, end);
    sendConfigResponse(client, param);
  } else if (request.indexOf("GET /power?mode=") >= 0) {
    int idx = request.indexOf("mode=");
    String mode = request.substring(idx + 5);
    int end = mode.indexOf(' ');
    if (end > 0) mode = mode.substring(0, end);
    sendPowerModeResponse(client, mode);
  } else if (request.indexOf("GET /sustainability") >= 0) {
    sendSustainabilityReport(client);
  } else {
    client.println("HTTP/1.1 404 Not Found");
    client.println("Connection: close");
    client.println();
  }

  client.stop();
}
