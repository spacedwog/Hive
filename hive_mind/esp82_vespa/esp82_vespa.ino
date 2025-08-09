#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <mbedtls/base64.h>  // Inclua para base64 decode

#define MAX_PILHAS 1
#define TAM_PILHA 100
#define TAM_CMD   20

const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

WebServer server(80);
bool activated = false;

typedef struct {
  char comando[TAM_CMD];
  int status;
} Registro;

Registro banco[MAX_PILHAS][TAM_PILHA];
int topo[MAX_PILHAS];

const char* authUsername = "spacedwog";
const char* authPassword = "Kimera12@";

void inicializar() {
  for (int i = 0; i < MAX_PILHAS; i++) topo[i] = -1;
}

bool empilhar(int pilha, const char* cmd, int status) {
  if (pilha < 0 || pilha >= MAX_PILHAS) return false;
  if (topo[pilha] >= TAM_PILHA - 1) return false;
  topo[pilha]++;
  strncpy(banco[pilha][topo[pilha]].comando, cmd, TAM_CMD);
  banco[pilha][topo[pilha]].status = status;
  return true;
}

String base64Decode(const String &input) {
  size_t out_len = 0;
  size_t input_len = input.length();
  unsigned char output[input_len]; // buffer

  int ret = mbedtls_base64_decode(output, input_len, &out_len, 
                                 (const unsigned char*)input.c_str(), input_len);
  if (ret == 0) {
    return String((char*)output).substring(0, out_len);
  }
  return String("");
}

bool checkAuth() {
  if (!server.hasHeader("Authorization")) {
    server.sendHeader("WWW-Authenticate", "Basic realm=\"ESP32\"");
    server.send(401, "text/plain", "Unauthorized");
    return false;
  }

  String authHeader = server.header("Authorization");
  if (!authHeader.startsWith("Basic ")) {
    server.sendHeader("WWW-Authenticate", "Basic realm=\"ESP32\"");
    server.send(401, "text/plain", "Unauthorized");
    return false;
  }

  String encoded = authHeader.substring(6);
  String decoded = base64Decode(encoded);

  String expected = String(authUsername) + ":" + authPassword;

  if (decoded != expected) {
    server.sendHeader("WWW-Authenticate", "Basic realm=\"ESP32\"");
    server.send(401, "text/plain", "Unauthorized");
    return false;
  }

  return true;
}

// Os seus handlers (handleStatus, handleCommand, handleHistory) ficam iguais,
// só adicione no início de cada um:
// if (!checkAuth()) return;

void handleStatus() {
  if (!checkAuth()) return;

  DynamicJsonDocument doc(128);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["sensor"] = analogRead(34);
  doc["server"] = WiFi.localIP().toString();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleCommand() {
  if (!checkAuth()) return;

  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Bad Request\"}");
    return;
  }

  DynamicJsonDocument doc(256);
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String command = doc["command"];
  int statusCmd = 0;

  if (command == "activate") {
    activated = true;
    digitalWrite(32, HIGH);
    statusCmd = 1;
  } 
  else if (command == "deactivate") {
    activated = false;
    digitalWrite(32, LOW);
    statusCmd = 1;
  } 
  else {
    statusCmd = 0;
  }

  empilhar(0, command.c_str(), statusCmd);

  DynamicJsonDocument res(128);
  res["result"] = statusCmd ? "success" : "error";
  res["status"] = activated ? "ativo" : "parado";

  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void handleHistory() {
  if (!checkAuth()) return;

  DynamicJsonDocument doc(1024);

  for (int i = 0; i < MAX_PILHAS; i++) {
    JsonArray pilhaJson = doc.createNestedArray(String("Comando"));
    for (int j = 0; j <= topo[i]; j++) {
      JsonObject item = pilhaJson.createNestedObject();
      item["cmd"] = banco[i][j].comando;
      item["status"] = banco[i][j].status ? "ACERTO" : "ERRO";
    }
  }

  String jsonResponse;
  serializeJson(doc, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void setup() {
  Serial.begin(115200);
  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);
  inicializar();

  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.println("\n✅ Wi-Fi conectado!");
  Serial.println(WiFi.localIP());

  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.on("/history", handleHistory);

  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

void loop() {
  server.handleClient();
}
