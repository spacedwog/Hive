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

// --- Informações do servidor ---
function getServerInfo() {
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

  return successResponse("Informações do servidor", {
    currentTime: formattedDate,
    uptime: `${Math.floor(process.uptime())} segundos`,
    memory: {
      usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      totalMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMB: Math.round(os.freemem() / 1024 / 1024),
    },
    platform: os.platform(),
    cpuModel: os.cpus()[0].model,
  });
}

// --- Handler principal ---
export default function handler(req, res) {
  logRequest(req);

  // Força JSON sempre
  res.setHeader("Content-Type", "application/json");

  try {
    // Verifica método
    if (req.method !== "GET") {
      return res
        .status(405)
        .json(errorResponse("METHOD_NOT_ALLOWED", "Método não permitido. Use GET."));
    }

    // Verifica query
    if (!req.query.info) {
      return res
        .status(400)
        .json(errorResponse("MISSING_PARAM", "Parâmetro 'info' ausente na URL."));
    }

    if (req.query.info === "server") {
      return res.status(200).json(getServerInfo());
    }

    // Valor inválido de "info"
    return res
      .status(400)
      .json(
        errorResponse("INVALID_PARAM", `Valor inválido para 'info': ${req.query.info}`, {
          acceptedValues: ["server"],
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