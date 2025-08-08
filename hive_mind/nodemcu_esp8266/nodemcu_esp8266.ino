#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

// 🚨 Rede que será criada pelo NodeMCU
const char* ssid = "Vespa_AP";
const char* password = "12345678"; // mínimo 8 caracteres

ESP8266WebServer server(80);
bool activated = false;

void handleStatus() {
  DynamicJsonDocument doc(128);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["sensor"] = analogRead(A0);  // ESP8266 tem só A0
  doc["mesh"] = WiFi.status();
  doc["server"] = WiFi.softAPIP().toString();
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Bad Request");
    return;
  }

  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));

  if (error) {
    server.send(400, "application/json", "{\"error\": \"Invalid JSON\"}");
    return;
  }

  String command = doc["command"];

  if (command == "activate") {
    activated = true;
    digitalWrite(D4, HIGH); // GPIO2 (LED ou atuador)
  } else if (command == "deactivate") {
    activated = false;
    digitalWrite(D4, LOW);
  }

  server.send(200, "text/plain", "Command received");
}

void setup() {
  Serial.begin(115200);
  pinMode(D4, OUTPUT);
  digitalWrite(D4, LOW); // começa desligado

  // Inicia o modo Access Point
  Serial.println("Iniciando Access Point...");
  bool apResult = WiFi.softAP(ssid, password);

  if (apResult) {
    Serial.println("Access Point iniciado com sucesso!");
    Serial.print("IP do servidor: ");
    Serial.println(WiFi.softAPIP());

    server.on("/status", handleStatus);
    server.on("/command", HTTP_POST, handleCommand);
    server.begin();
  } else {
    Serial.println("Erro ao iniciar o Access Point.");
  }
}

void loop() {
  server.handleClient();
}