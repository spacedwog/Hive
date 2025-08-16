#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <mbedtls/base64.h>
#include <TM1637Display.h>

// ==== Configurações Display ====
#define CLK 25
#define DIO 26
TM1637Display display(CLK, DIO);

// ==== Sensor Ultrassônico ====
#define TRIG 21
#define ECHO 22

long medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duracao = pulseIn(ECHO, HIGH, 30000); // timeout 30ms (~5m máx.)
  long distancia = duracao * 0.034 / 2;      // cm
  return distancia > 0 ? distancia : -1;     // -1 = sem leitura
}

// ==== Constantes do sistema ====
#define MAX_PILHAS 1
#define TAM_PILHA 100
#define TAM_CMD   20

// ==== Credenciais AP ====
const char* ap_ssid = "HIVE VESPA";
const char* ap_password = "hivemind";  // mínimo 8 caracteres

// ==== Google Search API ====
const char* googleApiKey = "AIzaSyD-eetfXns-7sBnvu_2WAH9ncLR1QL8ud4";
const char* googleCx     = "124378eb68b7b42a1";

// ==== Servidor Web ====
WebServer server(80);
bool activated = false;

// ==== Estrutura para histórico ====
typedef struct {
  char comando[TAM_CMD];
  int status;
} Registro;

Registro banco[MAX_PILHAS][TAM_PILHA];
int topo[MAX_PILHAS];

// ==== Autenticação ====
const char* authUsername = "spacedwog";
const char* authPassword = "Kimera12@";

// ==== Funções internas ====
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
  unsigned char output[input_len];
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

// ==== Endpoints HTTP ====
void handleStatus() {
  if (!checkAuth()) return;

  DynamicJsonDocument doc(256);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["ultrassonico_cm"] = medirDistancia();
  doc["server"] = WiFi.softAPIP().toString();

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
  else if (command == "ping") {
    statusCmd = 1;
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

void handleSearch() {
  if (!checkAuth()) return;

  String body;
  if (server.hasArg("plain")) {
    body = server.arg("plain");
  } else if (server.args() > 0) {
    body = server.arg(0);
  }

  if (body.length() == 0) {
    server.send(400, "application/json", "{\"error\":\"No query provided\"}");
    return;
  }

  DynamicJsonDocument reqDoc(256);
  DeserializationError err = deserializeJson(reqDoc, body);
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String query = reqDoc["query"];
  if (query.length() == 0) {
    server.send(400, "application/json", "{\"error\":\"Empty query\"}");
    return;
  }

  // Monta URL da pesquisa real no Google
  String url = "https://www.googleapis.com/customsearch/v1?q=" + query +
               "&key=" + googleApiKey + "&cx=" + googleCx;

  HTTPClient http;
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode > 0) {
    String payload = http.getString();
    server.send(200, "application/json", payload);
  } else {
    server.send(500, "application/json", "{\"error\":\"Request failed\"}");
  }

  http.end();
}

// ==== Setup ====
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);

  // Inicializa Display
  display.setBrightness(0x0f);
  display.showNumberDec(0);

  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);
  inicializar();

  // Sensor ultrassônico
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  // ======== MODO AP ========
  Serial.println("Inicializando Access Point...");
  WiFi.softAP(ap_ssid, ap_password);

  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP: ");
  Serial.println(IP);

  // Configura servidor HTTP
  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.on("/history", handleHistory);
  server.on("/search", HTTP_POST, handleSearch);
  server.begin();

  Serial.println("Servidor HTTP iniciado em modo AP");
}

// ==== Loop ====
void loop() {
  server.handleClient();

  // Atualiza display a cada 500ms
  if (millis() - lastUpdate > 500) {
    long distancia = medirDistancia();
    int displayValue = distancia > 0 ? distancia : 0;
    display.showNumberDec(displayValue, false);
    lastUpdate = millis();
  }
}
