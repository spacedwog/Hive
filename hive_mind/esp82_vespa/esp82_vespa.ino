#include <WiFi.h>
#include <painlessMesh.h>
#include <ArduinoJson.h>

// 📶 Configurações da rede Wi-Fi local (para React Native)
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

// 🔗 Configurações da rede Mesh
#define MESH_PREFIX     "HIVE_MESH"
#define MESH_PASSWORD   "hive2025"
#define MESH_PORT       5555

Scheduler userScheduler;
painlessMesh mesh;

bool activated = false;
int sensorValue = 0;
IPAddress localIP;

// ⏱️ Tarefa periódica
void sendMeshStatus();
Task taskSendMeshStatus(TASK_SECOND * 10, TASK_FOREVER, &sendMeshStatus);

// 📤 Envia status com sensor e anomalias via Mesh (e visível ao app React Native)
void sendMeshStatus() {
  DynamicJsonDocument doc(256);

  sensorValue = analogRead(34); // Lê o valor de um sensor no pino 34
  bool anomaly = sensorValue > 3000;

  doc["device"] = "ESP32_VESPA";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = sensorValue;
  doc["mesh"] = true;
  doc["anomaly"] = anomaly;
  doc["ip"] = WiFi.localIP().toString();

  String msg;
  serializeJson(doc, msg);

  mesh.sendBroadcast(msg);

  Serial.println("📤 Broadcast enviado:");
  Serial.println(msg);
}

// 📥 Trata mensagens recebidas pela Mesh
void receivedCallback(uint32_t from, String &msg) {
  Serial.printf("📩 Mensagem recebida de %u: %s\n", from, msg.c_str());

  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, msg);
  if (error) {
    Serial.println("❌ Erro ao analisar JSON");
    return;
  }

  if (doc.containsKey("command")) {
    String command = doc["command"];
    if (command == "activate") {
      activated = true;
      digitalWrite(2, HIGH);
      Serial.println("✅ Dispositivo ativado");
    } else if (command == "deactivate") {
      activated = false;
      digitalWrite(2, LOW);
      Serial.println("⛔ Dispositivo desativado");
    } else if (command == "ping") {
      sendMeshStatus();
    } else {
      Serial.println("⚠️ Comando desconhecido");
    }
  }
}

// 🌐 Conecta à rede Wi-Fi local (para comunicação com app React Native)
void connectToWiFi() {
  Serial.println("🌐 Conectando ao Wi-Fi local...");
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    localIP = WiFi.localIP();
    Serial.println("\n✅ Wi-Fi conectado.");
    Serial.print("📡 IP local: ");
    Serial.println(localIP);
  } else {
    Serial.println("\n❌ Falha ao conectar ao Wi-Fi.");
  }
}

// 🔧 Inicialização
void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);      // LED ou atuador no pino 2
  digitalWrite(2, LOW);    // Começa desligado

  connectToWiFi();         // Conecta ao Wi-Fi local

  Serial.println("🚀 Iniciando Vespa com suporte Mesh...");

  // Inicializa a malha
  mesh.setDebugMsgTypes(ERROR | STARTUP | CONNECTION);
  mesh.init(MESH_PREFIX, MESH_PASSWORD, &userScheduler, MESH_PORT);
  mesh.onReceive(&receivedCallback);

  // Tarefa periódica para enviar dados para Mesh e app React Native
  userScheduler.addTask(taskSendMeshStatus);
  taskSendMeshStatus.enable();
}

// 🔁 Loop principal
void loop() {
  mesh.update();
}