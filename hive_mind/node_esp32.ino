#include <painlessMesh.h>
#include <ArduinoJson.h>

#define MESH_PREFIX     "VespaMesh"
#define MESH_PASSWORD   "senha123"
#define MESH_PORT       5555

painlessMesh mesh;
Scheduler userScheduler;

bool activated = false;
uint32_t gatewayNodeId = 0;

// Envia status a cada 5 segundos
Task sendStatusTask(TASK_SECOND * 5, TASK_FOREVER, []() {
  int sensorValue = analogRead(34); // ajuste conforme seu sensor

  DynamicJsonDocument doc(128);
  doc["sensor"] = sensorValue;

  String msg;
  serializeJson(doc, msg);

  if (gatewayNodeId != 0) {
    mesh.sendSingle(gatewayNodeId, msg);
  } else {
    mesh.sendBroadcast(msg); // fallback
  }
});

void receivedCallback(uint32_t from, String &msg) {
  Serial.printf("Comando recebido de %u: %s\n", from, msg.c_str());
  gatewayNodeId = from;

  DynamicJsonDocument doc(128);
  if (deserializeJson(doc, msg)) return;

  String cmd = doc["command"];
  if (cmd == "activate") {
    activated = true;
    digitalWrite(2, HIGH);
  } else if (cmd == "deactivate") {
    activated = false;
    digitalWrite(2, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
  digitalWrite(2, LOW);

  mesh.setDebugMsgTypes(ERROR | STARTUP | CONNECTION);
  mesh.init(MESH_PREFIX, MESH_PASSWORD, &userScheduler, MESH_PORT);
  mesh.onReceive(&receivedCallback);

  userScheduler.addTask(sendStatusTask);
  sendStatusTask.enable();
}

void loop() {
  mesh.update();
}