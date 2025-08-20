#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <HardwareSerial.h>

// ==== Serial para comunicação VP/VN ====
HardwareSerial SerialCAM(1);

// ==== Configurações da câmera (AI-Thinker ESP32-CAM) ====
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

// ==== Configuração STA ====
const char* ssid = "FAMILIA SANTOS";     // SSID da sua rede WiFi
const char* password = "6z2h1j3k9f";    // Senha da rede WiFi

// ==== WebServer ====
WebServer server(80);

// Controle de captura
bool enviarFrames = false;

void setup() {
  Serial.begin(115200);
  SerialCAM.begin(9600, SERIAL_8N1, 16, 17); // RX = VP, TX = VN

  // Inicializa câmera
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
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Erro ao inicializar a câmera");
    return;
  }
  Serial.println("Câmera inicializada");

  // Conecta ao WiFi em modo STA
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");
  Serial.print("IP do ESP32-CAM: ");
  Serial.println(WiFi.localIP());

  // Define rotas
  server.on("/start", []() {
    enviarFrames = true;
    server.send(200, "text/plain", "Captura iniciada!");
  });

  server.on("/stop", []() {
    enviarFrames = false;
    server.send(200, "text/plain", "Captura parada!");
  });

  server.begin();
}

void loop() {
  server.handleClient();

  // Envia frames apenas se ativo
  if (enviarFrames) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Falha ao capturar frame");
      return;
    }

    // Envia tamanho do frame pela serial
    SerialCAM.println(fb->len);
    for (size_t i = 0; i < fb->len; i++) {
      SerialCAM.write(fb->buf[i]);
    }
    esp_camera_fb_return(fb);

    delay(100); // intervalo entre frames
  }

  // Leitura serial da Vespa
  if (SerialCAM.available()) {
    String comando = SerialCAM.readStringUntil('\n');
    Serial.println("Recebido da Vespa: " + comando);
  }
}
