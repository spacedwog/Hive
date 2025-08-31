#include <WiFi.h>
#include <WiFiAP.h>
#include "FS.h"
#include "SPIFFS.h"
#include "esp_camera.h"

// ================== DEFINIÇÕES DE PINOS ==================
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
#define PIN_OPPOSITE 32

// Credenciais do Soft-AP
const char* ssid = "HIVE STREAM";
const char* password = "hvstream";

// Servidor HTTP
WiFiServer server(80);
bool ledOn = false;

// ================== CONFIGURAÇÃO DA CÂMERA (OV2640) ==================
#define PWDN_GPIO_NUM    -1
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM     0
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27

#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      21
#define Y4_GPIO_NUM      19
#define Y3_GPIO_NUM      18
#define Y2_GPIO_NUM       5
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23
#define PCLK_GPIO_NUM    22

// ================== FUNÇÕES DE LOG ==================
void addLogSPIFFS(String entry) {
  File file = SPIFFS.open("/logs.txt", FILE_APPEND);
  if (!file) {
    Serial.println("❌ Erro ao abrir logs.txt");
    return;
  }
  file.println(entry);
  file.close();
  Serial.println("📼 Log gravado: " + entry);
}

String getLogsJSON_SPIFFS() {
  File file = SPIFFS.open("/logs.txt", FILE_READ);
  if (!file) {
    return "[]";
  }

  String json = "[";
  bool first = true;

  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      if (!first) json += ",";
      json += "\"" + line + "\"";
      first = false;
    }
  }

  json += "]";
  file.close();
  return json;
}

// ================== JSON DE STATUS ==================
String getStatusJSON() {
  IPAddress ip = WiFi.softAPIP();
  String json = "{";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(ledOn ? "off" : "on") + "\",";
  json += "\"ip\":\"" + ip.toString() + "\"";
  json += "}";
  return json;
}

void sendJSON(WiFiClient& client, const String& json) {
  client.print("HTTP/1.1 200 OK\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Connection: close\r\n");
  client.print("Content-Length: " + String(json.length()) + "\r\n\r\n");
  client.print(json);
}

// ================== CAPTURA DA CÂMERA ==================
String captureAndSave() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Falha na captura da câmera");
    return "";
  }

  // Nome único baseado em millis()
  String path = "/capture_" + String(millis()) + ".jpg";

  File file = SPIFFS.open(path, FILE_WRITE);
  if (!file) {
    Serial.println("❌ Falha ao abrir arquivo de imagem");
    esp_camera_fb_return(fb);
    return "";
  }

  file.write(fb->buf, fb->len);
  file.close();
  esp_camera_fb_return(fb);

  Serial.println("📷 Foto salva em: " + path);
  addLogSPIFFS("Foto capturada: " + path);
  return path;
}

// ================== SETUP ==================
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🚀 Iniciando HIVE STREAM (modo gravador persistente + câmera)...");

  // Inicializa SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("❌ Falha ao montar SPIFFS");
    return;
  }
  Serial.println("✅ SPIFFS iniciado");

  // Cria arquivo de logs se não existir
  if (!SPIFFS.exists("/logs.txt")) {
    File file = SPIFFS.open("/logs.txt", FILE_WRITE);
    if (file) file.close();
  }

  // Configura câmera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Qualidade reduzida para caber no SPIFFS
  config.frame_size = FRAMESIZE_QVGA; 
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Falha ao iniciar câmera. Erro 0x%x\n", err);
  } else {
    Serial.println("✅ Câmera OV2640 iniciada");
  }

  // Configura Soft-AP
  if (!WiFi.softAP(ssid, password)) {
    Serial.println("❌ Falha ao iniciar Soft-AP");
    while (true) delay(1000);
  }

  Serial.print("📡 AP iniciado. IP: ");
  Serial.println(WiFi.softAPIP());

  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

// ================== LOOP ==================
void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  String request = client.readStringUntil('\r');
  client.flush();

  if (request.indexOf("GET /H") >= 0) {
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(PIN_OPPOSITE, LOW);
    ledOn = true;
    addLogSPIFFS("LED ligado");
    sendJSON(client, getStatusJSON());
  }
  else if (request.indexOf("GET /L") >= 0) {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(PIN_OPPOSITE, HIGH);
    ledOn = false;
    addLogSPIFFS("LED desligado");
    sendJSON(client, getStatusJSON());
  }
  else if (request.indexOf("GET /status") >= 0) {
    sendJSON(client, getStatusJSON());
  }
  else if (request.indexOf("GET /logs") >= 0) {
    sendJSON(client, getLogsJSON_SPIFFS());
  }
  else if (request.indexOf("GET /capture") >= 0) {
    String path = captureAndSave();
    if (path != "") {
      sendJSON(client, "{\"capture\":\"" + path + "\"}");
    } else {
      sendJSON(client, "{\"error\":\"falha na captura\"}");
    }
  }
  else {
    client.print("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n");
    client.print("<html><body><h1>HIVE STREAM</h1>");
    client.print("<p><a href='/H'>🔴 Ligar LED</a></p>");
    client.print("<p><a href='/L'>⚪ Desligar LED</a></p>");
    client.print("<p><a href='/status'>📊 Status JSON</a></p>");
    client.print("<p><a href='/logs'>📼 Logs persistentes</a></p>");
    client.print("<p><a href='/capture'>📷 Capturar Foto</a></p>");
    client.print("</body></html>");
  }

  delay(1);
  client.stop();
}
