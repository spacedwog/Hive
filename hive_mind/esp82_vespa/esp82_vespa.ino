#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// 🚨 Substitua pelos dados reais da sua rede Wi-Fi local
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

WebServer server(80);
bool activated = false;

void handleStatus() {
  DynamicJsonDocument doc(256);
  int sensorValue = analogRead(34);

  // 🚨 Simples análise de padrão (valor alto = anomalia)
  bool anomaly = sensorValue > 3000;

  doc["device"] = "Vespa";
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
    digitalWrite(2, HIGH);
  } else if (command == "deactivate") {
    activated = false;
    digitalWrite(2, LOW);
  } else if (command == "analyze") {
    // Simples lógica de análise do sensor
    int value = analogRead(34);
    bool anomaly = value > 3000;
    String msg = anomaly ? "Anomalia detectada!" : "Padrão normal.";
    server.send(200, "application/json", "{\"result\": \"" + msg + "\"}");
    return;
  }

  server.send(200, "text/plain", "Command received");
}

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
  digitalWrite(2, LOW); // LED desligado

  Serial.print("Conectando à rede: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(1000);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("Wi-Fi conectado com sucesso!");
    Serial.print("Endereço IP: ");
    Serial.println(WiFi.localIP());

    server.on("/status", handleStatus);
    server.on("/command", HTTP_POST, handleCommand);
    server.begin();
  } else {
    Serial.println("\nFalha ao conectar ao Wi-Fi.");
  }
}

void loop() {
  server.handleClient();
}
