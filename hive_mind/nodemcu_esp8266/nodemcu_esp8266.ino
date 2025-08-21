#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <math.h>

// -------------------------
// 📶 Configurações WiFi
// -------------------------
const char* ap_ssid = "HIVE EXPLORER";
const char* ap_password = "explorer"; // mínimo 8 caracteres

const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// -------------------------
// 📡 Servidores
// -------------------------
ESP8266WebServer server(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;

// -------------------------
// ⚙️ Controle
// -------------------------
bool activated = false;

// -------------------------
// 🔊 Sensor de Som
// -------------------------
const int pinMicrophone = A0;  // Sensor de som analógico
int rawSoundValue = 0;
float soundDB = 0.0;
bool soundAnomaly = false;
const int soundMinDB = 30;   // dB mínimo esperado
const int soundMaxDB = 85;   // dB máximo esperado

// -------------------------
// 📟 Status mesh
// -------------------------
bool meshConnected = false;

// -------------------------
// 📜 Página HTML principal
// -------------------------
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
// -------------------------
void handleRoot() {
  server.send(200, "text/html", htmlPage());
}

void handleStatus() {
  StaticJsonDocument<512> doc;
  doc["device"] = "ESP8266";
  doc["server_ip"] = WiFi.softAPIP().toString();
  doc["sensor_raw"] = rawSoundValue;
  doc["sensor_db"] = soundDB;
  doc["mesh"] = meshConnected;
  doc["status"] = activated ? "Ligado" : "Desligado";

  JsonObject anomalyObj = doc.createNestedObject("anomaly");
  if (soundAnomaly) {
    anomalyObj["detected"] = true;
    anomalyObj["message"] = "Nível de som fora do intervalo permitido";
    anomalyObj["expected_range"] = String(soundMinDB) + " - " + String(soundMaxDB) + " dB";
    anomalyObj["current_value"] = soundDB;
    anomalyObj["timestamp_ms"] = millis();
  } else {
    anomalyObj["detected"] = false;
    anomalyObj["message"] = "Som dentro do intervalo normal";
  }

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
// ⚙️ Setup
// -------------------------
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ap_ssid, ap_password);

  Serial.print("📡 SoftAP iniciado! IP: ");
  Serial.println(WiFi.softAPIP());

  WiFi.begin(sta_ssid, sta_password);
  Serial.print("Conectando à internet");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Conectado à internet");
  Serial.print("IP STA: ");
  Serial.println(WiFi.localIP());

  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();

  Serial.println("Servidor HTTP iniciado");
}

// -------------------------
// 🔄 Loop principal
// -------------------------
void loop() {
  dnsServer.processNextRequest();
  server.handleClient();

  // 🔊 Leitura do sensor em decibéis
  rawSoundValue = analogRead(pinMicrophone);
  if (rawSoundValue <= 0) rawSoundValue = 1; // evita log(0)
  soundDB = 20.0 * log10((float)rawSoundValue / 1023.0 * 1000.0); // escala aproximada

  soundAnomaly = (soundDB < soundMinDB || soundDB > soundMaxDB);
  meshConnected = WiFi.softAPgetStationNum() > 0;

  delay(50);
}
