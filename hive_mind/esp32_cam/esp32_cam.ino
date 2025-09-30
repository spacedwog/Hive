#include <WiFi.h>
#include <WiFiAP.h>
#include "esp_camera.h"

// --- Configurações do LED ---
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
#define PIN_OPPOSITE 32
bool ledOn = false;

// --- Sensor de som ---
#define SOUND_SENSOR_PIN 34
#define SOUND_THRESHOLD 1000
#define LED_AUTO_OFF_MS 5000
unsigned long lastSoundTime = 0;

// --- Configurações Wi-Fi ---
const char* ap_ssid = "HIVE STREAM";
const char* ap_password = "hvstream";
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";

// --- Servidor HTTP ---
WiFiServer server(80);

// --- Configurações da câmera ---
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

// --- Função de status JSON ---
String getStatusJSON() {
  IPAddress ipAP = WiFi.softAPIP();
  IPAddress ipSTA = WiFi.localIP();
  int soundLevel = analogRead(SOUND_SENSOR_PIN);

  String json = "{";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(ledOn ? "off" : "on") + "\",";
  json += "\"ip_ap\":\"" + ipAP.toString() + "\",";
  json += "\"ip_sta\":\"" + (ipSTA.toString() == "0.0.0.0" ? "desconectado" : ipSTA.toString()) + "\",";
  json += "\"sound_level\":" + String(soundLevel) + ",";
  json += "\"auto_off_ms\":" + String(LED_AUTO_OFF_MS);
  json += "}";
  return json;
}

// --- Controle do LED ---
void setLED(bool state) {
  digitalWrite(LED_BUILTIN, state ? HIGH : LOW);
  digitalWrite(PIN_OPPOSITE, state ? LOW : HIGH);
  ledOn = state;
  if (state) lastSoundTime = millis();
}

// --- Inicializa câmera ---
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
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA; // 320x240
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Erro ao inicializar câmera: %d\n", err);
    while (true) { delay(1000); }
  }
}

// --- Setup ---
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🚀 Iniciando HIVE STREAM (ESP32-CAM)...");

  initCamera();

  WiFi.mode(WIFI_AP_STA);
  if (WiFi.softAP(ap_ssid, ap_password)) {
    Serial.print("📡 AP iniciado. IP: "); Serial.println(WiFi.softAPIP());
  }

  WiFi.begin(sta_ssid, sta_password);
  Serial.print("🔄 Conectando à STA...");
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ STA Conectada. IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("⚠️ STA não conectada. Continuando apenas com AP...");
  }

  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

// --- Loop principal ---
void loop() {
  WiFiClient client = server.available();
  if (client) {
    String request = client.readStringUntil('\r');
    client.flush();

    if (request.indexOf("GET /led/on") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      setLED(true);
      client.print("{\"success\":true,\"led\":\"on\",\"message\":\"LED ligado\"}");
    }
    else if (request.indexOf("GET /led/off") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      setLED(false);
      client.print("{\"success\":true,\"led\":\"off\",\"message\":\"LED desligado\"}");
    }
    else if (request.indexOf("GET /status") >= 0) {
      client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print(getStatusJSON());
    }
    // --- Rota STREAM de imagem ---
    else if (request.indexOf("GET /stream") >= 0) {
      Serial.println("📷 Cliente requisitou /stream");

      client.print("HTTP/1.1 200 OK\r\n");
      client.print("Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n");

      while (client.connected()) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
          Serial.println("❌ Falha ao capturar frame");
          continue;
        }

        client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
        client.write(fb->buf, fb->len);
        client.print("\r\n");
        esp_camera_fb_return(fb);

        delay(100); // Ajuste para ~10 FPS
      }

      Serial.println("🛑 Stream finalizado");
      client.stop();
    }
    else {
      client.print("HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
      client.print("{\"success\":false,\"message\":\"Endpoint não encontrado\"}");
    }
  }

  int soundLevel = analogRead(SOUND_SENSOR_PIN);
  if (soundLevel > SOUND_THRESHOLD && !ledOn) {
    Serial.println("🔊 Som detectado! Ligando LED...");
    setLED(true);
  }

  if (ledOn && millis() - lastSoundTime > LED_AUTO_OFF_MS) {
    Serial.println("⏱️ Sem som por 5s. Desligando LED...");
    setLED(false);
  }

  delay(10);
}
