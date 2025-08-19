#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
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

  long duracao = pulseIn(ECHO, HIGH, 30000);
  long distancia = duracao * 0.034 / 2;
  return distancia > 0 ? distancia : -1;
}

// ==== Potenciômetro ====
#define POT_PIN 33
long lerSensor() {
  return analogRead(POT_PIN);
}

// ==== Credenciais AP ====
const char* ap_ssid = "HIVE VESPA";
const char* ap_password = "hivemind";

// ==== Credenciais da ESP32_CAM ====
const char* cam_ssid = "HIVE STREAM";
const char* cam_password = "hvstream";
const char* cam_ip   = "192.168.4.1";

// ==== Servidor Web ====
WebServer server(80);
bool activated = false;

// ==== Autenticação ====
const char* authUsername = "spacedwog";
const char* authPassword = "Kimera12@";

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

  DynamicJsonDocument doc(512);
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

// ==== Proxy para câmera ====
void handleCameraFrame() {
  if (!checkAuth()) return;

  HTTPClient http;
  http.begin(String("http://") + cam_ip + "/capture");
  int httpCode = http.GET();
  if (httpCode == 200) {
    WiFiClient client = server.client();
    client.write(http.getStream().readString().c_str());
  } else {
    server.send(500, "text/plain", "Falha ao acessar ESP32_CAM");
  }
  http.end();
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);

  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);

  pinMode(POT_PIN, INPUT);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  // Conecta-se à ESP32_CAM como STA
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ap_ssid, ap_password);
  Serial.println("AP Vespa iniciado!");

  WiFi.begin(cam_ssid, cam_password);
  Serial.print("Conectando à ESP32_CAM...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Conectado!");
  Serial.print("IP STA: "); Serial.println(WiFi.localIP());

  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.on("/camera", handleCameraFrame);

  server.begin();
  Serial.println("Servidor HTTP Vespa iniciado!");
}

// ==== Loop ====
void loop() {
  server.handleClient();
}
