#include "esp_camera.h"
#include <WiFi.h>

// ===========================
// Select camera model in board_config.h
// ===========================
#include "board_config.h"

void startCameraServer();
void setupLedFlash();

// Credenciais do WiFi existente
const char* sta_ssid     = "FAMILIA SANTOS";   // WiFi do roteador
const char* sta_password = "6z2h1j3k9f";

// Credenciais do WiFi em modo Soft-AP
const char* ap_ssid = "HIVE_STREAM";
const char* ap_password = "hvstream"; // mínimo 8 caracteres

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

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
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size   = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  if (config.pixel_format == PIXFORMAT_JPEG && psramFound()) {
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  }

  // Inicializa câmera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Falha ao iniciar câmera. Erro 0x%x", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }
  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_QVGA);
  }

#if defined(LED_GPIO_NUM)
  setupLedFlash();
#endif

  // Tenta conectar como STA (cliente do roteador)
  WiFi.mode(WIFI_STA);
  WiFi.begin(sta_ssid, sta_password);

  Serial.print("Conectando-se ao WiFi: ");
  Serial.println(sta_ssid);

  unsigned long startAttemptTime = millis();

  // Aguarda até 10 segundos
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    // Conectado ao roteador
    Serial.println("\nWiFi conectado!");
    Serial.print("IP obtido: ");
    Serial.println(WiFi.localIP());
  } else {
    // Se não conseguiu, inicia como Soft-AP
    Serial.println("\nFalha ao conectar. Iniciando Soft-AP...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_ssid, ap_password);
    Serial.print("Soft-AP ativo. IP: ");
    Serial.println(WiFi.softAPIP());
  }

  // Inicia servidor da câmera
  startCameraServer();

  Serial.println("Camera pronta!");
  if (WiFi.getMode() == WIFI_STA) {
    Serial.print("Acesse: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.print("Acesse: http://");
    Serial.println(WiFi.softAPIP());
  }
}

void loop() {
  delay(10000);
}
