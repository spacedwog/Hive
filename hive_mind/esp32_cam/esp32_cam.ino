#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// ==== Configuração da câmera ====
// Pinos do modelo AI-Thinker ESP32-CAM
#define PWDN_GPIO_NUM     -1
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

// ==== WiFi SoftAP ====
const char* ssid = "HIVE STREAM";
const char* password = "hvstream";

WebServer server(80);

bool streaming = false;

// ==== Inicia a câmera ====
void startCamera() {
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

  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Inicializa câmera
  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Erro ao iniciar a câmera!");
    return;
  }
  Serial.println("Câmera iniciada com sucesso.");
}

// ==== Handler para capturar uma foto ====
void handleCapture() {
  if (!streaming) {
    server.send(200, "text/plain", "Streaming parado. Use /start para ativar.");
    return;
  }
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Erro ao capturar frame.");
    return;
  }
  server.sendHeader("Content-Type", "image/jpeg");
  server.send_P(200, "image/jpeg", (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

// ==== Handlers para start/stop ====
void handleStart() {
  streaming = true;
  server.send(200, "text/plain", "Streaming iniciado.");
}

void handleStop() {
  streaming = false;
  server.send(200, "text/plain", "Streaming parado.");
}

void setup() {
  Serial.begin(115200);

  // Inicia SoftAP
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  // Inicia câmera
  startCamera();

  // Rotas
  server.on("/", []() {
    server.send(200, "text/html",
      "<h1>ESP32-CAM SoftAP</h1>"
      "<p><a href=\"/start\">Iniciar streaming</a></p>"
      "<p><a href=\"/stop\">Parar streaming</a></p>"
      "<p><a href=\"/capture\">Capturar imagem</a></p>");
  });
  server.on("/start", handleStart);
  server.on("/stop", handleStop);
  server.on("/capture", handleCapture);

  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

void loop() {
  server.handleClient();
}
