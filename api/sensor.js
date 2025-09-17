import os from "os";

class ApiResponse {
  static success(message, data = {}) {
    return { success: true, message, data, timestamp: Date.now() };
  }

  static error(code, error, details = null) {
    return { success: false, error: { code, message: error, details }, timestamp: Date.now() };
  }
}

class ServerAnomaly {
  static detect(memoryUsedMB, memoryTotalMB, loadAverage) {
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
}

class ServerInfo {
  static get() {
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
      anomaly: ServerAnomaly.detect(memoryUsedMB, memoryTotalMB, loadAverage),
    };
  }
}

class SensorData {
  static get(body = null) {
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
}

class SensorApiHandler {
  static lastSensorData = null;

  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static async handle(req, res) {
    SensorApiHandler.logRequest(req);
    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method === "GET") {
        const info = req.query.info || "sensor";

        if (info === "sensor") {
          const data = SensorApiHandler.lastSensorData || SensorData.get();
          return res.status(200).json(ApiResponse.success("Dados do sensor", data));
        }

        if (info === "server") {
          return res.status(200).json(ApiResponse.success("Dados do servidor", ServerInfo.get()));
        }

        return res.status(400).json(ApiResponse.error("INVALID_PARAM", `Valor inválido para 'info': ${info}`));
      }

      if (req.method === "POST") {
        const data = req.body || {};
        const sensorData = SensorData.get(data);

        SensorApiHandler.lastSensorData = sensorData;

        return res.status(200).json(ApiResponse.success("Sensor atualizado", sensorData));
      }

      return res.status(405).json(ApiResponse.error("METHOD_NOT_ALLOWED", "Use GET ou POST neste endpoint."));
    } catch (err) {
      console.error("Erro interno:", err);
      return res.status(500).json(
        ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor", { message: err.message, stack: err.stack })
      );
    }
  }
}

export default async function handler(req, res) {
  await SensorApiHandler.handle(req, res);
}