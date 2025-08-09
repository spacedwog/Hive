#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// 🚨 Substitua pelos dados da sua rede Wi-Fi
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

WebServer server(80);
bool activated = false;

// 🔹 Função para retornar status do dispositivo
void handleStatus() {
  DynamicJsonDocument doc(128);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["sensor"] = analogRead(34);        // Entrada analógica
  doc["mesh"] = WiFi.status();           // Estado da conexão
  doc["server"] = WiFi.localIP().toString(); // IP do servidor

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// 🔹 Função para receber comandos JSON
void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Bad Request\"}");
    return;
  }

  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));

  if (error) {
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

  // Retorna resposta confirmando o comando recebido
  DynamicJsonDocument res(128);
  res["result"] = "success";
  res["status"] = activated ? "ativo" : "parado";
  
  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void setup() {
  Serial.begin(115200);
  pinMode(32, OUTPUT);
  digitalWrite(32, LOW); // Garante que o LED/atuador comece desligado

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
    Serial.println("\nWi-Fi conectado com sucesso!");
    Serial.print("Endereço IP: ");
    Serial.println(WiFi.localIP());

    // Endpoints iguais ao NodeMCU
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
