#include <painlessMesh.h>
#include <ArduinoJson.h>

#define   MESH_PREFIX     "HIVE_MESH"
#define   MESH_PASSWORD   "hive2025"
#define   MESH_PORT       5555

Scheduler userScheduler;
painlessMesh mesh;

bool activated = false;
int sensorValue = 0;

void sendStatus();
Task taskSendStatus(TASK_SECOND * 5, TASK_FOREVER, &sendStatus);

void sendStatus() {
  DynamicJsonDocument doc(256);
  sensorValue = analogRead(A0);
  bool anomaly = sensorValue > 800;

  doc["device"] = "NodeMCU";
  doc["status"] = activated ? "active" : "idle";
  doc["sensor"] = sensorValue;
  doc["anomaly"] = anomaly;

  String msg;
  serializeJson(doc, msg);
  mesh.sendBroadcast(msg);
}

void receivedCallback(uint32_t from, String &msg) {
  Serial.printf("Mensagem recebida de %u: %s\n", from, msg.c_str());

  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, msg);

  if (error) {
    Serial.println("Erro ao analisar JSON");
    return;
  }

  if (doc.containsKey("command")) {
    String command = doc["command"];
    if (command == "activate") {
      activated = true;
      digitalWrite(D1, HIGH);
    } else if (command == "deactivate") {
      activated = false;
      digitalWrite(D1, LOW);
    } else if (command == "ping") {
      sendStatus();
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(D1, OUTPUT);
  digitalWrite(D1, LOW);

  mesh.setDebugMsgTypes(ERROR | STARTUP | CONNECTION);
  mesh.init(MESH_PREFIX, MESH_PASSWORD, &userScheduler, MESH_PORT);
  mesh.onReceive(&receivedCallback);

  userScheduler.addTask(taskSendStatus);
  taskSendStatus.enable();
}

void loop() {
  Serial.println("[INFO] IP local (NodeMCU): " + mesh.getStationIP().toString());
  mesh.update();
}
