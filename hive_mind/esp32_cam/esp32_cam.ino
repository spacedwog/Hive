#include "esp_camera.h"
#include <WiFi.h>
#include "FS.h"
#include "SD_MMC.h"
#include <WebServer.h>

// ==== Configuração da câmera (ESP32-CAM AI-Thinker) ====
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

// ==== Configuração do Soft-AP ====
const char* ssid = "HIVE STREAM";
const char* password = "hvstream";

// ==== Controle de gravação ====
File videoFile;
bool gravando = false;
unsigned long ultimaGravacao = 0;
int contadorArquivo = 0;

// ==== Servidor HTTP ====
WebServer server(80);

// ==== Inicializa câmera ====
void initCamera() {
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
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Erro na inicialização da câmera: 0x%x\n", err);
    return;
  }
}

// ==== Inicia gravação ====
void iniciarGravacao() {
  if (!SD_MMC.begin()) {
    Serial.println("Falha ao iniciar SD_MMC");
    return;
  }

  String nomeArquivo = "/video" + String(contadorArquivo++) + ".avi";
  videoFile = SD_MMC.open(nomeArquivo, FILE_WRITE);
  if (!videoFile) {
    Serial.println("Erro ao criar arquivo de vídeo");
    return;
  }

  gravando = true;
  ultimaGravacao = millis();
  Serial.println("Iniciando gravação: " + nomeArquivo);
}

// ==== Finaliza gravação ====
void pararGravacao() {
  if (gravando) {
    videoFile.close();
    gravando = false;
    Serial.println("Gravação finalizada.");
  }
}

// ==== Captura frames e salva ====
void loopGravacao() {
  if (!gravando) return;

  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Falha ao capturar frame");
    return;
  }

  // Salva frame no arquivo
  videoFile.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  // Exemplo: para gravação após 20 segundos
  if (millis() - ultimaGravacao > 20000) {
    pararGravacao();
  }
}

// ==== Endpoints HTTP ====
void handleCapture() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Erro ao capturar frame");
    return;
  }

  server.sendHeader("Content-Type", "image/jpeg");
  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.client().write(fb->buf, fb->len); // envia bytes diretamente
  esp_camera_fb_return(fb);
}

void handleStart() {
  iniciarGravacao();
  server.send(200, "text/plain", "Gravação iniciada");
}

void handleStop() {
  pararGravacao();
  server.send(200, "text/plain", "Gravação parada");
}

// ==== Setup ====
void setup() {
  Serial.begin(115200);
  initCamera();

  // Inicializa Soft-AP
  WiFi.softAP(ssid, password);
  Serial.println("Soft-AP iniciado!");
  Serial.print("IP do AP: ");
  Serial.println(WiFi.softAPIP());

  // Configura rotas
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/start", HTTP_GET, handleStart);
  server.on("/stop", HTTP_GET, handleStop);

  server.begin();
}

// ==== Loop ====
void loop() {
  server.handleClient();
  loopGravacao();
}
