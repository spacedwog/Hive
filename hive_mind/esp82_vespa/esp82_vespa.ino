#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

const char* ssid = "HIVE_NETWORK";
const char* password = "hive2025";

WebServer server(80);
bool activated = false;

void handleStatus() {
  DynamicJsonDocument doc(128);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = analogRead(34);
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleCommand() {
  if (server.hasArg("plain") == false) {
    server.send(400, "text/plain", "Bad Request");
    return;
  }
  DynamicJsonDocument doc(256);
  deserializeJson(doc, server.arg("plain"));
  String command = doc["command"];

  if (command == "activate") {
    activated = true;
    digitalWrite(2, HIGH);  // Exemplo: acender LED
  } else if (command == "deactivate") {
    activated = false;
    digitalWrite(2, LOW);
  }

  server.send(200, "text/plain", "Command received");
}

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Conectando ao WiFi...");
  }
  Serial.println(WiFi.localIP());

  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
}

void loop() {
  server.handleClient();
}
