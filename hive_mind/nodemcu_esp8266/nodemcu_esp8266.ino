#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <SerialRelay.h> // Biblioteca do módulo de relé serial

// 📶 Configuração do SoftAP
const char* ap_ssid = "HIVE EXPLORER";
const char* ap_password = "explorer"; // mínimo 8 caracteres

// 🌐 Configuração da conexão STA (internet)
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// 🌐 Servidor HTTP
ESP8266WebServer server(80);

// 📡 Servidor DNS para Captive Portal
DNSServer dnsServer;
const byte DNS_PORT = 53;

// 🔄 Estado de controle
bool activated = false;

// 📟 Variáveis do sensor e status mesh
int sensorValue = 0;
bool anomalyDetected = false;
bool meshConnected = false;

// Limites para detecção de anomalia
const int sensorMinThreshold = 100;
const int sensorMaxThreshold = 900;

// -------------------------
// Configuração do módulo Serial Relay
// -------------------------
const int NumModules = 1;  // quantidade de módulos (cada módulo tem 4 relés)
const int DataPin = D2;    // pino de dados
const int ClockPin = D1;   // pino de clock
SerialRelay relays(DataPin, ClockPin, NumModules);

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
      <button class="on" onclick="sendCmd('on')">Ligar Todas</button>
      <button class="off" onclick="sendCmd('off')">Desligar Todas</button>
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
          });
        }
        setInterval(refreshStatus, 2000);
        refreshStatus();
      </script>
    </body>
    </html>
  )rawliteral";
  return page;
}

// -------------------------
// 📡 Rota: Página principal
// -------------------------
void handleRoot() {
  server.send(200, "text/html", htmlPage());
}

// -------------------------
// 📡 Rota: Status em JSON
// -------------------------
void handleStatus() {
  StaticJsonDocument<512> doc;
  doc["device"] = "ESP8266";
  doc["server_ip"] = WiFi.softAPIP().toString();
  doc["sensor"] = sensorValue;
  doc["mesh"] = meshConnected;
  doc["status"] = activated ? "Ligado" : "Desligado";

  if (anomalyDetected) {
    JsonObject anomalyObj = doc.createNestedObject("anomaly");
    anomalyObj["detected"] = true;
    anomalyObj["message"] = "Valor do sensor fora do intervalo permitido";
    anomalyObj["expected_range"] = String(sensorMinThreshold) + " - " + String(sensorMaxThreshold);
    anomalyObj["current_value"] = sensorValue;
    anomalyObj["timestamp_ms"] = millis();
  } else {
    JsonObject anomalyObj = doc.createNestedObject("anomaly");
    anomalyObj["detected"] = false;
    anomalyObj["message"] = "Nenhuma anomalia detectada";
  }

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

// -------------------------
// 📡 Rota: Receber comando JSON
// -------------------------
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

  if (action == "on") {
    activated = true;
    digitalWrite(LED_BUILTIN, LOW);  // LED aceso
    // Liga TODOS os relés de TODOS os módulos
    for (int m = 1; m <= NumModules; m++) {
      for (int r = 1; r <= 4; r++) {
        relays.SetRelay(r, SERIAL_RELAY_ON, m);
      }
    }
    StaticJsonDocument<200> res;
    res["status"] = "Ligado - Todos os Relés Ativos";
    String resp;
    serializeJson(res, resp);
    server.send(200, "application/json", resp);

  } else if (action == "off") {
    activated = false;
    digitalWrite(LED_BUILTIN, HIGH); // LED apagado
    // Desliga TODOS os relés de TODOS os módulos
    for (int m = 1; m <= NumModules; m++) {
      for (int r = 1; r <= 4; r++) {
        relays.SetRelay(r, SERIAL_RELAY_OFF, m);
      }
    }
    StaticJsonDocument<200> res;
    res["status"] = "Desligado - Todos os Relés Desativados";
    String resp;
    serializeJson(res, resp);
    server.send(200, "application/json", resp);

  } else if (action == "ping") {
    StaticJsonDocument<200> res;
    res["response"] = "pong";
    res["timestamp"] = millis();
    String resp;
    serializeJson(res, resp);
    server.send(200, "application/json", resp);

  } else {
    server.send(400, "application/json", "{\"error\":\"Comando desconhecido\"}");
  }
}

// -------------------------
// ⚙️ Setup inicial
// -------------------------
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // LED apagado

  // Inicializa relés seriais desligados
  for (int m = 1; m <= NumModules; m++) {
    for (int r = 1; r <= 4; r++) {
      relays.SetRelay(r, SERIAL_RELAY_OFF, m);
    }
  }

  // Modo AP + STA
  WiFi.mode(WIFI_AP_STA);

  // Inicia AP
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("📡 SoftAP iniciado! IP: ");
  Serial.println(WiFi.softAPIP());

  // Conecta na rede com internet
  WiFi.begin(sta_ssid, sta_password);
  Serial.print("Conectando à internet");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Conectado à internet");
  Serial.print("IP STA: ");
  Serial.println(WiFi.localIP());

  // Inicia DNS para Captive Portal
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  // Configura rotas
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

  sensorValue = analogRead(A0);
  anomalyDetected = (sensorValue < sensorMinThreshold || sensorValue > sensorMaxThreshold);
  meshConnected = WiFi.softAPgetStationNum() > 0;

  delay(10);
}
