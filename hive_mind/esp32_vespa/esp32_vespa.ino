#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <mbedtls/base64.h>

// ==== Sensor Ultrassônico ====
#define TRIG 21
#define ECHO 22

long medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duracao = pulseIn(ECHO, HIGH, 30000); // timeout 30ms (~5m)
  long distancia = duracao * 0.034 / 2;      // cm
  return distancia > 0 ? distancia : -1;     // -1 = sem leitura
}

// ==== Leitura potenciômetro ====
#define POT_PIN 33 // pino D33

long lerSensor() {
  int valor = analogRead(POT_PIN); // lê valor analógico do pino D33
  return valor;                     // retorna valor de 0 a 4095
}

// ==== Credenciais AP ====
const char* ap_ssid = "HIVE VESPA";
const char* ap_password = "hivemind";

// ==== Servidor Web ====
WebServer server(80);
bool activated = false;

// ==== Autenticação ====
const char* authUsername = "spacedwog";
const char* authPassword = "Kimera12@";

// ==== Funções internas ====
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
  doc["analog"] = lerSensor();
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
  DynamicJsonDocument res(128);

  if (command == "activate") {
    activated = true;
    digitalWrite(32, HIGH);
    res["result"] = "success";
    res["status"] = "ativo";
  } 
  else if (command == "deactivate") {
    activated = false;
    digitalWrite(32, LOW);
    res["result"] = "success";
    res["status"] = "parado";
  }
  else if (command == "ping") {
    res["result"] = "success";
    res["analog"] = lerSensor();
  }
  else {
    res["result"] = "error";
    res["status"] = "comando inválido";
  }

  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);

  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);

  pinMode(POT_PIN, INPUT); // configura pino do potenciômetro

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
  server.begin();

  Serial.println("Servidor HTTP iniciado em modo AP");
}

// ==== Loop ====
void loop() {
  server.handleClient();
}
