#include <WiFi.h>
#include <WiFiAP.h>

// --- Configurações do LED ---
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
#define PIN_OPPOSITE 32
bool ledOn = false;

// --- Credenciais do Soft-AP ---
const char* ssid = "HIVE STREAM";
const char* password = "hvstream";

// --- Servidor HTTP ---
WiFiServer server(80);

// --- Status JSON ---
String getStatusJSON() {
  IPAddress ip = WiFi.softAPIP();
  String json = "{";
  json += "\"led_builtin\":\"" + String(ledOn ? "on" : "off") + "\",";
  json += "\"led_opposite\":\"" + String(ledOn ? "off" : "on") + "\",";
  json += "\"ip\":\"" + ip.toString() + "\"";
  json += "}";
  return json;
}

// --- Streaming simulado (HTML atualizando status) ---
void handleStream(WiFiClient &client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html");
  client.println("Connection: close");
  client.println();
  client.println("<html><body>");
  client.println("<h1>HIVE STREAM - Streaming</h1>");
  client.println("<div id='status'></div>");
  client.println("<script>");
  client.println("async function fetchStatus(){");
  client.println("  const res = await fetch('/status');");
  client.println("  const data = await res.json();");
  client.println("  document.getElementById('status').innerHTML = ");
  client.println("    `<p>ESP32: ${data.led_builtin}</p><p>LED 32: ${data.led_opposite}</p><p>IP: ${data.ip}</p>`;");
  client.println("}");
  client.println("setInterval(fetchStatus, 1000);");
  client.println("fetchStatus();");
  client.println("</script>");
  client.println("</body></html>");
}

// --- Setup ---
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH);
  ledOn = false;

  Serial.begin(115200);
  Serial.println("🚀 Iniciando HIVE STREAM (ESP32-WROVER-DEV)...");

  if(!WiFi.softAP(ssid, password)) {
    Serial.println("❌ Falha ao iniciar Soft-AP");
    while(true) delay(1000);
  }

  Serial.print("📡 AP iniciado. IP: ");
  Serial.println(WiFi.softAPIP());

  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
}

// --- Loop principal ---
void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  String request = client.readStringUntil('\r');
  client.flush();

  if (request.indexOf("GET /H") >= 0) {
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(PIN_OPPOSITE, LOW);
    ledOn = true;
    client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
    client.print(getStatusJSON());
  }
  else if (request.indexOf("GET /L") >= 0) {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(PIN_OPPOSITE, HIGH);
    ledOn = false;
    client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
    client.print(getStatusJSON());
  }
  else if (request.indexOf("GET /status") >= 0) {
    client.print("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n");
    client.print(getStatusJSON());
  }
  else if (request.indexOf("GET /stream") >= 0) {
    handleStream(client);
  }
  else {
    client.print("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n");
    client.print("<html><body><h1>HIVE STREAM ESP32-WROVER-DEV</h1>");
    client.print("<p><a href='/H'>🔴 Ligar LED</a></p>");
    client.print("<p><a href='/L'>⚪ Desligar LED</a></p>");
    client.print("<p><a href='/status'>📊 Status JSON</a></p>");
    client.print("<p><a href='/stream'>🎥 Streaming</a></p>");
    client.print("</body></html>");
  }

  delay(1);
  client.stop();
}
