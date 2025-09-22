// HIVE/api/firewall.js
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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
  static blockedIPs = [];
  static attemptsBlocked = 0;
  static lastUpdate = null;
  static status = "Ativo";

  // Simulação de tentativas de acesso falhas
  static simulateFailedAttempts() {
    // Gerar entre 0 e 3 tentativas por chamada
    const failed = Math.floor(Math.random() * 4);
    this.attemptsBlocked += failed;
    if (failed > 0) {
      // Gerar IPs falsos para bloqueio dinâmico
      for (let i = 0; i < failed; i++) {
        const ip = `192.168.1.${Math.floor(Math.random() * 254 + 1)}`;
        if (!this.blockedIPs.includes(ip)) {
          this.blockedIPs.push(ip);
        }
      }
    }
    this.lastUpdate = new Date().toISOString();
    this.saveBlockedToLogs();
  }

  static loadBlockedFromLogs() {
    try {
      const logPath = path.join(process.cwd(), "firewall.log");
      if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
        this.blockedIPs = [...new Set(logs)];
        this.attemptsBlocked = this.blockedIPs.length;
        this.lastUpdate = new Date().toISOString();
      }
    } catch (err) {
      console.error("Erro ao ler firewall.log:", err);
    }
  }

  static saveBlockedToLogs() {
    try {
      const logPath = path.join(process.cwd(), "firewall.log");
      fs.writeFileSync(logPath, this.blockedIPs.join("\n"));
    } catch (err) {
      console.error("Erro ao salvar firewall.log:", err);
    }
  }

  static getInfo() {
    this.loadBlockedFromLogs();
    this.simulateFailedAttempts(); // atualiza tentativas falhas dinamicamente
    return ApiResponse.success("Informações do firewall", {
      status: this.status,
      ultimaAtualizacao: this.lastUpdate,
      tentativasBloqueadas: this.attemptsBlocked,
      regrasAplicadas: this.blockedIPs.length,
      blocked: this.blockedIPs,
      system: {
        platform: os.platform(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        uptime: os.uptime(),
      },
    });
  }

  static getBlocked() {
    this.loadBlockedFromLogs();
    return ApiResponse.success("IPs bloqueados", { blocked: this.blockedIPs });
  }

  static block(ip) {
    if (!ip) {
      return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    }
    if (!this.blockedIPs.includes(ip)) {
      this.blockedIPs.push(ip);
      this.attemptsBlocked++;
      this.lastUpdate = new Date().toISOString();
      this.saveBlockedToLogs();
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
      this.lastUpdate = new Date().toISOString();
      this.saveBlockedToLogs();
      return ApiResponse.success(`IP ${ip} desbloqueado.`, { blocked: this.blockedIPs });
    }
    return ApiResponse.error("NOT_FOUND", "IP não encontrado na lista de bloqueio.");
  }
}

export default function handler(req, res) {
  const { method, query, body } = req;
  const { action } = query;

  try {
    if (method === "GET" && action === "blocked") {
      return res.status(200).json(FirewallInfo.getBlocked());
    }
    if (method === "GET" && action === "info") {
      return res.status(200).json(FirewallInfo.getInfo());
    }
    if (method === "POST" && action === "block") {
      return res.status(200).json(FirewallInfo.block(body?.ip));
    }
    if (method === "POST" && action === "unblock") {
      return res.status(200).json(FirewallInfo.unblock(body?.ip));
    }

    if (method === "GET" && !action) {
      return res.status(200).json(
        ApiResponse.success("Bem-vindo! Seu acesso foi permitido pelo firewall.", {
          project: "HIVE PROJECT",
          version: "1.2.0",
          platform: os.platform(),
        })
      );
    }

    return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json(ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", { message: err.message, stack: err.stack }));
  }
}