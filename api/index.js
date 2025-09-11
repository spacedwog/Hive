// --- API Vercel: /api/index.js ---
// Projeto: HIVE
// Função: Explicar o projeto HIVE e fornecer informações gerais

import os from "os";

// --- Funções utilitárias ---
function logRequest(req) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
}

function successResponse(message, data = {}) {
  return { success: true, message, data, timestamp: Date.now() };
}

function errorResponse(code, error, details = null) {
  return {
    success: false,
    error: {
      code,
      message: error,
      details,
    },
    timestamp: Date.now(),
  };
}

// --- Informações do projeto HIVE ---
function getProjectInfo() {
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

  return successResponse("Informações do projeto HIVE", {
    projectName: "HIVE",
    description:
      "HIVE é um projeto de monitoramento e controle de dispositivos IoT, " +
      "integrando ESP32, NodeMCU e sistemas web para visualização de status, controle de LEDs, câmeras e dados em tempo real.",
    functionalities: [
      "Controle de LEDs e periféricos do ESP32",
      "Visualização de câmera MJPEG e nativa",
      "Integração com Vercel e APIs REST",
      "Monitoramento de status do dispositivo e memória",
      "Compatível com modo Soft-AP e STA",
    ],
    contact: {
      author: "Felipe Santos",
      email: "felipe@example.com",
      github: "https://github.com/yourusername",
    },
    currentTime: formattedDate,
    server: {
      platform: os.platform(),
      cpuModel: os.cpus()[0].model,
      memoryMB: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
      },
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
}

// --- Handler principal ---
export default function handler(req, res) {
  logRequest(req);

  // Força JSON sempre
  res.setHeader("Content-Type", "application/json");

  try {
    // --- Verifica método ---
    if (req.method !== "GET") {
      return res
        .status(405)
        .json(errorResponse("METHOD_NOT_ALLOWED", "Método não permitido. Use GET."));
    }

    // --- Parâmetro "info" ---
    const info = req.query.info || "project"; // padrão project se não informado

    if (info === "project") {
      return res.status(200).json(getProjectInfo());
    }

    // Valor inválido
    return res
      .status(400)
      .json(
        errorResponse("INVALID_PARAM", `Valor inválido para 'info': ${info}`, {
          acceptedValues: ["project"],
        })
      );
  } catch (err) {
    console.error("Erro interno:", err);
    return res
      .status(500)
      .json(
        errorResponse("INTERNAL_ERROR", "Erro interno no servidor.", {
          message: err.message,
          stack: err.stack,
        })
      );
  }
}