#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiAP.h>

// Definições de pinos
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
#define PIN_OPPOSITE 32 // pino inverso ao LED_BUILTIN

// Credenciais do Soft-AP
const char* ssid = "HIVE STREAM";
const char* password = "hvstream";

// Servidor HTTP
WiFiServer server(80);
bool ledOn = false; // estado atual do LED

// Configuração da câmera (modelo AI-Thinker)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Inicializa a câmera
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA; // 640x480
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_CIF; // 352x288
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Falha ao inicializar câmera. Erro 0x%x\n", err);
  } else {
    Serial.println("✅ Câmera inicializada com sucesso");
  }
}

// Página HTML simples de controle
String htmlPage() {
  String state1 = ledOn ? "Ligado" : "Desligado";
  String color1 = ledOn ? "green" : "red";

  String state2 = ledOn ? "Desligado" : "Ligado";
  String color2 = ledOn ? "red" : "green";

  String page = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  page += "<title>ESP32-CAM</title></head><body>";
  page += "<h1>Controle do ESP32-CAM</h1>";
  page += "<p>LED pino 2: <strong style='color:" + color1 + "'>" + state1 + "</strong></p>";
  page += "<p>LED pino 32: <strong style='color:" + color2 + "'>" + state2 + "</strong></p>";
  page += "<a href='/H'>Ligar LED</a><br>";
  page += "<a href='/L'>Desligar LED</a><br>";
  page += "<a href='/stream'>📷 Ver Câmera</a>";
  page += "</body></html>";
  return page;
}

// Streaming de imagens JPEG
void handleStream(WiFiClient client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: multipart/x-mixed-replace; boundary=frame");
  client.println();

  while (client.connected()) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) continue;

    client.println("--frame");
    client.println("Content-Type: image/jpeg");
    client.print("Content-Length: ");
    client.println(fb->len);
    client.println();
    client.write(fb->buf, fb->len);
    client.println();

    esp_camera_fb_return(fb);

    if(!client.connected()) break;
    delay(100); // ~10fps
  }
}

// Função para enviar JSON
void sendJSON(WiFiClient& client, const String& json) {
  client.print("HTTP/1.1 200 OK\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Connection: close\r\n");
  client.print("Content-Length: " + String(json.length()) + "\r\n\r\n");
  client.print(json);
}

// Função para gerar JSON de status completo
String getStatusJSON() {
  String cameraStatus = (esp_camera_fb_get() != NULL) ? "OK" : "Erro";
  IPAddress ip = WiFi.softAPIP();

  String json = "{";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(ledOn ? "off" : "on") + "\",";
  json += "\"camera\":\"" + cameraStatus + "\",";
  json += "\"ip\":\"" + ip.toString() + "\"";
  json += "}";
  return json;
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🚀 Iniciando HIVE STREAM...");

  if(!WiFi.softAP(ssid, password)) {
    Serial.println("❌ Falha ao iniciar Soft-AP");
    while(true) delay(1000);
  }

  IPAddress myIP = WiFi.softAPIP();
  Serial.print("📡 AP iniciado. IP: "); Serial.println(myIP);

  initCamera();
  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  String request = client.readStringUntil('\r');
  Serial.println("➡️ Requisição: " + request);
  client.flush();

  if (request.indexOf("GET /H") >= 0) {
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(PIN_OPPOSITE, LOW);
    ledOn = true;
    client.print("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n" + htmlPage());
  } 
  else if (request.indexOf("GET /L") >= 0) {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(PIN_OPPOSITE, HIGH);
    ledOn = false;
    client.print("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n" + htmlPage());
  } 
  else if (request.indexOf("GET /state") >= 0 || request.indexOf("GET /status") >= 0) {
    sendJSON(client, getStatusJSON());
  } 
  else if (request.indexOf("GET /stream") >= 0) {
    handleStream(client);
  } 
  else {
    client.print("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n" + htmlPage());
  }

  delay(1);
  client.stop();
}
