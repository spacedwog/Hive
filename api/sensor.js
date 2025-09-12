import os from "os";

// --- Funções utilitárias ---
function logRequest(req) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
}

function successResponse(message, data = {}) {
  return { success: true, message, data, timestamp: Date.now() };
}

function errorResponse(code, error, details = null) {
  return { success: false, error: { code, message: error, details }, timestamp: Date.now() };
}

// --- Funções de anomalia do servidor ---
function detectServerAnomaly(memoryUsedMB, memoryTotalMB, loadAverage) {
  const memThreshold = 0.8;
  const memRatio = memoryUsedMB / memoryTotalMB;

  if (memRatio > memThreshold) {
    return { detected: true, message: "Uso de memória acima do limite", current_value: Math.round(memRatio * 100) };
  }

  if (loadAverage > 1.0) {
    return { detected: true, message: "Carga da CPU alta", current_value: Math.round(loadAverage * 100) };
  }

  return { detected: false, message: "Normal", current_value: 0 };
}

// --- Informações do servidor ---
function getServerInfo() {
  const memoryUsedMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const memoryTotalMB = Math.round(os.totalmem() / 1024 / 1024);
  const loadAverage = os.loadavg()[0];

  return {
    currentTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memory: { 
      usedMB: memoryUsedMB, 
      totalMB: memoryTotalMB, 
      freeMB: Math.round(os.freemem() / 1024 / 1024) 
    },
    platform: os.platform(),
    cpuModel: os.cpus()[0].model,
    loadAverage: loadAverage.toFixed(2),
    anomaly: detectServerAnomaly(memoryUsedMB, memoryTotalMB, loadAverage),
  };
}

// --- Dados do sensor ESP32/NodeMCU ---
function getSensorData(body = null) {
  const sensor_db = body && body.sensor_db != null ? body.sensor_db : Math.random() * 100;
  const anomalyDetected = sensor_db > 80;

  return {
    device: body && body.device ? body.device : "ESP32 NODE",
    server_ip: body && body.server_ip ? body.server_ip : "192.168.4.1",
    sta_ip: body && body.sta_ip ? body.sta_ip : "192.168.0.101",
    sensor_raw: body && body.sensor_raw != null ? body.sensor_raw : Math.floor(Math.random() * 500),
    sensor_db,
    status: body && body.status ? body.status : "online",
    anomaly: {
      detected: anomalyDetected,
      message: anomalyDetected ? "Ruído alto detectado" : "",
      current_value: sensor_db,
    },
  };
}

// --- Handler principal ---
export default async function handler(req, res) {
  logRequest(req);
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method === "GET") {
      const info = req.query.info || "sensor";

      if (info === "sensor") 
        return res.status(200).json(successResponse("Dados do sensor", getSensorData()));

      if (info === "server") 
        return res.status(200).json(successResponse("Dados do servidor", getServerInfo()));

      return res.status(400).json(errorResponse("INVALID_PARAM", `Valor inválido para 'info': ${info}`));
    }

    if (req.method === "POST") {
      const data = req.body || {};
      const sensorData = getSensorData(data);

      return res.status(200).json(successResponse("Sensor atualizado", sensorData));
    }

    return res.status(405).json(errorResponse("METHOD_NOT_ALLOWED", "Use GET ou POST neste endpoint."));
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json(
      errorResponse("INTERNAL_ERROR", "Erro interno no servidor", { message: err.message, stack: err.stack })
    );
  }
}