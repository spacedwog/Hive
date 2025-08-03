#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

ESP8266WebServer server(80);

void setup() {
  Serial.begin(115200);
  WiFi.begin("HIVE_NET", "12345678");
  while (WiFi.status() != WL_CONNECTED) delay(1000);

  server.on("/shutdown", []() {
    server.send(200, "text/plain", "NodeMCU desligando sensores.");
    // Simular desligamento ou deep sleep
    ESP.deepSleep(0);
  });

  server.begin();
}

void loop() {
  server.handleClient();
}