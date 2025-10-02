const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// -------------------------
// Classe para padronizar respostas
// -------------------------
class ApiResponse {
  static success(message, data = {}) {
    return { success: true, message, data, timestamp: Date.now() };
  }

  static error(code, message, details = null) {
    return { success: false, error: { code, message, details }, timestamp: Date.now() };
  }
}

// -------------------------
// Classe principal do firewall
// -------------------------
class FirewallInfo {
  static blockedHistory = [];
  static routingTable = [];
  static natTable = [];
  static activeConnections = [];
  static vpnStatus = false;
  static status = "Ativo";
  static lastUpdate = null;

  static logFilePath = path.join(process.cwd(), "firewall.log");
  static saveTimeout = null;

  // -------------------------
  // Histórico de bloqueios
  // -------------------------
  static loadBlockedFromLogs() {
    try {
      if (!fs.existsSync(this.logFilePath)) return;
      const raw = fs.readFileSync(this.logFilePath, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      this.blockedHistory = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (err) {
      console.error("Erro ao carregar firewall.log:", err);
    }
  }

  static scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveBlockedToLogs(), 300);
  }

  static saveBlockedToLogs() {
    try {
      const data = this.blockedHistory.map(e => JSON.stringify(e)).join("\n");
      fs.writeFileSync(this.logFilePath, data);
    } catch (err) {
      console.error("Erro ao salvar firewall.log:", err);
    }
  }

  static block(ip, reason = "Automático") {
    if (!ip) return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    if (!this.blockedHistory.find(b => b.ip === ip)) {
      const entry = { ip, reason, timestamp: new Date().toISOString() };
      this.blockedHistory.push(entry);
      this.lastUpdate = entry.timestamp;
      this.scheduleSave();
    }
    return ApiResponse.success(`IP ${ip} bloqueado.`, { blockedHistory: this.blockedHistory });
  }

  static unblock(ip) {
    if (!ip) return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    const index = this.blockedHistory.findIndex(b => b.ip === ip);
    if (index !== -1) {
      this.blockedHistory.splice(index, 1);
      this.lastUpdate = new Date().toISOString();
      this.scheduleSave();
      return ApiResponse.success(`IP ${ip} desbloqueado.`, { blockedHistory: this.blockedHistory });
    }
    return ApiResponse.error("NOT_FOUND", "IP não encontrado na lista de bloqueio.");
  }

  static getBlocked() {
    this.loadBlockedFromLogs();
    return ApiResponse.success("IPs bloqueados", { blockedHistory: this.blockedHistory });
  }

  // -------------------------
  // Firewall Info
  // -------------------------
  static getInfo() {
    this.loadBlockedFromLogs();
    this.lastUpdate = new Date().toISOString();
    return ApiResponse.success("Informações do firewall", {
      status: this.status,
      ultimaAtualizacao: this.lastUpdate,
      tentativasBloqueadas: this.blockedHistory.length,
      regrasAplicadas: this.routingTable.length,
      blockedHistory: this.blockedHistory,
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

  // -------------------------
  // Rotas e NAT
  // -------------------------
  static addRoute(destination, gateway) {
    if (!destination || !gateway) return ApiResponse.error("INVALID_ROUTE", "Destino e Gateway são obrigatórios.");
    this.routingTable.push({ destination, gateway });
    return ApiResponse.success("Rota adicionada.", { routingTable: this.routingTable });
  }

  static addNAT(internalIP, externalIP) {
    if (!internalIP || !externalIP) return ApiResponse.error("INVALID_NAT", "IP interno e externo são obrigatórios.");
    this.natTable.push({ internalIP, externalIP });
    return ApiResponse.success("NAT configurado.", { natTable: this.natTable });
  }

  static setVPN(enable) {
    this.vpnStatus = enable === true;
    return ApiResponse.success(`VPN ${enable ? "ativada" : "desativada"}.`, { vpnStatus: this.vpnStatus });
  }

  // -------------------------
  // Conexões ativas
  // -------------------------
  static getConnections() {
    return new Promise((resolve) => {
      const cmd = process.platform === "win32" ? "netstat -n -p tcp" : "netstat -tun";
      exec(cmd, (err, stdout) => {
        if (err) return resolve(ApiResponse.error("NETSTAT_ERROR", "Falha ao obter conexões ativas.", { error: err.message }));

        const lines = stdout.split("\n").slice(4);
        const connections = [];

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 4) return;
          let protocol, src, dst, status;

          if (process.platform === "win32") {
            protocol = parts[0].toUpperCase();
            src = parts[1];
            dst = parts[2];
            status = parts[3] || "";
          } else {
            protocol = parts[0].toUpperCase();
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
async function handler(req, res) {
  const { method, query, body } = req;
  const { action } = query;

  let parsedBody = body;
  if (typeof body === "string") {
    try { parsedBody = JSON.parse(body); } catch { parsedBody = {}; }
  }

  try {
    if (method === "GET" && action === "info") return res.status(200).json(FirewallInfo.getInfo());
    if (method === "GET" && action === "blocked") return res.status(200).json(FirewallInfo.getBlocked());
    if (method === "POST" && action === "block") return res.status(200).json(FirewallInfo.block(parsedBody?.ip, parsedBody?.reason));
    if (method === "POST" && action === "unblock") return res.status(200).json(FirewallInfo.unblock(parsedBody?.ip));
    if (method === "POST" && action === "nat") return res.status(200).json(FirewallInfo.addNAT(parsedBody?.internalIP, parsedBody?.externalIP));
    if (method === "POST" && action === "vpn") return res.status(200).json(FirewallInfo.setVPN(parsedBody?.enable));
    if (method === "GET" && action === "connections") return res.status(200).json(await FirewallInfo.getConnections());

    if (action === "routes") {
      if (method === "GET") return res.status(200).json({ success: true, routes: FirewallInfo.routingTable });
      if (method === "POST") return res.status(200).json(FirewallInfo.addRoute(parsedBody?.destination, parsedBody?.gateway));
      if (method === "DELETE") {
        const { destination } = parsedBody || {};
        if (!destination) return res.status(400).json(ApiResponse.error("INVALID_ROUTE", "Destination obrigatório."));
        const idx = FirewallInfo.routingTable.findIndex(r => r.destination === destination);
        if (idx === -1) return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
        FirewallInfo.routingTable.splice(idx, 1);
        return res.status(200).json(ApiResponse.success(`Rota ${destination} removida.`, { routes: FirewallInfo.routingTable }));
      }
    }

    if (!action && method === "GET") return res.status(200).json(ApiResponse.success("Bem-vindo!", { project: "HIVE PROJECT", version: "1.2.0" }));

    return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json(ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", { message: err.message, stack: err.stack }));
  }
}

// -------------------------
// Exporta
// -------------------------
module.exports = { handler, FirewallInfo };