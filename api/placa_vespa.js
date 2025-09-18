let lastSensorData = null;

class SensorApiHandler {

  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static async handle(req, res) {
    SensorApiHandler.logRequest(req);

    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method === "GET") {
        if (lastSensorData) {
          return res.status(200).json({
            success: true,
            message: "Dados da placa ESP32(VESPA):",
            data: {
              ip: lastSensorData.server,
              sensor: lastSensorData.sensor,
              temperature: lastSensorData.temperatura_C,
              humidity: lastSensorData.umidade_pct,
              presenca: lastSensorData.presenca,
              distancia: lastSensorData.distancia,
              server: lastSensorData.server,
            },
            timestamp: lastSensorData.timestamp || Date.now(),
          });
        }
        // Exemplo de resposta simulada de sensor
        return res.status(200).json({
          success: true,
          message: "Nenhum dado recebido ainda. Dados simulados:",
          data: {
            temperature: 22.5,
            humidity: 60,
          },
          timestamp: Date.now(),
        });
      }

      if (req.method === "POST") {
        const { server, sensor, temperatura_C, umidade_pct, presenca, distancia, timestamp } = req.body || {};

        // Salva os dados recebidos em memória
        lastSensorData = {
          server,
          sensor,
          temperatura_C,
          umidade_pct,
          presenca,
          distancia,
          timestamp: timestamp || Date.now(),
        };

        return res.status(201).json({
          success: true,
          message: "Dados do sensor recebidos com sucesso.",
          data: lastSensorData,
        });
      }

      return res
        .status(405)
        .json({ success: false, error: "Método não permitido. Use GET ou POST." });
    } catch (err) {
      console.error("Erro interno:", err);
      return res
        .status(500)
        .json({
          success: false,
          error: "Erro interno no servidor.",
          details: {
            message: err.message,
            stack: err.stack,
          },
        });
    }
  }
}

export default async function handler(req, res) {
  await SensorApiHandler.handle(req, res);
}