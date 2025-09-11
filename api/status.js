import os from "os";

// --- Funções utilitárias ---
function logRequest(req) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
}

function successResponse(message, data = {}) {
  return { success: true, message, data, timestamp: Date.now() };
}

function errorResponse(error) {
  return { success: false, error, timestamp: Date.now() };
}

// --- Informações do servidor ---
function getServerInfo() {
  return successResponse("Informações do servidor", {
    currentTime: new Date().toLocaleString(),
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

  if (req.method === "GET" && req.query.info === "server") {
    return res.status(200).json(getServerInfo());
  }

  return res.status(405).json(errorResponse("Método não permitido"));
}