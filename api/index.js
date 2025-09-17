import os from "os";

class ApiResponse {
  static success(message, data = {}) {
    return { success: true, message, data, timestamp: Date.now() };
  }

  static error(code, error, details = null) {
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
}

class ProjectInfo {
  static get() {
    return ApiResponse.success("Informações do projeto", {
      name: "Seu Projeto",
      version: "1.0.0",
      platform: os.platform(),
      cpuModel: os.cpus()[0].model,
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
          .json(ApiResponse.error("METHOD_NOT_ALLOWED", "Método não permitido. Use GET."));
      }

      return res.status(200).json(ProjectInfo.get());
    } catch (err) {
      console.error("Erro interno:", err);
      return res
        .status(500)
        .json(
          ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", {
            message: err.message,
            stack: err.stack,
          })
        );
    }
  }
}

export default function handler(req, res) {
  IndexApiHandler.handle(req, res);
}