#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <math.h>
#include <Espalexa.h>
#include <EspalexaDevice.h>

// -------------------------
// 📶 Configurações WiFi
// -------------------------
const char* ap_ssid = "HIVE EXPLORER";
const char* ap_password = "explorer";

const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// -------------------------
// 📡 Servidores
// -------------------------
ESP8266WebServer server(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;

// -------------------------
// 🔹 Espalexa (Alexa)
#define MAX_DEVICES 5
Espalexa espalexa;

// -------------------------
// ⚙️ Controle
bool activated = false;

// -------------------------
// 🔊 Sensor de Som
const int pinMicrophone = A0;
int rawSoundValue = 0;
float soundDB = 0.0;
bool soundAnomaly = false;
const int soundMinDB = 30;
const int soundMaxDB = 85;

// -------------------------
// 🔹 Variáveis para Serial display
String lastLedStatus = "";
String lastAPIP = "";
String lastSTAIP = "";
bool lastSTAConnected = false;
int lastClientsAP = -1;
float lastSoundDB = -1;
bool lastSoundAnomaly = false;

// -------------------------
// 📜 Página HTML principal
String htmlPage() {
  String page = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head>
      <title>NodeMCU HIVE EXPLORER</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial; text-align: center; background-color: #111; color: white; }
        h1 { color: #4CAF50; }
        button { padding: 15px; margin: 10px; font-size: 18px; border-radius: 8px; border: none; }
        .on { background-color: #4CAF50; color: white; }
        .off { background-color: #f44336; color: white; }
      </style>
    </head>
    <body>
      <h1>HIVE EXPLORER</h1>
      <p>Status: <span id="status">Carregando...</span></p>
      <p>Nível de som: <span id="sound">0</span> dB</p>
      <p>IP AP: <span id="ap_ip">...</span></p>
      <p>IP STA: <span id="sta_ip">...</span></p>
      <button class="on" onclick="sendCmd('on')">Ativar</button>
      <button class="off" onclick="sendCmd('off')">Desativar</button>
      <script>
        function sendCmd(cmd) {
          fetch('/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: cmd })
          }).then(res => res.json()).then(data => {
            document.getElementById('status').innerText = data.status;
          });
        }

        function refreshStatus() {
          fetch('/status').then(res => res.json()).then(data => {
            document.getElementById('status').innerText = data.status;
            document.getElementById('sound').innerText = data.sensor_db.toFixed(1);
            document.getElementById('ap_ip').innerText = data.server_ip;
            document.getElementById('sta_ip').innerText = data.sta_ip;
          });
        }

        setInterval(refreshStatus, 500);
        refreshStatus();
      </script>
    </body>
    </html>
  )rawliteral";
  return page;
}

// -------------------------
// 📡 Rotas
void handleRoot() { server.send(200, "text/html", htmlPage()); }

void handleStatus() {
  StaticJsonDocument<512> doc;
  doc["device"] = "ESP8266";
  doc["server_ip"] = WiFi.softAPIP().toString();
  doc["sta_ip"] = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "desconectado";
  doc["sensor_raw"] = rawSoundValue;
  doc["sensor_db"] = soundDB;
  doc["mesh"] = false; // Mesh removido
  doc["status"] = activated ? "Ligado" : "Desligado";

  JsonObject anomalyObj = doc.createNestedObject("anomaly");
  anomalyObj["detected"] = soundAnomaly;
  anomalyObj["message"] = soundAnomaly ? "Nível de som fora do intervalo" : "Normal";
  anomalyObj["current_value"] = soundDB;
  anomalyObj["expected_range"] = String(soundMinDB) + " - " + String(soundMaxDB);
  anomalyObj["timestamp_ms"] = millis();

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No body received\"}");
    return;
  }

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String action = doc["action"];
  StaticJsonDocument<200> res;

  if (action == "on") {
    activated = true;
    digitalWrite(LED_BUILTIN, LOW);
    res["status"] = "Ligado";
  } else if (action == "off") {
    activated = false;
    digitalWrite(LED_BUILTIN, HIGH);
    res["status"] = "Desligado";
  } else if (action == "ping") {
    res["response"] = "pong";
    res["timestamp"] = millis();
  } else {
    server.send(400, "application/json", "{\"error\":\"Comando desconhecido\"}");
    return;
  }

  String resp;
  serializeJson(res, resp);
  server.send(200, "application/json", resp);
}

// -------------------------
// 🔄 Funções auxiliares
void readSoundSensor() {
  rawSoundValue = analogRead(pinMicrophone);
  if (rawSoundValue <= 0) rawSoundValue = 1;
  soundDB = 20.0 * log10((float)rawSoundValue / 1023.0 * 1000.0);
  soundAnomaly = (soundDB < soundMinDB || soundDB > soundMaxDB);
}

void displayStatusSerial() {
  String ledStatus = activated ? "Ligado" : "Desligado";
  String apIP = WiFi.softAPIP().toString();
  String staIP = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "desconectado";
  int clientsAP = WiFi.softAPgetStationNum();
  bool staConnected = (WiFi.status() == WL_CONNECTED);

  if (ledStatus != lastLedStatus || apIP != lastAPIP || staIP != lastSTAIP || staConnected != lastSTAConnected ||
      clientsAP != lastClientsAP || fabs(soundDB - lastSoundDB) > 0.1 || soundAnomaly != lastSoundAnomaly) {

    Serial.println("\n====================================");
    Serial.print("Status do LED: "); Serial.println(ledStatus);
    Serial.print("IP SoftAP: "); Serial.println(apIP);
    Serial.print("IP STA: "); Serial.println(staIP);
    Serial.print("STA Conectada: "); Serial.println(staConnected ? "Sim" : "Não");
    Serial.print("Clientes AP: "); Serial.println(clientsAP);
    Serial.print("Som (raw): "); Serial.println(rawSoundValue);
    Serial.print("Som (dB): "); Serial.println(soundDB);
    Serial.print("Anomalia de som: "); Serial.println(soundAnomaly ? "Fora do intervalo" : "Normal");
    Serial.println("====================================");

    lastLedStatus = ledStatus;
    lastAPIP = apIP;
    lastSTAIP = staIP;
    lastSTAConnected = staConnected;
    lastClientsAP = clientsAP;
    lastSoundDB = soundDB;
    lastSoundAnomaly = soundAnomaly;
  }
}

// -------------------------
// Callback do Espalexa
void devicePowerChanged(uint8_t deviceId, bool power) {
  activated = power;
  digitalWrite(LED_BUILTIN, power ? LOW : HIGH);
}

// -------------------------
// ⚙️ Setup
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  // Inicializa modo AP + STA
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("SoftAP iniciado! IP: "); Serial.println(WiFi.softAPIP());

  // Conecta à rede STA
  WiFi.begin(sta_ssid, sta_password);
  Serial.print("Conectando à rede STA");
  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConectado à internet");
    Serial.print("IP STA: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nSTA não conectada, operando apenas com AP");
  }

  // DNS server para captive portal
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  // Rotas do servidor HTTP
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
  Serial.println("Servidor HTTP iniciado");

  // Inicializa Espalexa
  espalexa.addDevice("HIVE EXPLORER", devicePowerChanged);
  espalexa.begin(&server);
}

// -------------------------
// 🔄 Loop principal
void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
  espalexa.loop();

  readSoundSensor();
  displayStatusSerial();

  delay(500);
}
