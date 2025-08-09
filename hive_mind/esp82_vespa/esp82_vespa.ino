#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

#define MAX_PILHAS 1
#define TAM_PILHA 100
#define TAM_CMD   20

// Wi-Fi
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

WebServer server(80);
bool activated = false;

// Registro de comandos e status
typedef struct {
  char comando[TAM_CMD];
  int status; // 1 = acerto, 0 = erro
} Registro;

Registro banco[MAX_PILHAS][TAM_PILHA];
int topo[MAX_PILHAS];

// Inicializa as pilhas
void inicializar() {
  for (int i = 0; i < MAX_PILHAS; i++) topo[i] = -1;
}

// Empilha comando na pilha indicada
bool empilhar(int pilha, const char* cmd, int status) {
  if (pilha < 0 || pilha >= MAX_PILHAS) return false;
  if (topo[pilha] >= TAM_PILHA - 1) return false;
  topo[pilha]++;
  strncpy(banco[pilha][topo[pilha]].comando, cmd, TAM_CMD);
  banco[pilha][topo[pilha]].status = status;
  return true;
}

// --- TaskScheduler básico ---

#define MAX_TASKS 5

// Tipo do ponteiro para função callback da task
typedef void (*TaskCallback)();

typedef struct {
  TaskCallback callback;
  unsigned long interval;  // intervalo em ms
  unsigned long lastRun;   // último tempo executado
  bool enabled;
} Task;

Task tasks[MAX_TASKS];

// Inicializa o scheduler
void initScheduler() {
  for (int i = 0; i < MAX_TASKS; i++) {
    tasks[i].callback = nullptr;
    tasks[i].interval = 0;
    tasks[i].lastRun = 0;
    tasks[i].enabled = false;
  }
}

// Agenda uma nova task com intervalo em milissegundos
bool scheduleTask(TaskCallback cb, unsigned long interval) {
  for (int i = 0; i < MAX_TASKS; i++) {
    if (!tasks[i].enabled) {
      tasks[i].callback = cb;
      tasks[i].interval = interval;
      tasks[i].lastRun = 0;
      tasks[i].enabled = true;
      return true;
    }
  }
  return false; // não há slot disponível
}

// Executa as tasks agendadas se o intervalo já passou
void runScheduler() {
  unsigned long now = millis();
  for (int i = 0; i < MAX_TASKS; i++) {
    if (tasks[i].enabled && tasks[i].callback != nullptr) {
      if (now - tasks[i].lastRun >= tasks[i].interval) {
        tasks[i].callback();
        tasks[i].lastRun = now;
      }
    }
  }
}

// --- Exemplo de tarefa agendada ---
void tarefaExemplo() {
  Serial.println("Executando tarefa agendada...");
  digitalWrite(32, HIGH);
  delay(100);
  digitalWrite(32, LOW);
}

// --- Handlers HTTP ---

void handleStatus() {
  DynamicJsonDocument doc(128);
  doc["device"] = "Vespa";
  doc["status"] = activated ? "ativo" : "parado";
  doc["sensor"] = analogRead(34);
  doc["server"] = WiFi.localIP().toString();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleCommand() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Bad Request\"}");
    return;
  }

  DynamicJsonDocument doc(256);
  if (deserializeJson(doc, server.arg("plain"))) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String command = doc["command"];
  int statusCmd = 0;

  if (command == "activate") {
    activated = true;
    digitalWrite(32, HIGH);
    statusCmd = 1;
  } 
  else if (command == "deactivate") {
    activated = false;
    digitalWrite(32, LOW);
    statusCmd = 1;
  } 
  else {
    statusCmd = 0;
  }

  empilhar(0, command.c_str(), statusCmd);

  DynamicJsonDocument res(128);
  res["result"] = statusCmd ? "success" : "error";
  res["status"] = activated ? "ativo" : "parado";

  String jsonResponse;
  serializeJson(res, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void handleHistory() {
  DynamicJsonDocument doc(1024);
  for (int i = 0; i < MAX_PILHAS; i++) {
    JsonArray pilhaJson = doc.createNestedArray(String("Comando"));
    for (int j = 0; j <= topo[i]; j++) {
      JsonObject item = pilhaJson.createNestedObject();
      item["cmd"] = banco[i][j].comando;
      item["status"] = banco[i][j].status ? "ACERTO" : "ERRO";
    }
  }
  String jsonResponse;
  serializeJson(doc, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void setup() {
  Serial.begin(115200);
  pinMode(32, OUTPUT);
  digitalWrite(32, LOW);
  inicializar();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print(".");
  }
  Serial.println("\n✅ Wi-Fi conectado!");
  Serial.println(WiFi.localIP());

  server.on("/status", handleStatus);
  server.on("/command", HTTP_POST, handleCommand);
  server.on("/history", handleHistory);
  server.begin();

  initScheduler();
  scheduleTask(tarefaExemplo, 5000); // executa tarefa a cada 5 segundos
}

void loop() {
  server.handleClient();
  runScheduler();
}
