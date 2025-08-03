#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

ESP8266WebServer server(80);
bool activated = false;

void handleStatus() {
  DynamicJsonDocument doc(256);
  int sensorValue = analogRead(A0);
  bool anomaly = sensorValue > 800; // Teto de anomalia para 10-bit ADC

  doc["device"] = "NodeMCU";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = sensorValue;
  doc["mesh"] = true;
  doc["anomaly"] = anomaly;

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
    digitalWrite(D1, HIGH); // LED ou atuador
  } else if (command == "deactivate") {
    activated = false;
    digitalWrite(D1, LOW);
  } else if (command == "analyze") {
    int value = analogRead(A0);
    bool anomaly = value > 800;
    String msg = anomaly ? "Anomalia detectada!" : "Padrão normal.";
    server.send(200, "application/json", "{\"result\": \"" + msg + "\"}");
    return;
  }

  server.send(200, "text/plain", "Command received");
}

void setup() {
  Serial.begin(115200);
  pinMode(D1, OUTPUT);
  digitalWrite(D1, LOW);

  WiFi.begin(ssid, password);
  Serial.print("Conectando ao Wi-Fi");

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(1000);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi conectado!");
    Serial.print("IP local: ");
    Serial.println(WiFi.localIP());

    server.on("/status", handleStatus);
    server.on("/command", HTTP_POST, handleCommand);
    server.begin();
  } else {
    Serial.println("\nFalha ao conectar.");
  }
}

void loop() {
  server.handleClient();
}