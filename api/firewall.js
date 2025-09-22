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

class FirewallInfo {
  static blockedIPs = ["192.168.1.100", "10.0.0.5"];

  static getBlocked() {
    return ApiResponse.success("IPs bloqueados", { blocked: this.blockedIPs });
  }

  static block(ip) {
    if (!ip) {
      return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    }
    if (!this.blockedIPs.includes(ip)) {
      this.blockedIPs.push(ip);
    }
    return ApiResponse.success(`IP ${ip} bloqueado.`, { blocked: this.blockedIPs });
  }

  static unblock(ip) {
    if (!ip) {
      return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    }
    const index = this.blockedIPs.indexOf(ip);
    if (index !== -1) {
      this.blockedIPs.splice(index, 1);
      return ApiResponse.success(`IP ${ip} desbloqueado.`, {
        blocked: this.blockedIPs,
      });
    }
    return ApiResponse.error("NOT_FOUND", "IP não encontrado na lista de bloqueio.");
  }
}

class FirewallApiHandler {
  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static handle(req, res) {
    FirewallApiHandler.logRequest(req);
    res.setHeader("Content-Type", "application/json");

    try {
      const { method, url, body } = req;

      if (url === "/blocked" && method === "GET") {
        return res.status(200).json(FirewallInfo.getBlocked());
      }

      if (url === "/block" && method === "POST") {
        return res.status(200).json(FirewallInfo.block(body?.ip));
      }

      if (url === "/unblock" && method === "POST") {
        return res.status(200).json(FirewallInfo.unblock(body?.ip));
      }

      if (url === "/" && method === "GET") {
        return res.status(200).json(
          ApiResponse.success("Bem-vindo! Seu acesso foi permitido pelo firewall.", {
            project: "HIVE PROJECT",
            version: "1.0.0",
            platform: os.platform(),
          })
        );
      }

      return res
        .status(404)
        .json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
    } catch (err) {
      console.error("Erro interno:", err);
      return res.status(500).json(
        ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", {
          message: err.message,
          stack: err.stack,
        })
      );
    }
  }
}

export default function handler(req, res) {
  FirewallApiHandler.handle(req, res);
}