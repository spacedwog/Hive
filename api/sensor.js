class SensorApiHandler {
  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static async handle(req, res) {
    SensorApiHandler.logRequest(req);

    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method === "GET") {
        // Exemplo de resposta simulada de sensor
        return res.status(200).json({
          success: true,
          message: "Dados do sensor",
          data: {
            temperature: 22.5,
            humidity: 60,
          },
          timestamp: Date.now(),
        });
      }

      if (req.method === "POST") {
        const { server, temperatura_C, timestamp } = req.body || {};

        // Aqui você pode salvar os dados em um banco, arquivo, etc, se desejar

        return res.status(201).json({
          success: true,
          message: "Dados do sensor recebidos com sucesso.",
          data: {
            server,
            temperatura_C,
            timestamp,
          },
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