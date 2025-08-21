#include <WiFi.h>
#include <esp_camera.h>
#include <FS.h>
#include <SD_MMC.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ==== CONFIGURAÇÃO DA CÂMERA ====
// Use a configuração correta para sua ESP32-CAM (AI Thinker é a mais comum)
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

// ==== CONFIGURAÇÃO WiFi Soft AP ====
const char* ssid = "HIVE STREAM";
const char* password = "hvstream";

// ==== Servidor Web ====
WiFiServer server(80);
bool streaming = false;

// ==== Handler para streaming MJPEG ====
void handleStream(WiFiClient client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: multipart/x-mixed-replace; boundary=frame");
  client.println();

  while (client.connected()) {
    unsigned long startCapture = millis();

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Erro: frame não capturado!");
      continue;
    }

    unsigned long captureTime = millis() - startCapture;

    // 👉 Exibe informações do frame no Serial Monitor
    Serial.println("===== Frame Capturado =====");
    Serial.print("📸 Tamanho: "); Serial.print(fb->len); Serial.println(" bytes");
    Serial.print("📐 Resolução: "); Serial.print(fb->width); Serial.print("x"); Serial.println(fb->height);
    Serial.print("⏱️ Tempo de captura: "); Serial.print(captureTime); Serial.println(" ms");

    // Envia frame via HTTP
    client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.println();

    // Salva automaticamente no SD
    String path = "/stream_" + String(millis()) + ".jpg";
    File file = SD_MMC.open(path, FILE_WRITE);
    if (file) {
      file.write(fb->buf, fb->len);
      file.close();
      Serial.println("✅ Foto salva em " + path);
    } else {
      Serial.println("❌ Falha ao salvar no SD");
    }

    esp_camera_fb_return(fb);
    delay(100); // controla o FPS (~10 fps)
  }
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Desativa brownout

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

  // Resolução inicial
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 10;
  config.fb_count = 2;

  // Inicializa câmera
  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Erro ao inicializar câmera!");
    return;
  }

  // Inicia SD
  if (!SD_MMC.begin()) {
    Serial.println("❌ Falha ao montar SD!");
  } else {
    Serial.println("✅ SD inicializado com sucesso");
  }

  // Configura WiFi como Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  Serial.println("✅ Soft AP iniciado");
  Serial.print("📡 SSID: "); Serial.println(ssid);
  Serial.print("🔑 Senha: "); Serial.println(password);
  Serial.print("🌐 IP: "); Serial.println(WiFi.softAPIP());

  // Inicia servidor
  server.begin();
  Serial.println("🚀 Servidor Web iniciado");
}

// ==== Loop principal ====
void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  String request = client.readStringUntil('\r');
  client.flush();

  if (request.indexOf("/stream") != -1) {
    Serial.println("📡 Cliente conectado ao stream!");
    handleStream(client);
  } else {
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/html");
    client.println("Connection: close");
    client.println();
    client.println("<!DOCTYPE HTML>");
    client.println("<html>");
    client.println("<h1>ESP32-CAM Streaming (Soft AP)</h1>");
    client.println("<p><a href=\"/stream\">Iniciar Streaming</a></p>");
    client.println("</html>");
  }
}
