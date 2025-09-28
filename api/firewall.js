import { exec } from "child_process";
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
      error: { code, message: error, details },
      timestamp: Date.now(),
    };
  }
}

class FirewallInfo {
  static blockedIPs = [];
  static attemptsBlocked = 0;
  static lastUpdate = null;
  static status = "Ativo";

  static routingTable = [];
  static natTable = [];
  static activeConnections = [];
  static vpnStatus = false;

  // -------------------------
  // Logs e IPs bloqueados
  // -------------------------
  static simulateFailedAttempts() {
    const failed = Math.floor(Math.random() * 4);
    this.attemptsBlocked += failed;
    if (failed > 0) {
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

  // -------------------------
  // Bloqueio e desbloqueio
  // -------------------------
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

  // -------------------------
  // Informações gerais
  // -------------------------
  static getInfo() {
    this.loadBlockedFromLogs();
    this.simulateFailedAttempts();
    return ApiResponse.success("Informações do firewall", {
      status: this.status,
      ultimaAtualizacao: this.lastUpdate,
      tentativasBloqueadas: this.attemptsBlocked,
      regrasAplicadas: this.blockedIPs.length,
      blocked: this.blockedIPs,
      routingTable: this.routingTable,
      natTable: this.natTable,
      vpnStatus: this.vpnStatus,
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

  // -------------------------
  // Routing
  // -------------------------
  static addRoute(destination, gateway) {
    if (!destination || !gateway) {
      return ApiResponse.error("INVALID_ROUTE", "Destino e Gateway são obrigatórios.");
    }
    this.routingTable.push({ destination, gateway });
    return ApiResponse.success("Rota adicionada.", { routingTable: this.routingTable });
  }

  // -------------------------
  // NAT
  // -------------------------
  static addNAT(internalIP, externalIP) {
    if (!internalIP || !externalIP) {
      return ApiResponse.error("INVALID_NAT", "IP interno e externo são obrigatórios.");
    }
    this.natTable.push({ internalIP, externalIP });
    return ApiResponse.success("NAT configurado.", { natTable: this.natTable });
  }

  // -------------------------
  // VPN
  // -------------------------
  static setVPN(enable) {
    this.vpnStatus = enable === true;
    return ApiResponse.success(`VPN ${enable ? "ativada" : "desativada"}.`, { vpnStatus: this.vpnStatus });
  }

  // -------------------------
  // Conexões ativas (reais)
  // -------------------------
  static async getConnections() {
    return new Promise((resolve) => {
      const cmd = process.platform === "win32" ? "netstat -n -p tcp" : "netstat -tun";
      exec(cmd, (err, stdout) => {
        if (err) {
          return resolve(ApiResponse.error("NETSTAT_ERROR", "Falha ao obter conexões ativas.", { error: err.message }));
        }

        const lines = stdout.split("\n").slice(4); // Ignora cabeçalho
        const connections = [];

        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 4) {
            return;
          }

          let protocol = parts[0].toUpperCase();
          let src, dst, status;

          if (process.platform === "win32") {
            src = parts[1];
            dst = parts[2];
            status = parts[3] || "";
          } else {
            src = parts[3];
            dst = parts[4];
            status = parts[5] || "";
          }

          connections.push({ protocol, src, dst, status });
        });

        this.activeConnections = connections;
        resolve(ApiResponse.success("Conexões ativas", { activeConnections: connections }));
      });
    });
  }
}

// -------------------------
// Handler principal
// -------------------------
export default async function handler(req, res) {
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
    if (method === "POST" && action === "route") {
      return res.status(200).json(FirewallInfo.addRoute(body?.destination, body?.gateway));
    }
    if (method === "POST" && action === "nat") {
      return res.status(200).json(FirewallInfo.addNAT(body?.internalIP, body?.externalIP));
    }
    if (method === "POST" && action === "vpn") {
      return res.status(200).json(FirewallInfo.setVPN(body?.enable));
    }
    if (method === "GET" && action === "connections") {
      return res.status(200).json(await FirewallInfo.getConnections());
    }
    if (method === "GET" && !action) {
      return res.status(200).json(ApiResponse.success("Bem-vindo! Seu acesso foi permitido pelo firewall.", { project: "HIVE PROJECT", version: "1.2.0", platform: os.platform() }));
    }

    return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json(ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", { message: err.message, stack: err.stack }));
  }
}