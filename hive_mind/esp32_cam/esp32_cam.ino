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
#define SOUND_THRESHOLD 1000      // Ajuste conforme sensibilidade do microfone
#define LED_AUTO_OFF_MS 5000      // Desliga LED automaticamente após 5 segundos sem som
unsigned long lastSoundTime = 0;

// --- Configurações Wi-Fi ---
const char* ap_ssid = "HIVE STREAM";
const char* ap_password = "hvstream";
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// --- Servidor HTTP ---
WiFiServer server(80);

// --- Função de status JSON ---
String getStatusJSON() {
  IPAddress ipAP = WiFi.softAPIP();
  IPAddress ipSTA = WiFi.localIP();

  // Leitura do microfone
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
  if (state) lastSoundTime = millis();  // Reinicia timer ao ligar LED
}

// --- Função auxiliar para enviar header WAV ---
void sendWavHeader(WiFiClient &client, uint32_t sampleRate, uint16_t bitsPerSample, uint16_t channels) {
  uint32_t dataSize = 0xFFFFFFFF; // tamanho indefinido (streaming)
  uint32_t byteRate = sampleRate * channels * bitsPerSample / 8;
  uint16_t blockAlign = channels * bitsPerSample / 8;

  // RIFF header
  client.write("RIFF", 4);
  client.write((const uint8_t *)&dataSize, 4);   // tamanho fake
  client.write("WAVE", 4);

  // fmt chunk
  client.write("fmt ", 4);
  uint32_t subChunk1Size = 16;
  client.write((const uint8_t *)&subChunk1Size, 4);
  uint16_t audioFormat = 1; // PCM
  client.write((const uint8_t *)&audioFormat, 2);
  client.write((const uint8_t *)&channels, 2);
  client.write((const uint8_t *)&sampleRate, 4);
  client.write((const uint8_t *)&byteRate, 4);
  client.write((const uint8_t *)&blockAlign, 2);
  client.write((const uint8_t *)&bitsPerSample, 2);

  // data chunk
  client.write("data", 4);
  client.write((const uint8_t *)&dataSize, 4); // tamanho fake
}

// --- Setup ---
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🚀 Iniciando HIVE STREAM (ESP32-WROVER-DEV)...");

  // --- Inicializa Wi-Fi ---
  WiFi.mode(WIFI_AP_STA);
  if (WiFi.softAP(ap_ssid, ap_password)) {
    Serial.print("📡 AP iniciado. IP: "); Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("❌ Falha ao iniciar Soft-AP");
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

  // --- Inicia servidor HTTP ---
  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

// --- Loop principal ---
void loop() {
  WiFiClient client = server.available();
  if (client) {
    String request = client.readStringUntil('\r');
    client.flush();

    // --- Rota LED ON ---
    if (request.indexOf("GET /led/on") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      setLED(true);
      client.print("{\"success\":true,\"led\":\"on\",\"message\":\"LED ligado\"}");
    } 
    // --- Rota LED OFF ---
    else if (request.indexOf("GET /led/off") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      setLED(false);
      client.print("{\"success\":true,\"led\":\"off\",\"message\":\"LED desligado\"}");
    } 
    // --- Rota STATUS ---
    else if (request.indexOf("GET /status") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print(getStatusJSON());
    } 
    // --- Rota AUDIO ---
    else if (request.indexOf("GET /audio") >= 0) {
      Serial.println("🎵 Cliente requisitou /audio");
      client.print("HTTP/1.1 200 OK\r\n");
      client.print("Content-Type: audio/wav\r\n");
      client.print("Connection: close\r\n\r\n");

      // Envia header WAV (16kHz, 16-bit, mono)
      sendWavHeader(client, 16000, 16, 1);

      // Envia algumas amostras de áudio fake (silêncio ou leitura do microfone)
      for (int i = 0; i < 16000; i++) { // 1 segundo
        int raw = analogRead(SOUND_SENSOR_PIN);
        int16_t sample = map(raw, 0, 4095, -32768, 32767);
        client.write((uint8_t *)&sample, 2);
      }
      Serial.println("🎧 Áudio enviado (1s de stream)");
    } 
    // --- Rota desconhecida ---
    else {
      client.print("HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print("{\"success\":false,\"message\":\"Endpoint não encontrado\"}");
    }

    client.stop();
  }

  // --- Leitura do microfone ---
  int soundLevel = analogRead(SOUND_SENSOR_PIN);
  if (soundLevel > SOUND_THRESHOLD && !ledOn) {
    Serial.println("🔊 Som detectado! Ligando LED...");
    setLED(true);
  }

  // --- Desliga LED automaticamente se não houver som ---
  if (ledOn && millis() - lastSoundTime > LED_AUTO_OFF_MS) {
    Serial.println("⏱️ Sem som por 5s. Desligando LED...");
    setLED(false);
  }

  delay(10);
}
