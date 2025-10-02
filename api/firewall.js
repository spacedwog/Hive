// -------------------------
// Respostas padronizadas
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
// Firewall "stateless"
// -------------------------
class FirewallInfo {
  static blockedHistory = [];
  static routingTable = [];
  static natTable = [];
  static vpnStatus = false;
  static status = "Ativo";
  static lastUpdate = null;

  static block(ip, reason = "Automático") {
    if (!ip) return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    if (!this.blockedHistory.find(b => b.ip === ip)) {
      const entry = { ip, reason, timestamp: new Date().toISOString() };
      this.blockedHistory.push(entry);
      this.lastUpdate = entry.timestamp;
    }
    return ApiResponse.success(`IP ${ip} bloqueado.`, { blockedHistory: this.blockedHistory });
  }

  static unblock(ip) {
    const index = this.blockedHistory.findIndex(b => b.ip === ip);
    if (index !== -1) {
      this.blockedHistory.splice(index, 1);
      this.lastUpdate = new Date().toISOString();
      return ApiResponse.success(`IP ${ip} desbloqueado.`, { blockedHistory: this.blockedHistory });
    }
    return ApiResponse.error("NOT_FOUND", "IP não encontrado na lista de bloqueio.");
  }

  static getBlocked() {
    return ApiResponse.success("IPs bloqueados", { blockedHistory: this.blockedHistory });
  }

  static getInfo() {
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
        platform: "serverless",
        hostname: "vercel",
      },
    });
  }

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
}

// -------------------------
// Handler Serverless
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

    if (!action && method === "GET") return res.status(200).json(ApiResponse.success("Bem-vindo!", { project: "HIVE PROJECT", version: "1.2.0" }));

    return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
  } catch (err) {
    return res.status(500).json(ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", { message: err.message }));
  }
}

module.exports = { handler, FirewallInfo };