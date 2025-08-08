#include <WiFi.h>
#include <WebServer.h>
#include <painlessMesh.h>
#include <ArduinoJson.h>

// 🔐 Wi-Fi do seu roteador
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

// 🌐 Servidor HTTP
WebServer server(80);

// 📡 Configuração do Mesh
#define MESH_PREFIX     "VespaMesh"
#define MESH_PASSWORD   "senha123"
#define MESH_PORT       5555

painlessMesh mesh;
Scheduler userScheduler;

bool activated = false;
int lastSensorValue = 0;

// 🔄 Mensagem recebida da malha
void receivedCallback(uint32_t from, String &msg) {
  Serial.printf("Mensagem recebida de %u: %s\n", from, msg.c_str());

  DynamicJsonDocument doc(256);
  DeserializationError err = deserializeJson(doc, msg);
  if (!err) {
    if (doc.containsKey("sensor")) {
      lastSensorValue = doc["sensor"];
    }
  }
}

// Envia comando para todos os nós do Mesh
void broadcastCommand(const String& cmd) {
  DynamicJsonDocument doc(128);
  doc["command"] = cmd;
  String msg;
  serializeJson(doc, msg);
  mesh.sendBroadcast(msg);
}

// Responde ao app com status
void handleStatus() {
  DynamicJsonDocument doc(128);
  doc["device"] = "Gateway";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = lastSensorValue;
  doc["anomaly"] = lastSensorValue > 500; // ajuste conforme necessário
  doc["mesh"] = true;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// Recebe comandos do app e repassa para Mesh
void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Bad Request");
    return;
  }
  DynamicJsonDocument doc(256);
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\": \"Invalid JSON\"}");
    return;
  }

  String cmd = doc["command"];

  if (cmd == "activate") {
    activated = true;
  } else if (cmd == "deactivate") {
    activated = false;
  }

  broadcastCommand(cmd);
  server.send(200, "text/plain", "Command sent via Mesh");
}

void setup() {
  Serial.begin(115200);

  // Conectar ao Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi conectado.");
  Serial.print("IP local: ");
  Serial.println(WiFi.localIP());

  // Mesh init
  mesh.setDebugMsgTypes(ERROR | STARTUP | CONNECTION);
  mesh.init(MESH_PREFIX, MESH_PASSWORD, &userScheduler, MESH_PORT);
  mesh.onReceive(&receivedCallback);

  // HTTP endpoints
  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
}

void loop() {
  mesh.update();
  server.handleClient();
}