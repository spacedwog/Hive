// --- API Vercel: /api/index.js ---
// Projeto: HIVE
// Função: Explicar o projeto HIVE e fornecer informações gerais

import os from "os";

class ApiResponse {
  static success(message, data = {}) {
    return {
      success: true,
      message: message,
      data: data,
      timestamp: Date.now()
    };
  }

  static error(code, error, details = null) {
    return {
      success: false,
      error: {
        code: code,
        message: error,
        details: details
      },
      timestamp: Date.now()
    };
  }
}

class ProjectInfo {
  static get() {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
      2,
      "0"
    )}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(
      2,
      "0"
    )}`;

    return ApiResponse.success("Informações do projeto HIVE", {
      projectName: "HIVE",
      description:
        "HIVE é um projeto de monitoramento e controle de dispositivos IoT, " +
        "integrando ESP32, NodeMCU e sistemas web para visualização de status, controle de LEDs, câmeras e dados em tempo real.",
      functionalities: [
        "Controle de LEDs e periféricos do ESP32",
        "Visualização de câmera MJPEG e nativa",
        "Integração com Vercel e APIs REST",
        "Monitoramento de status do dispositivo e memória",
        "Compatível com modo Soft-AP e STA"
      ],
      contact: {
        author: "Felipe Santos",
        email: "felipersantos1988@gmail.com",
        github: "https://github.com/spacedwog"
      },
      currentTime: formattedDate,
      server: {
        platform: os.platform(),
        cpuModel: os.cpus()[0].model,
        memoryMB: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024)
        },
        uptimeSeconds: Math.floor(process.uptime())
      }
    });
  }
}

class IndexApiHandler {
  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static handle(req, res) {
    IndexApiHandler.logRequest(req);

    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method !== "GET") {
        return res
          .status(405)
          .json(
            ApiResponse.error(
              "METHOD_NOT_ALLOWED",
              "Método não permitido. Use GET."
            )
          );
      }

      const info = req.query.info || "project";

      if (info === "project") {
        return res.status(200).json(ProjectInfo.get());
      }

      return res
        .status(400)
        .json(
          ApiResponse.error(
            "INVALID_PARAM",
            `Valor inválido para 'info': ${info}`,
            { acceptedValues: ["project"] }
          )
        );
    } catch (err) {
      console.error("Erro interno:", err);
      return res
        .status(500)
        .json(
          ApiResponse.error(
            "INTERNAL_ERROR",
            "Erro interno no servidor.",
            { message: err.message, stack: err.stack }
          )
        );
    }
  }
}

export default function handler(req, res) {
  IndexApiHandler.handle(req, res);
}