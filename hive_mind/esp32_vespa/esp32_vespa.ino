#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <mbedtls/base64.h>
#include <time.h>
#include "DHT.h"

// ==== Sensor Ultrassônico ====
#define TRIG 21
#define ECHO 22
#define ULTRASONIC_BUFFER 5

long ultraBuffer[ULTRASONIC_BUFFER] = {0};
int ultraIndex = 0;

long medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duracao = pulseIn(ECHO, HIGH, 30000);
  long distancia = duracao * 0.034 / 2;
  distancia = distancia > 0 ? distancia : -1;

  ultraBuffer[ultraIndex] = distancia > 0 ? distancia : ultraBuffer[ultraIndex];
  ultraIndex = (ultraIndex + 1) % ULTRASONIC_BUFFER;
  long sum = 0, count = 0;
  for (int i = 0; i < ULTRASONIC_BUFFER; i++) {
    if (ultraBuffer[i] > 0) {
      sum += ultraBuffer[i];
      count++;
    }
  }
  return count > 0 ? sum / count : -1;
}

// ==== Potenciômetro ====
#define POT_PIN 33
long lerSensor() {
  return analogRead(POT_PIN);
}

// ==== Sensor PIR ====
#define PIR_PIN 25
bool lerPIR() {
  return digitalRead(PIR_PIN) == HIGH;
}

// ==== Sensor DHT22 ====
#define DHTPIN 26
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ==== Bateria ====
#define BAT_PIN 34
float lerBateria() {
  int raw = analogRead(BAT_PIN);
  float tensao = (raw / 4095.0) * 2.0 * 3.3; // divisor de tensão 1:2
  return tensao;
}

// ==== Credenciais WiFi ====
const char* ap_ssid = "HIVE VESPA";
const char* ap_password = "hivemind";
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// ==== Servidor Web ====
WebServer server(80);
bool activated = false;
bool staConnected = false;

// ==== Autenticação ====
const char* authUsername = "spacedwog";
const char* authPassword = "Kimera12@";

// ==== UART para ESP32-CAM ====
HardwareSerial SerialVESPA(1);
#define TX_VESPA 16
#define RX_VESPA 17
#define BAUD_UART 9600
String uartBuffer = "";

// ==== Funções internas ====
String base64Decode(const String &input) {
  size_t input_len = input.length();
  size_t out_len = 3 * ((input_len + 3) / 4);
  unsigned char output[out_len];
  int ret = mbedtls_base64_decode(output, out_len, &out_len,
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

String getISOTime() {
  time_t now;
  time(&now);
  struct tm *tm_info = gmtime(&now);
  char buffer[25];
  strftime(buffer, 25, "%Y-%m-%dT%H:%M:%SZ", tm_info);
  return String(buffer);
}

// ==== HTTP Handlers ====
void handleStatus() {
  if (!checkAuth()) return;

  long distancia_cm = medirDistancia();
  long analog_val = lerSensor();
  float distancia_m = distancia_cm / 100.0;
  float analog_percent = (analog_val / 4095.0) * 100;

  bool movimento = lerPIR();
  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();
  float tensao_bat = lerBateria();

  DynamicJsonDocument doc(512);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["ultrassonico_m"] = distancia_m;
  doc["analog_percent"] = analog_percent;
  doc["pir_movimento"] = movimento ? "detectado" : "ausente";
  doc["temperatura_C"] = isnan(temperatura) ? JsonVariant() : temperatura;
  doc["umidade_pct"]   = isnan(umidade)     ? JsonVariant() : umidade;
  doc["bateria_V"]     = tensao_bat;
  doc["wifi_mode"]     = staConnected ? "STA" : "AP";
  doc["ip"]            = staConnected ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  doc["timestamp"]     = getISOTime();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);

  SerialVESPA.print("STATUS:");
  serializeJson(doc, SerialVESPA);
  SerialVESPA.println();
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
    digitalWrite(32, HIGH);
    activated = true;
    res["result"] = "success";
    res["status"] = "ativo";
  } else if (command == "deactivate") {
    digitalWrite(32, LOW);
    activated = false;
    res["result"] = "success";
    res["status"] = "parado";
  } else if (command == "ping") {
    res["result"] = "success";
    res["analog_percent"] = (lerSensor() / 4095.0) * 100;
  } else {
    res["result"] = "error";
    res["status"] = "comando inválido";
  }

  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);

  SerialVESPA.print("CMD:");
  SerialVESPA.println(command);
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);
  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);
  pinMode(POT_PIN, INPUT);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(BAT_PIN, INPUT);

  dht.begin();

  SerialVESPA.begin(BAUD_UART, SERIAL_8N1, RX_VESPA, TX_VESPA);
  Serial.println("UART para ESP32-CAM iniciada");

  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("AP ativo. IP: "); Serial.println(WiFi.softAPIP());

  WiFi.begin(sta_ssid, sta_password);
  Serial.print("Conectando ao STA "); Serial.print(sta_ssid);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    staConnected = true;
    Serial.print("Conectado ao STA. IP: "); Serial.println(WiFi.localIP());
  } else {
    staConnected = false;
    Serial.println("Falha ao conectar no STA. Usando apenas AP.");
  }

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

// ==== Loop ====
void loop() {
  server.handleClient();

  while (SerialVESPA.available()) {
    char c = SerialVESPA.read();
    if (c == '\n') {
      uartBuffer.trim();
      if (uartBuffer.length() > 0) {
        Serial.println("Recebido do CAM: " + uartBuffer);
      }
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }
}
