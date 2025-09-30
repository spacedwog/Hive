#include <WiFi.h>
#include <WiFiAP.h>

// --- Configurações do LED ---
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
#define PIN_OPPOSITE 32
bool ledOn = false;

// --- Sensor de som ---
#define SOUND_SENSOR_PIN 34
#define SOUND_THRESHOLD 1000
#define LED_AUTO_OFF_MS 5000
unsigned long lastSoundTime = 0;

// --- Configurações Wi-Fi ---
const char* ap_ssid = "HIVE STREAM";
const char* ap_password = "hvstream";
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// --- Servidor HTTP ---
WiFiServer server(80);

// --- Imagem .JPG simulada (pode colocar bytes de uma imagem real convertida em array) ---
const unsigned char sampleImage[] PROGMEM = {
  0xFF, 0xD8, 0xFF, 0xE0, // SOI e header JPEG
  // (...) aqui você deve inserir os bytes do arquivo JPG real
  0xFF, 0xD9              // EOI
};
const size_t sampleImageLen = sizeof(sampleImage);

// --- Função de status JSON ---
String getStatusJSON() {
  IPAddress ipAP = WiFi.softAPIP();
  IPAddress ipSTA = WiFi.localIP();
  int soundLevel = analogRead(SOUND_SENSOR_PIN);

  String json = "{";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(ledOn ? "off" : "on") + "\",";
  json += "\"ip_ap\":\"" + ipAP.toString() + "\",";
  json += "\"ip_sta\":\"" + (ipSTA.toString() == "0.0.0.0" ? "desconectado" : ipSTA.toString()) + "\",";
  json += "\"sound_level\":" + String(soundLevel) + ",";
  json += "\"auto_off_ms\":" + String(LED_AUTO_OFF_MS);
  json += "}";
  return json;
}

// --- Controle do LED ---
void setLED(bool state) {
  digitalWrite(LED_BUILTIN, state ? HIGH : LOW);
  digitalWrite(PIN_OPPOSITE, state ? LOW : HIGH);
  ledOn = state;
  if (state) lastSoundTime = millis();
}

// --- Setup ---
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🚀 Iniciando HIVE STREAM (ESP32)...");

  WiFi.mode(WIFI_AP_STA);
  if (WiFi.softAP(ap_ssid, ap_password)) {
    Serial.print("📡 AP iniciado. IP: "); Serial.println(WiFi.softAPIP());
  }

  WiFi.begin(sta_ssid, sta_password);
  Serial.print("🔄 Conectando à STA...");
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ STA Conectada. IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("⚠️ STA não conectada. Continuando apenas com AP...");
  }

  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

// --- Loop principal ---
void loop() {
  WiFiClient client = server.available();
  if (client) {
    String request = client.readStringUntil('\r');
    client.flush();

    if (request.indexOf("GET /led/on") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      setLED(true);
      client.print("{\"success\":true,\"led\":\"on\",\"message\":\"LED ligado\"}");
    }
    else if (request.indexOf("GET /led/off") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      setLED(false);
      client.print("{\"success\":true,\"led\":\"off\",\"message\":\"LED desligado\"}");
    }
    else if (request.indexOf("GET /status") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print(getStatusJSON());
    }
    // --- Nova rota para enviar imagem fixa ---
    else if (request.indexOf("GET /image") >= 0) {
      Serial.println("🖼️ Cliente requisitou /image");
      client.print("HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nConnection: close\r\n\r\n");
      client.write(sampleImage, sampleImageLen);
    }
    else {
      client.print("HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print("{\"success\":false,\"message\":\"Endpoint não encontrado\"}");
    }
  }

  int soundLevel = analogRead(SOUND_SENSOR_PIN);
  if (soundLevel > SOUND_THRESHOLD && !ledOn) {
    Serial.println("🔊 Som detectado! Ligando LED...");
    setLED(true);
  }

  if (ledOn && millis() - lastSoundTime > LED_AUTO_OFF_MS) {
    Serial.println("⏱️ Sem som por 5s. Desligando LED...");
    setLED(false);
  }

  delay(10);
}
