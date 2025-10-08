import { exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Classe para padronizar respostas
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

// Classe principal do firewall
class FirewallInfo {
  static blockedIPs = [];
  static attemptsBlocked = 0;
  static lastUpdate = null;
  static status = "Ativo";

  static routingTable = [];
  static natTable = [];
  static activeConnections = [];
  static vpnStatus = false;

  // Simula tentativas bloqueadas e atualiza logs
  static simulateFailedAttempts() {
    const failed = Math.floor(Math.random() * 4);
    this.attemptsBlocked += failed;
    for (let i = 0; i < failed; i++) {
      const ip = `192.168.1.${Math.floor(Math.random() * 254 + 1)}`;
      if (!this.blockedIPs.includes(ip)) {
        this.blockedIPs.push(ip);
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

  static addRoute(destination, gateway) {
    if (!destination || !gateway) {
      return ApiResponse.error("INVALID_ROUTE", "Destino e Gateway são obrigatórios.");
    }
    this.routingTable.push({ destination, gateway });
    return ApiResponse.success("Rota adicionada.", { routingTable: this.routingTable });
  }

  static addNAT(internalIP, externalIP) {
    if (!internalIP || !externalIP) {
      return ApiResponse.error("INVALID_NAT", "IP interno e externo são obrigatórios.");
    }
    this.natTable.push({ internalIP, externalIP });
    return ApiResponse.success("NAT configurado.", { natTable: this.natTable });
  }

  static setVPN(enable) {
    this.vpnStatus = enable === true;
    return ApiResponse.success(`VPN ${enable ? "ativada" : "desativada"}.`, { vpnStatus: this.vpnStatus });
  }

  static async getConnections() {
    return new Promise((resolve) => {
      const cmd = process.platform === "win32" ? "netstat -ano" : "netstat -tun";
      exec(cmd, (err, stdout) => {
        if (err) {
          return resolve(ApiResponse.error("NETSTAT_ERROR", "Falha ao obter conexões ativas.", { error: err.message }));
        }

        const lines = stdout.split("\n");
        const connections = [];

        if (process.platform === "win32") {
          // Procura linhas que começam com TCP ou UDP
          lines.forEach((line) => {
            if (/^(TCP|UDP)/.test(line.trim())) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5) {
                const protocol = parts[0];
                const src = parts[1];
                const dst = parts[2];
                const status = parts[3] || "";
                const pid = parts[4] || "";
                connections.push({ protocol, src, dst, status, pid });
              }
            }
          });
        } else {
          // Linux/Unix parsing
          lines.slice(2).forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
              const protocol = parts[0];
              const src = parts[3];
              const dst = parts[4];
              const status = parts[5] || "";
              connections.push({ protocol, src, dst, status });
            }
          });
        }

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

  let parsedBody = body;
  if (typeof body === "string") {
    try { parsedBody = JSON.parse(body); } catch { parsedBody = {}; }
  }

  try {
    // GET informações do firewall
    if (method === "GET" && action === "info") {
      return res.status(200).json(FirewallInfo.getInfo());
    }

    // GET IPs bloqueados
    if (method === "GET" && action === "blocked") {
      return res.status(200).json(FirewallInfo.getBlocked());
    }

    // POST block
    if (method === "POST" && action === "block") {
      return res.status(200).json(FirewallInfo.block(parsedBody?.ip));
    }

    // POST unblock
    if (method === "POST" && action === "unblock") {
      return res.status(200).json(FirewallInfo.unblock(parsedBody?.ip));
    }

    // POST NAT
    if (method === "POST" && action === "nat") {
      return res.status(200).json(FirewallInfo.addNAT(parsedBody?.internalIP, parsedBody?.externalIP));
    }

    // POST VPN
    if (method === "POST" && action === "vpn") {
      return res.status(200).json(FirewallInfo.setVPN(parsedBody?.enable));
    }

    // GET conexões
    if (method === "GET" && action === "connections") {
      return res.status(200).json(await FirewallInfo.getConnections());
    }

    // Rotas: GET, POST, DELETE
    if (action === "routes") {
      if (method === "GET") {
        return res.status(200).json({
          success: true,
          routes: FirewallInfo.routingTable,
          rules: FirewallInfo.rules || FirewallInfo.routingTable,
        });
      }

      if (method === "POST") {
        const { destination, gateway } = parsedBody || {};
        if (!destination || !gateway) {
          return res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Destination e gateway são obrigatórios." } });
        }
        const result = FirewallInfo.addRoute(destination, gateway);
        return res.status(200).json(result);
      }

      if (method === "DELETE") {
        const { destination } = parsedBody || {};
        if (!destination) {
          return res.status(400).json({ success: false, error: { code: "INVALID_ROUTE", message: "Destination é obrigatório para remoção." } });
        }
        const index = FirewallInfo.routingTable.findIndex(r => r.destination === destination);
        if (index === -1) {
          return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Rota não encontrada." } });
        }
        FirewallInfo.routingTable.splice(index, 1);
        if (FirewallInfo.rules) {
          FirewallInfo.rules = FirewallInfo.rules.filter(r => r.destination !== destination);
        }
        return res.status(200).json({
          success: true,
          message: `Rota ${destination} removida.`,
          routes: FirewallInfo.routingTable,
          rules: FirewallInfo.rules || FirewallInfo.routingTable,
        });
      }

      return res.status(405).json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: `Método ${method} não permitido para routes.` } });
    }

    // Rota padrão sem action
    if (!action && method === "GET") {
      return res.status(200).json(ApiResponse.success("Bem-vindo! Seu acesso foi permitido pelo firewall.", {
        project: "HIVE PROJECT",
        version: "1.2.0",
        platform: os.platform(),
      }));
    }

    return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json(ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", { message: err.message, stack: err.stack }));
  }
}

// Exporta a classe para uso externo
export { FirewallInfo };
