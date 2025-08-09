#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// 🚨 Rede local do Vespa
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

// 🚨 Rede do NodeMCU (AP)
const char* nodeMCU_SSID = "Vespa_AP";
const char* nodeMCU_PASS = "12345678";
const char* nodeMCU_IP = "192.168.4.1"; // IP padrão do AP no NodeMCU

WebServer server(80);
bool activated = false;

void handleStatus() {
  DynamicJsonDocument doc(128);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["sensor"] = analogRead(34);
  doc["mesh"] = WiFi.status();
  doc["server"] = WiFi.localIP().toString();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Bad Request\"}");
    return;
  }

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, server.arg("plain"))) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String command = doc["command"];
  if (command == "activate") {
    activated = true;
    digitalWrite(32, HIGH);
  } 
  else if (command == "deactivate") {
    activated = false;
    digitalWrite(32, LOW);
  } 
  else {
    server.send(400, "application/json", "{\"error\":\"Unknown command\"}");
    return;
  }

  DynamicJsonDocument res(128);
  res["result"] = "success";
  res["status"] = activated ? "ativo" : "parado";
  
  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

// 🔹 Consulta o status do NodeMCU
void queryNodeMCUStatus() {
  HTTPClient http;
  String url = "http://" + String(nodeMCU_IP) + "/status";
  http.begin(url);
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("📡 NodeMCU Status: " + payload);
  } else {
    Serial.println("⚠ Erro ao consultar NodeMCU: " + String(httpCode));
  }
  http.end();
}

// 🔹 Envia comando para o NodeMCU
void sendNodeMCUCommand(String cmd) {
  HTTPClient http;
  String url = "http://" + String(nodeMCU_IP) + "/command";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(128);
  doc["command"] = cmd;
  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode > 0) {
    Serial.println("📤 Comando enviado ao NodeMCU: " + cmd);
    Serial.println("Resposta: " + http.getString());
  } else {
    Serial.println("⚠ Erro ao enviar comando para NodeMCU: " + String(httpCode));
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);

  // Conecta na rede local
  Serial.println("Conectando à rede local...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Conectado à rede local!");
  Serial.println("IP local do Vespa: " + WiFi.localIP().toString());

  // Conecta também ao AP do NodeMCU
  Serial.println("Conectando ao AP do NodeMCU...");
  WiFi.begin(nodeMCU_SSID, nodeMCU_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Conectado ao AP do NodeMCU!");
  Serial.println("IP do NodeMCU: " + String(nodeMCU_IP));

  // Configura servidor local do Vespa
  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
}

unsigned long lastCheck = 0;

void loop() {
  server.handleClient();

  // A cada 5s consulta o NodeMCU
  if (millis() - lastCheck > 5000) {
    queryNodeMCUStatus();
    // Exemplo: ativar/desativar alternando
    if (activated) sendNodeMCUCommand("deactivate");
    else sendNodeMCUCommand("activate");
    lastCheck = millis();
  }
}
