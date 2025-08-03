#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>

const char* ssid = "HIVE_NET";
const char* password = "12345678";
WebServer server(80);

// IP do NodeMCU
const char* nodemcu_ip = "192.168.4.1";

void setup() {
  Serial.begin(115200);
  Wire.begin();  // I2C para Blackboard

  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  server.on("/command", handleCommand);
  server.begin();
}

void handleCommand() {
  String cmd = server.arg("cmd");
  String response = "Executando: " + cmd;

  if (cmd == "scan") {
    response += "\n> Buscando nodos...";
    // lógica de escaneamento ou simulação
  } else if (cmd == "alert") {
    Wire.beginTransmission(0x08);  // Blackboard como slave
    Wire.write("ALERT");
    Wire.endTransmission();
    response += "\n> Alerta enviado ao Blackboard.";
  } else if (cmd == "shutdown_nodemcu") {
    WiFiClient client;
    if (client.connect(nodemcu_ip, 80)) {
      client.print("GET /shutdown HTTP/1.1\r\nHost: nodemcu\r\nConnection: close\r\n\r\n");
      response += "\n> Comando enviado ao NodeMCU.";
    } else {
      response += "\n> Falha ao contatar NodeMCU.";
    }
  }

  server.send(200, "text/plain", response);
}

void loop() {
  server.handleClient();
}