#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <painlessMesh.h>

// Wi-Fi tradicional
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

// Configuração da mesh
#define   MESH_PREFIX     "HIVE_MESH"
#define   MESH_PASSWORD   "hive2025"
#define   MESH_PORT       5555

Scheduler userScheduler;
painlessMesh mesh;

WebServer server(80);
bool activated = false;

// Envia status para outros nós da mesh
void sendMeshStatus() {
  DynamicJsonDocument doc(256);
  int sensorValue = analogRead(34);
  bool anomaly = sensorValue > 3000;

  doc["device"] = "Vespa";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = sensorValue;
  doc["mesh"] = true;
  doc["anomaly"] = anomaly;

  String msg;
  serializeJson(doc, msg);
  mesh.sendBroadcast(msg);
}

// Responde comandos recebidos via Mesh
void receivedCallback(uint32_t from, String &msg) {
  Serial.printf("Mensagem Mesh recebida de %u: %s\n", from, msg.c_str());

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, msg)) return;

  if (doc.containsKey("command")) {
    String command = doc["command"];
    if (command == "activate") {
      activated = true;
      digitalWrite(32, HIGH);
    } else if (command == "deactivate") {
      activated = false;
      digitalWrite(32, LOW);
    }
  }
}

// HTTP: /status
void handleStatus() {
  DynamicJsonDocument doc(256);
  int sensorValue = analogRead(34);
  bool anomaly = sensorValue > 3000;

  doc["device"] = "Vespa";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = sensorValue;
  doc["mesh"] = true;
  doc["anomaly"] = anomaly;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// HTTP: /command
void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Bad Request");
    return;
  }

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, server.arg("plain"))) {
    server.send(400, "application/json", "{\"error\": \"Invalid JSON\"}");
    return;
  }

  String command = doc["command"];
  if (command == "activate") {
    activated = true;
    digitalWrite(32, HIGH);
  } else if (command == "deactivate") {
    activated = false;
    digitalWrite(32, LOW);
  } else if (command == "analyze") {
    int value = analogRead(34);
    bool anomaly = value > 3000;
    String msg = anomaly ? "Anomalia detectada!" : "Padrão normal.";
    server.send(200, "application/json", "{\"result\": \"" + msg + "\"}");
    return;
  }

  server.send(200, "text/plain", "Command received");
}

void setup() {
  Serial.begin(115200);
  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);

  // Conecta ao Wi-Fi tradicional
  WiFi.begin(ssid, password);
  Serial.println("Conectando ao Wi-Fi...");
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(1000);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado com sucesso!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());

    server.on("/status", handleStatus);
    server.on("/command", HTTP_POST, handleCommand);
    server.begin();
  } else {
    Serial.println("\n[WiFi] Falha ao conectar.");
  }

  // Inicia rede Mesh
  mesh.setDebugMsgTypes(ERROR | STARTUP | CONNECTION);
  mesh.init(MESH_PREFIX, MESH_PASSWORD, &userScheduler, MESH_PORT);
  mesh.onReceive(&receivedCallback);

  // Envia status para a Mesh a cada 10 segundos
  userScheduler.addTask(Task(TASK_SECOND * 10, TASK_FOREVER, &sendMeshStatus));
  userScheduler.getTask(0)->enable();
}

void loop() {
  server.handleClient();
  mesh.update();
}
