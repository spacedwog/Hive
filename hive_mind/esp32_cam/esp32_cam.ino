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
#define SOUND_THRESHOLD 1000  // Ajuste conforme sensibilidade do microfone
#define LED_AUTO_OFF_MS 5000  // Desliga LED automaticamente após 5 segundos sem som

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

  String json = "{";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(ledOn ? "off" : "on") + "\",";
  json += "\"ip_ap\":\"" + ipAP.toString() + "\",";
  json += "\"ip_sta\":\"" + (ipSTA.toString() == "0.0.0.0" ? "desconectado" : ipSTA.toString()) + "\"";
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
  // --- Cliente HTTP ---
  WiFiClient client = server.available();
  if (client) {
    String request = client.readStringUntil('\r');
    client.flush();

    // Controle de LEDs via HTTP
    if (request.indexOf("GET /H") >= 0) setLED(true);
    else if (request.indexOf("GET /L") >= 0) setLED(false);

    // Responde status JSON
    if (request.indexOf("GET /status") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print(getStatusJSON());
    } else {
      // Página web simples
      client.print("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n");
      client.print("<html><body><h1>HIVE STREAM ESP32</h1>");
      client.print("<p><a href='/H'>🔴 Ligar LED</a></p>");
      client.print("<p><a href='/L'>⚪ Desligar LED</a></p>");
      client.print("<p><a href='/status'>📊 Status JSON</a></p>");
      client.print("</body></html>");
    }

    client.stop();
  }

  // --- Leitura do microfone ---
  int soundLevel = analogRead(SOUND_SENSOR_PIN);
  if (soundLevel > SOUND_THRESHOLD && !ledOn) {
    Serial.println("🔊 Som detectado! Ligando LED...");
    setLED(true);
  }

  // --- Desliga LED automaticamente se não houver som por X ms ---
  if (ledOn && millis() - lastSoundTime > LED_AUTO_OFF_MS) {
    Serial.println("⏱️ Sem som por 5s. Desligando LED...");
    setLED(false);
  }

  delay(10);
}
