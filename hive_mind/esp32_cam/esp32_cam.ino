/*
  ESP32 Soft-AP com página HTML para controle do LED via HTTP
  Pino 2 e Pino 32 ficam com estados inversos
  Acesse http://192.168.4.1/
  - Botão "Ligar"  → GET /H
  - Botão "Desligar" → GET /L
*/

#include <WiFi.h>
#include <WiFiAP.h>

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

#define PIN_OPPOSITE 32 // Pino inverso ao LED_BUILTIN

// Credenciais do AP
const char* ssid     = "HIVE STREAM";
const char* password = "hvstream";

WiFiServer server(80);
bool ledOn = false; // estado do LED

// Página HTML principal
String htmlPage() {
  String stateLED2 = ledOn ? "Ligado" : "Desligado";
  String colorLED2 = ledOn ? "#16a34a" : "#ef4444";

  String stateLED32 = ledOn ? "Desligado" : "Ligado";
  String colorLED32 = ledOn ? "#ef4444" : "#16a34a";

  String html =
    String(F("HTTP/1.1 200 OK\r\n"
             "Content-Type: text/html; charset=utf-8\r\n"
             "Connection: close\r\n"
             "\r\n")) +
    F("<!DOCTYPE html><html lang='pt-br'><head><meta charset='utf-8'/>"
      "<meta name='viewport' content='width=device-width, initial-scale=1'/>"
      "<title>HIVE STREAM - Controle</title>"
      "<style>"
      "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;"
      "margin:0;background:#0b1220;color:#e5e7eb;display:flex;min-height:100vh;align-items:center;justify-content:center}"
      ".card{background:#111827;border:1px solid #1f2937;border-radius:16px;padding:24px;max-width:520px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.35)}"
      "h1{font-size:22px;margin:0 0 6px}"
      "p.sub{margin:0 0 18px;color:#9ca3af}"
      ".state{display:inline-block;padding:6px 10px;border-radius:999px;font-weight:600;margin:8px 0;background:#0f172a}"
      ".btns{display:flex;gap:12px;margin-top:18px}"
      "a.btn{flex:1;text-align:center;text-decoration:none;padding:12px 14px;border-radius:12px;font-weight:700;border:1px solid #374151;transition:.2s}"
      "a.btn:hover{transform:translateY(-1px)}"
      ".on{background:#093916}"
      ".off{background:#3a0b0b}"
      ".meta{margin-top:18px;font-size:13px;color:#9ca3af}"
      "code{background:#0f172a;border:1px solid #1f2937;border-radius:8px;padding:2px 6px}"
      "</style></head><body><div class='card'>")
    + F("<h1>HIVE STREAM</h1><p class='sub'>Controle do LED via Wi-Fi (Soft-AP)</p>")
    + String("<div class='state' style='color:") + colorLED2 + "'>LED pino 2: <strong>" + stateLED2 + "</strong></div>"
    + String("<div class='state' style='color:") + colorLED32 + "'>Pino 32: <strong>" + stateLED32 + "</strong></div>"
    + F("<div class='btns'>"
        "<a class='btn on'  href='/H'>Ligar LED 2</a>"
        "<a class='btn off' href='/L'>Desligar LED 2</a>"
        "</div>"
        "<div class='meta'>Endereço: <code>http://192.168.4.1</code> • Rotas: <code>/H</code> e <code>/L</code></div>"
        "</div></body></html>");

  return html;
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(PIN_OPPOSITE, OUTPUT);

  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(PIN_OPPOSITE, HIGH); // estado inicial inverso
  ledOn = false;

  Serial.begin(115200);
  Serial.println();
  Serial.println("Configurando Access Point...");

  if (!WiFi.softAP(ssid, password)) {
    Serial.println("Falha ao iniciar Soft-AP!");
    while (true) { delay(1000); }
  }

  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);

  server.begin();
  Serial.println("Servidor iniciado");
  Serial.println("Acesse: http://192.168.4.1/");
}

void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  Serial.println("Novo cliente conectado.");
  String reqLine = "";
  String header = "";

  unsigned long timeout = millis() + 2000;
  while (client.connected() && millis() < timeout) {
    if (client.available()) {
      char c = client.read();
      header += c;
      if (c == '\n' && reqLine.length() == 0) {
        int end = header.indexOf('\r');
        reqLine = header.substring(0, end >= 0 ? end : header.length());
      }
      if (header.endsWith("\r\n\r\n")) break;
    }
  }

  Serial.println(reqLine);

  if (reqLine.startsWith("GET /H")) {
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(PIN_OPPOSITE, LOW); // estado inverso
    ledOn = true;
    client.print(htmlPage());
  } else if (reqLine.startsWith("GET /L")) {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(PIN_OPPOSITE, HIGH); // estado inverso
    ledOn = false;
    client.print(htmlPage());
  } else if (reqLine.startsWith("GET /state")) {
    String body = String("{\"led\":\"") + (ledOn ? "on" : "off") + "\"}";
    client.print(
      String("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: ")
      + body.length() + "\r\n\r\n" + body
    );
  } else {
    client.print(htmlPage());
  }

  delay(1);
  client.stop();
  Serial.println("Cliente desconectado.");
}
