#define ESP8266WIFIMESH_DISABLE_COMPATIBILITY

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <TypeConversionFunctions.h>
#include <FloodingMesh.h>

namespace TypeCast = MeshTypeConversionFunctions;

constexpr char exampleMeshName[] PROGMEM = "HIVE_EXPLORER";
constexpr char exampleWiFiPassword[] PROGMEM = "explorer";

uint8_t espnowEncryptedConnectionKey[16] = {
  0x33,0x44,0x33,0x44,0x33,0x44,0x33,0x44,
  0x33,0x44,0x33,0x44,0x33,0x44,0x32,0x11
};
uint8_t espnowHashKey[16] = {
  0xEF,0x44,0x33,0x0C,0x33,0x44,0xFE,0x44,
  0x33,0x44,0x33,0xB0,0x33,0x44,0x32,0xAD
};

bool meshMessageHandler(String &message, FloodingMesh &meshInstance);
FloodingMesh floodingMesh = FloodingMesh(
  meshMessageHandler,
  FPSTR(exampleWiFiPassword),
  espnowEncryptedConnectionKey,
  espnowHashKey,
  FPSTR(exampleMeshName),
  TypeCast::uint64ToString(ESP.getChipId()),
  true
);

bool theOne = true;
String theOneMac;
bool useLED = false;

// ------------------ HTTP Server ------------------
ESP8266WebServer server(80);

bool meshConnected = false;
int sensorValue = 0;
bool anomalyDetected = false;

void handleStatus() {
  DynamicJsonDocument doc(256);
  doc["device"] = "ESP8266";
  doc["server"] = WiFi.localIP().toString(); // IP do servidor
  doc["status"] = meshConnected ? "online" : "offline";
  doc["sensor"] = sensorValue;
  doc["anomaly"] = anomalyDetected;
  doc["mesh"] = meshConnected;

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Missing body");
    return;
  }
  String body = server.arg("plain");
  DynamicJsonDocument doc(256);
  deserializeJson(doc, body);
  String cmd = doc["command"] | "";

  if (cmd == "activate") {
    sensorValue = random(50, 100);
    floodingMesh.broadcast("CMD: activate");
  } else if (cmd == "deactivate") {
    sensorValue = 0;
    floodingMesh.broadcast("CMD: deactivate");
  } else if (cmd == "ping") {
    floodingMesh.broadcast("CMD: ping");
  } else {
    floodingMesh.broadcast("CMD: " + cmd);
  }

  server.send(200, "application/json", "{\"ok\":true}");
}

// ------------------ Mesh Handler ------------------
bool meshMessageHandler(String &message, FloodingMesh &meshInstance) {
  meshConnected = true; // recebeu mensagem, então está conectado
  Serial.println("Mesh msg: " + message);
  return true;
}

void setup() {
  WiFi.persistent(false);
  Serial.begin(115200);
  floodingMesh.begin();
  floodingMesh.activateAP();

  uint8_t apMacArray[6]{0};
  theOneMac = TypeCast::macToString(WiFi.softAPmacAddress(apMacArray));

  if (useLED) {
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, LOW);
  }

  // API HTTP
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();

  floodingMeshDelay(5000);
}

int32_t timeOfLastProclamation = -10000;
uint32_t benchmarkCount = 0;
uint32_t loopStart = millis();

void loop() {
  floodingMeshDelay(1);
  server.handleClient();

  if (theOne) {
    if (millis() - timeOfLastProclamation > 10000) {
      floodingMesh.broadcast(String(floodingMesh.metadataDelimiter()) + String(theOneMac) + " is The One.");
      timeOfLastProclamation = millis();
    }
    if (millis() - loopStart > 23000) {
      floodingMesh.broadcast(String(benchmarkCount++) + String(floodingMesh.metadataDelimiter()) + ": Benchmark msg.");
    }
  }
}
