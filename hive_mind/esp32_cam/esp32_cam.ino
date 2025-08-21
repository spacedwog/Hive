#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"
#include "FS.h"
#include "SD_MMC.h"
#include "esp_timer.h"

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
String lastSavedPath = "";
String vespaData = "{}";

// ==== UART da Vespa ====
HardwareSerial SerialVESPA(1);
#define RX_VESPA 16
#define TX_VESPA 17
#define BAUD_UART 9600
String uartBuffer = "";

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

// ==== Captura foto e salva ====
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
    lastSavedPath = path;
    Serial.println("Foto salva em: " + path);
  } else {
    Serial.println("Erro ao abrir arquivo no SD");
  }

  esp_camera_fb_return(fb);
  return path;
}

// ==== Stream MJPEG ====
void handleStream() {
  WiFiClient client = server.client();
  camera_fb_t *fb;
  String boundary = "HIVESTREAM";

  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.sendHeader("Content-Type", "multipart/x-mixed-replace; boundary=" + boundary);
  server.send(200);

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) break;

    client.printf("--%s\r\n", boundary.c_str());
    client.printf("Content-Type: image/jpeg\r\n");
    client.printf("Content-Length: %u\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.printf("\r\n");

    esp_camera_fb_return(fb);

    if (!client.connected()) break;
    delay(100);
  }
}

// ==== Handler para última foto e dados da Vespa ====
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

  String html = "<h1>Última Foto</h1>";
  html += "<p><b>Caminho:</b> " + lastSavedPath + "</p>";
  html += "<p><b>Dados Vespa:</b></p><pre>" + vespaData + "</pre>";
  html += "<img src='/saved.jpg' width='320'/>";

  server.send(200, "text/html", html);
  file.close();
}

// ==== Endpoint JSON da Vespa ====
void handleVespaData() {
  server.send(200, "application/json", vespaData);
}

// ==== SSE para refresh automático ====
void handleSSE() {
  server.sendHeader("Cache-Control", "no-cache");
  server.sendHeader("Connection", "keep-alive");
  server.sendHeader("Content-Type", "text/event-stream");
  server.send(200);

  while (true) {
    server.sendContent("data: " + vespaData + "\n\n");
    server.client().flush();
    if (!server.client().connected()) break;
    delay(500);
  }
}

// ==== Endpoint de dados do streaming ====
void handleStreamData() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "application/json", "{\"error\":\"Falha ao capturar frame\"}");
    return;
  }

  String json = "{";
  json += "\"streaming\":" + String(streaming ? "true" : "false") + ",";
  json += "\"width\":" + String(fb->width) + ",";
  json += "\"height\":" + String(fb->height) + ",";
  json += "\"len\":" + String(fb->len);
  json += "}";

  server.send(200, "application/json", json);
  esp_camera_fb_return(fb);
}

// ==== Endpoints captura/gravação ====
void handleCapture() {
  String path = capturePhoto();
  server.send(200, "text/plain", path != "" ? "Foto capturada: " + path : "Erro ao capturar foto");
}

void handleStart() {
  streaming = true;
  server.send(200, "text/plain", "Streaming iniciado");
}

void handleStop() {
  streaming = false;
  server.send(200, "text/plain", "Streaming parado");
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);
  WiFi.softAP(ssid, password);
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());

  SerialVESPA.begin(BAUD_UART, SERIAL_8N1, RX_VESPA, TX_VESPA);

  startCamera();
  startSD();

  server.on("/", []() {
    server.send(200, "text/html",
      "<h1>ESP32-CAM SoftAP</h1>"
      "<p><a href='/saved.jpg'>Última imagem + Vespa</a></p>"
      "<p><a href='/vespa.json'>Dados Vespa (JSON)</a></p>"
      "<p><a href='/vespa/stream'>Refresh SSE</a></p>"
      "<p><a href='/stream'>Streaming MJPEG</a></p>"
      "<p><a href='/stream/data'>Dados do Streaming (JSON)</a></p>");
  });
  server.on("/saved.jpg", handleSavedImage);
  server.on("/vespa.json", handleVespaData);
  server.on("/vespa/stream", handleSSE);
  server.on("/capture", handleCapture);
  server.on("/start", handleStart);
  server.on("/stop", handleStop);
  server.on("/stream", handleStream);
  server.on("/stream/data", handleStreamData);

  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

// ==== Loop ====
void loop() {
  server.handleClient();

  // Recebe dados da Vespa via UART
  while (SerialVESPA.available()) {
    char c = SerialVESPA.read();
    if (c == '\n') {
      uartBuffer.trim();
      if (uartBuffer.startsWith("STATUS:")) {
        vespaData = uartBuffer.substring(7);
        Serial.println("Vespa Data Updated: " + vespaData);
      }
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }
}
