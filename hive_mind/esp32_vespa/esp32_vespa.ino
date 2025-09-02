#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <mbedtls/base64.h>
#include <mbedtls/md.h>   // HMAC-SHA256

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
  return distancia > 0 ? distancia : -1;
}

// ==== Potenciômetro ====
#define POT_PIN 33
long lerSensor() {
  return analogRead(POT_PIN); // 0 a 4095
}

// ==== Credenciais do AP ====
const char* ap_ssid = "HIVE VESPA";
const char* ap_password = "hivemind";

// ==== Credenciais do STA ====
const char* sta_ssid = "FAMILIA SANTOS";    // 🔹 Coloque seu SSID aqui
const char* sta_password = "6z2h1j3k9f";    // 🔹 Coloque sua senha aqui

// ==== Servidor Web ====
WebServer server(80);
bool activated = false;
bool staConnected = false;

// ==== CHAVE COMPARTILHADA (HMAC) ====
// Troque por uma chave forte (32+ chars). Ideal gerar aleatória.
const char* HMAC_SHARED_SECRET = "DONT-USE-THIS-IN-PROD-CHANGE-ME-32BYTES-MIN";

// Janela de tempo aceita (segundos) para evitar replay com clock levemente fora
const long ALLOWED_SKEW_SECONDS = 60;

// Armazena nonce/timestamp recente simples (para demonstração).
// Em produção, use uma estrutura LRU com múltiplos nonces recentes.
String lastNonce = "";
long   lastTimestamp = 0;

// ==== UART para ESP32-CAM ====
HardwareSerial SerialVESPA(1);
#define TX_VESPA 16
#define RX_VESPA 17
#define BAUD_UART 9600

String uartBuffer = "";

// ==== Utils: Base64 Decode ====
String base64Decode(const String &input) {
  size_t input_len = input.length();
  size_t out_len = 3 * ((input_len + 3) / 4);
  unsigned char* output = (unsigned char*)malloc(out_len);
  if (!output) return String("");

  int ret = mbedtls_base64_decode(output, out_len, &out_len,
                                  (const unsigned char*)input.c_str(), input_len);
  String out = "";
  if (ret == 0) {
    out = String((const char*)output).substring(0, out_len);
  }
  free(output);
  return out;
}

// ==== Utils: Base64 Encode (para resposta assinada, se quiser) ====
String base64Encode(const unsigned char* input, size_t len) {
  size_t out_len = 4 * ((len + 2) / 3);
  unsigned char* out = (unsigned char*)malloc(out_len + 1);
  if (!out) return String("");
  size_t olen = 0;
  if (mbedtls_base64_encode(out, out_len + 1, &olen, input, len) != 0) {
    free(out);
    return String("");
  }
  String s = String((const char*)out).substring(0, olen);
  free(out);
  return s;
}

// ==== Utils: HMAC-SHA256 ====
bool hmacSha256(const String& key, const String& data, unsigned char out[32]) {
  const mbedtls_md_info_t* md_info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (!md_info) return false;
  if (mbedtls_md_hmac(md_info,
                      (const unsigned char*)key.c_str(), key.length(),
                      (const unsigned char*)data.c_str(), data.length(),
                      out) != 0) {
    return false;
  }
  return true;
}

// ==== Verificação de Requisição Assinada ====
// Assinatura: Base64(HMACSHA256(SECRET, `${ts}\n${method}\n${path}\n${nonce}\n${body}`))
bool verifySignedRequest() {
  // Cabeçalhos obrigatórios
  if (!server.hasHeader("X-Timestamp") ||
      !server.hasHeader("X-Nonce") ||
      !server.hasHeader("X-Signature")) {
    server.send(401, "application/json",
                "{\"error\":\"Unauthorized: missing auth headers\"}");
    return false;
  }

  String tsStr = server.header("X-Timestamp");
  String nonce = server.header("X-Nonce");
  String signatureB64 = server.header("X-Signature");

  long ts = tsStr.toInt();
  long nowSec = (long)(millis() / 1000); // ⚠️ melhor usar RTC/NTP; aqui é didático
  // Se você tiver NTP, substitua por time(nullptr) com time.h configurado.

  // Verifica skew
  if (abs(nowSec - ts) > ALLOWED_SKEW_SECONDS) {
    server.send(401, "application/json",
                "{\"error\":\"Unauthorized: timestamp skew\"}");
    return false;
  }

  // Evita replay simples (nonce repetido com timestamp não crescente)
  if (nonce == lastNonce && ts <= lastTimestamp) {
    server.send(401, "application/json",
                "{\"error\":\"Unauthorized: replay detected\"}");
    return false;
  }

  // Monta a string canônica
  String method = server.method() == HTTP_GET ? "GET" :
                  server.method() == HTTP_POST ? "POST" :
                  server.method() == HTTP_PUT ? "PUT" :
                  server.method() == HTTP_DELETE ? "DELETE" : "OTHER";

  // Caminho apenas (sem host). WebServer fornece URI completo no handler atual.
  String path = server.uri();

  String body = server.hasArg("plain") ? server.arg("plain") : "";

  String canonical = String(ts) + "\n" + method + "\n" + path + "\n" + nonce + "\n" + body;

  unsigned char mac[32];
  if (!hmacSha256(String(HMAC_SHARED_SECRET), canonical, mac)) {
    server.send(500, "application/json", "{\"error\":\"HMAC failed\"}");
    return false;
  }

  String expectedB64 = base64Encode(mac, sizeof(mac));

  if (expectedB64 != signatureB64) {
    server.send(401, "application/json",
                "{\"error\":\"Unauthorized: bad signature\"}");
    return false;
  }

  // Atualiza anti-replay básico
  lastNonce = nonce;
  lastTimestamp = ts;
  return true;
}

// ==== HTTP Handlers ====
void handleStatus() {
  if (!verifySignedRequest()) return;

  DynamicJsonDocument doc(512);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["ultrassonico_cm"] = medirDistancia();
  doc["analog"] = lerSensor();
  doc["wifi_mode"] = staConnected ? "STA" : "AP";
  doc["ip"] = staConnected ? WiFi.localIP().toString() : WiFi.softAPIP().toString();

  String response;
  serializeJson(doc, response);

  // (Opcional) Assinar a resposta — útil se o cliente quiser validar integridade
  // String respCanonical = String(millis()/1000) + "\nRESP\n" + "/status" + "\n" + "-" + "\n" + response;
  // unsigned char mac[32]; hmacSha256(String(HMAC_SHARED_SECRET), respCanonical, mac);
  // String respSig = base64Encode(mac, sizeof(mac));
  // server.sendHeader("X-Response-Signature", respSig);

  server.send(200, "application/json", response);

  // Envia status via UART
  SerialVESPA.print("STATUS:");
  serializeJson(doc, SerialVESPA);
  SerialVESPA.println();
}

void handleCommand() {
  if (!verifySignedRequest()) return;
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

  String command = doc["command"] | "";
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
    res["analog"] = lerSensor();
  } else {
    res["result"] = "error";
    res["status"] = "comando inválido";
  }

  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);

  // Envia comando via UART
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

  SerialVESPA.begin(BAUD_UART, SERIAL_8N1, RX_VESPA, TX_VESPA);
  Serial.println("UART para ESP32-CAM iniciada");

  // Inicia AP
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("AP ativo. IP: "); Serial.println(WiFi.softAPIP());

  // Tenta conectar como STA
  WiFi.begin(sta_ssid, sta_password);
  Serial.print("Conectando ao STA ");
  Serial.print(sta_ssid);

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

  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.begin();
  Serial.println("Servidor HTTP iniciado (com HMAC)");
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
