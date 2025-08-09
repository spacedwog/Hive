#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <TypeConversionFunctions.h>
#include <FloodingMesh.h>

// ===== Configurações do Access Point =====
const char* apSsid = "Vespa_AP";
const char* apPassword = "vespa_ap"; // mínimo 8 caracteres

// ===== Configurações do Mesh =====
namespace TypeCast = MeshTypeConversionFunctions;
constexpr char meshName[] PROGMEM = "HIVE_EXPLORER";
constexpr char meshPass[] PROGMEM = "explorer";

uint8_t espnowEncryptedConnectionKey[16] = {0x33,0x44,0x33,0x44,0x33,0x44,0x33,0x44,0x33,0x44,0x33,0x44,0x33,0x44,0x32,0x11};
uint8_t espnowHashKey[16] = {0xEF,0x44,0x33,0x0C,0x33,0x44,0xFE,0x44,0x33,0x44,0x33,0xB0,0x33,0x44,0x32,0xAD};

// ===== Variáveis globais =====
ESP8266WebServer server(80);
bool activated = false;
bool meshConnected = false;
int sensorValue = 0;
bool anomalyDetected = false;

// ===== Função de callback da Mesh =====
bool meshMessageHandler(String &message, FloodingMesh &meshInstance) {
  meshConnected = true; // recebeu mensagem = conectado
  Serial.println("Mesh msg: " + message);

  // Se receber comando pela mesh, aplica localmente
  if (message.startsWith("CMD:")) {
    String cmd = message.substring(5);
    if (cmd == "activate") {
      activated = true;
      digitalWrite(D4, HIGH);
    } else if (cmd == "deactivate") {
      activated = false;
      digitalWrite(D4, LOW);
    }
  }
  return true;
}

FloodingMesh floodingMesh = FloodingMesh(
  meshMessageHandler,
  FPSTR(meshPass),
  espnowEncryptedConnectionKey,
  espnowHashKey,
  FPSTR(meshName),
  TypeCast::uint64ToString(ESP.getChipId()),
  true
);

// ===== Endpoints HTTP =====
void handleRoot() {
  server.send(200, "text/html", "<h1>Vespa + Hive Explorer online</h1>");
}

void handleStatus() {
  DynamicJsonDocument doc(256);
  doc["device"] = "Esp8266";
  doc["status"] = activated ? "ativo" : "parado";
  doc["sensor"] = analogRead(A0); // ESP8266 tem apenas A0
  doc["mesh_status"] = meshConnected ? "online" : "offline";
  doc["mesh_connected"] = meshConnected;
  doc["server_ip"] = WiFi.softAPIP().toString();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Bad Request - missing JSON body");
    return;
  }

  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));

  if (error) {
    server.send(400, "application/json", "{\"error\": \"Invalid JSON\"}");
    return;
  }

  String command = doc["command"] | "";

  if (command == "activate") {
    activated = true;
    sensorValue = random(50, 100);
    digitalWrite(D4, HIGH);
    floodingMesh.broadcast("CMD: activate");
  } else if (command == "deactivate") {
    activated = false;
    sensorValue = 0;
    digitalWrite(D4, LOW);
    floodingMesh.broadcast("CMD: deactivate");
  } else if (command == "ping") {
    floodingMesh.broadcast("CMD: ping");
  } else {
    floodingMesh.broadcast("CMD: " + command);
  }

  server.send(200, "application/json", "{\"ok\":true}");
}

// ===== Setup =====
void setup() {
  delay(1000);
  Serial.begin(115200);
  pinMode(D4, OUTPUT);
  digitalWrite(D4, LOW); // começa desligado

  Serial.println("Iniciando Access Point...");
  if (WiFi.softAP(apSsid, apPassword)) {
    Serial.println("Access Point iniciado!");
    Serial.print("IP do servidor: ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("Erro ao iniciar o Access Point!");
  }

  // Inicializa Mesh
  floodingMesh.begin();
  floodingMesh.activateAP();
  floodingMeshDelay(2000);

  // Configura HTTP Server
  server.on("/", handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

// ===== Loop =====
void loop() {
  floodingMeshDelay(1);
  server.handleClient();
}
