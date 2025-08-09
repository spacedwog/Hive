#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

// 📶 Configuração do SoftAP
const char* ap_ssid = "HIVE EXPLORER";
const char* ap_password = "explorer"; // mínimo 8 caracteres

// 🌐 Servidor HTTP
ESP8266WebServer server(80);

// 🔄 Estado de controle
bool activated = false;

// 📟 Variáveis do sensor e status mesh
int sensorValue = 0;
bool anomalyDetected = false;
bool meshConnected = false;  // Pode ser atualizado pela lógica mesh real

// Parâmetros para detecção de anomalia no sensor (exemplo)
const int sensorMinThreshold = 100;   // ajuste conforme seu sensor
const int sensorMaxThreshold = 900;

// -------------------------
// 📜 Página HTML principal
// -------------------------
String htmlPage() {
  String page = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head>
      <title>NodeMCU SoftAP Control</title>
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
      <h1>Controle do NodeMCU</h1>
      <p>Status: <span id="status">Carregando...</span></p>
      <button class="on" onclick="sendCmd('on')">Ligar</button>
      <button class="off" onclick="sendCmd('off')">Desligar</button>
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
  StaticJsonDocument<256> doc;
  doc["device"] = "ESP8266";
  doc["server_ip"] = WiFi.softAPIP().toString();
  doc["sensor"] = sensorValue;
  doc["anomaly"] = anomalyDetected;
  doc["mesh"] = meshConnected;
  doc["status"] = activated ? "Ligado" : "Desligado";
  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

// -------------------------
// 📡 Rota: Receber comando JSON
// -------------------------
void handleCommand() {
  if (server.hasArg("plain") == false) {
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
    digitalWrite(LED_BUILTIN, LOW);  // Acende LED (ativo LOW)
    Serial.println("🔵 Comando recebido: LIGAR");

    StaticJsonDocument<200> res;
    res["status"] = "Ligado";
    String resp;
    serializeJson(res, resp);
    server.send(200, "application/json", resp);

  } else if (action == "off") {
    activated = false;
    digitalWrite(LED_BUILTIN, HIGH);  // Apaga LED
    Serial.println("🔴 Comando recebido: DESLIGAR");

    StaticJsonDocument<200> res;
    res["status"] = "Desligado";
    String resp;
    serializeJson(res, resp);
    server.send(200, "application/json", resp);

  } else if (action == "ping") {
    Serial.println("📶 Comando recebido: PING");
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

  Serial.println("\n🔧 Iniciando SoftAP...");
  WiFi.softAP(ap_ssid, ap_password);
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("📡 SoftAP iniciado! IP: ");
  Serial.println(myIP);

  // Configura rotas do servidor
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/command", HTTP_POST, handleCommand);

  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

// -------------------------
// 🔄 Loop principal
// -------------------------
void loop() {
  server.handleClient();

  // Lê sensor analógico A0
  sensorValue = analogRead(A0);

  // Detecta anomalia: valor fora da faixa permitida
  if (sensorValue < sensorMinThreshold || sensorValue > sensorMaxThreshold) {
    anomalyDetected = true;
  } else {
    anomalyDetected = false;
  }

  // Simula status mesh - aqui pode ser substituído por código real de mesh
  meshConnected = WiFi.softAPgetStationNum() > 0;  // true se pelo menos 1 estação conectada

  delay(10);  // Pequeno delay para estabilidade
}
