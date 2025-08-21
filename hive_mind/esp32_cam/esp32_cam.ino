#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"
#include "FS.h"
#include "SD_MMC.h"

// ==== Configuração da câmera (AI Thinker) ====
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

// ==== WiFi SoftAP ====
const char* ssid     = "HIVE STREAM";
const char* password = "hvstream";

WebServer server(80);
bool streaming = false;
String lastSavedPath = "";   // <- último arquivo salvo no SD

// ==== Inicializa a câmera ====
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

  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count     = 2;
  } else {
    config.frame_size   = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count     = 1;
  }

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Erro ao iniciar a câmera!");
    return;
  }
  Serial.println("Câmera iniciada com sucesso.");
}

// ==== Inicializa o SD ====
void startSD() {
  if (!SD_MMC.begin()) {
    Serial.println("Erro ao inicializar SD");
  } else {
    Serial.println("SD inicializado com sucesso");
  }
}

// ==== Captura uma foto e salva no SD ====
String capturePhoto() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Erro: fb=nullptr");
    return "";
  }

  String path = "/foto_" + String(millis()) + ".jpg";
  File file = SD_MMC.open(path, FILE_WRITE);
  if (file) {
    file.write(fb->buf, fb->len);
    file.close();
    lastSavedPath = path;   // <- guarda última imagem
    Serial.println("Foto salva em: " + path);
  } else {
    Serial.println("Erro ao abrir arquivo no SD");
  }

  esp_camera_fb_return(fb);
  return path;
}

// ==== Handler para capturar manualmente ====
void handleCapture() {
  String path = capturePhoto();
  if (path != "") {
    server.send(200, "text/plain", "Foto capturada: " + path);
  } else {
    server.send(500, "text/plain", "Erro ao capturar foto.");
  }
}

// ==== Rota para exibir última imagem salva ====
void handleSavedImage() {
  if (lastSavedPath == "") {
    server.send(404, "text/plain", "Nenhuma imagem salva ainda.");
    return;
  }

  File file = SD_MMC.open(lastSavedPath);
  if (!file) {
    server.send(500, "text/plain", "Erro ao abrir a imagem.");
    return;
  }

  server.streamFile(file, "image/jpeg");
  file.close();
}

// ==== Handlers start/stop ====
void handleStart() {
  streaming = true;
  server.send(200, "text/plain", "Streaming iniciado.");
}

void handleStop() {
  streaming = false;
  server.send(200, "text/plain", "Streaming parado.");
}

// ==== Streaming MJPEG ====
void handleStream() {
  WiFiClient client = server.client();

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: multipart/x-mixed-replace; boundary=frame");
  client.println();

  while (streaming) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) continue;

    client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.println();

    // Salva no SD
    String path = "/stream_" + String(millis()) + ".jpg";
    File file = SD_MMC.open(path, FILE_WRITE);
    if (file) {
      file.write(fb->buf, fb->len);
      file.close();
      lastSavedPath = path;
    }

    esp_camera_fb_return(fb);
    delay(100); // ~10 FPS
  }
}

void setup() {
  Serial.begin(115200);

  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  startCamera();
  startSD();

  // Rotas web
  server.on("/", []() {
    server.send(200, "text/html",
      "<h1>ESP32-CAM SoftAP</h1>"
      "<p><a href=\"/start\">Iniciar streaming</a></p>"
      "<p><a href=\"/stop\">Parar streaming</a></p>"
      "<p><a href=\"/capture\">Capturar imagem</a></p>"
      "<p><a href=\"/stream\">Visualizar streaming</a></p>"
      "<p><a href=\"/saved.jpg\">Última imagem salva</a></p>");
  });
  server.on("/start", handleStart);
  server.on("/stop", handleStop);
  server.on("/capture", handleCapture);
  server.on("/stream", handleStream);
  server.on("/saved.jpg", handleSavedImage);

  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

void loop() {
  server.handleClient();
}
