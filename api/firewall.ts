import { exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// -------------------------
// Resposta da API
// -------------------------
class ApiResponse {
  static success(message: string, data: any = {}) {
    return { success: true, message, data, timestamp: Date.now() };
  }

  static error(code: string, message: string, details: any = null) {
    return { success: false, error: { code, message, details }, timestamp: Date.now() };
  }
}

// -------------------------
// Classe Firewall
// -------------------------
class Firewall {
  static blockedIPs: string[] = [];
  static routingTable: any[] = [];
  static natTable: any[] = [];
  static vpnStatus: boolean = false;
  static lastUpdate: string | null = null;
  static attemptsBlocked: number = 0;
  static status: string = "Ativo";
  static logFile = path.join(process.cwd(), "firewall.log");

  // -------------------------
  // Carregar e salvar IPs bloqueados
  // -------------------------
  static loadBlocked() {
    try {
      if (fs.existsSync(this.logFile)) {
        const lines = fs.readFileSync(this.logFile, "utf-8").split("\n").filter(Boolean);
        this.blockedIPs = Array.from(new Set(lines));
        this.attemptsBlocked = this.blockedIPs.length;
      }
    } catch (err) {
      console.error("Erro ao ler firewall.log:", err);
    }
  }

  static saveBlocked() {
    try {
      fs.writeFileSync(this.logFile, this.blockedIPs.join("\n"));
    } catch (err) {
      console.error("Erro ao salvar firewall.log:", err);
    }
  }

  // -------------------------
  // Bloquear / desbloquear IP
  // -------------------------
  static block(ip: string) {
// sourcery skip: use-braces
    if (!ip) return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    if (!this.blockedIPs.includes(ip)) {
      this.blockedIPs.push(ip);
      this.attemptsBlocked++;
      this.lastUpdate = new Date().toISOString();
      this.saveBlocked();
    }
    return ApiResponse.success(`IP ${ip} bloqueado.`, { blocked: this.blockedIPs });
  }

  static unblock(ip: string) {
// sourcery skip: use-braces
    if (!ip) return ApiResponse.error("INVALID_IP", "IP é obrigatório.");
    const idx = this.blockedIPs.indexOf(ip);
    if (idx !== -1) {
      this.blockedIPs.splice(idx, 1);
      this.lastUpdate = new Date().toISOString();
      this.saveBlocked();
      return ApiResponse.success(`IP ${ip} desbloqueado.`, { blocked: this.blockedIPs });
    }
    return ApiResponse.error("NOT_FOUND", "IP não encontrado na lista de bloqueio.");
  }

  // -------------------------
  // Adicionar rota
  // -------------------------
  static addRoute(destination: string, gateway: string) {
// sourcery skip: use-braces
    if (!destination || !gateway) return ApiResponse.error("INVALID_ROUTE", "Destino e Gateway são obrigatórios.");
    this.routingTable.push({ destination, gateway });
    return ApiResponse.success("Rota adicionada.", { routingTable: this.routingTable });
  }

  // -------------------------
  // Adicionar NAT
  // -------------------------
  static addNAT(internalIP: string, externalIP: string) {
// sourcery skip: use-braces
    if (!internalIP || !externalIP) return ApiResponse.error("INVALID_NAT", "IP interno e externo são obrigatórios.");
    this.natTable.push({ internalIP, externalIP });
    return ApiResponse.success("NAT configurado.", { natTable: this.natTable });
  }

  // -------------------------
  // Ativar / desativar VPN
  // -------------------------
  static setVPN(enable: boolean) {
    this.vpnStatus = enable === true;
    return ApiResponse.success(`VPN ${enable ? "ativada" : "desativada"}.`, { vpnStatus: this.vpnStatus });
  }

  // -------------------------
  // Obter conexões ativas
  // -------------------------
  static async getConnections() {
    return new Promise((resolve) => {
      const cmd = process.platform === "win32" ? "netstat -n -p tcp" : "netstat -tun";
      exec(cmd, (err, stdout) => {
        // sourcery skip: use-braces
        if (err) return resolve(ApiResponse.error("NETSTAT_ERROR", "Falha ao obter conexões ativas.", { error: err.message }));

        const lines = stdout.split("\n").slice(4);
        const connections: any[] = [];

        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 4) return;

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

        resolve(ApiResponse.success("Conexões ativas", { activeConnections: connections }));
      });
    });
  }

  // -------------------------
  // Obter informações do firewall como array key/value
  // -------------------------
  static getInfo() {
    this.loadBlocked();
    this.lastUpdate = new Date().toISOString();

    const data = {
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
    };

    const keyValueArray: { key: string; value: any }[] = [];

    // sourcery skip: avoid-function-declarations-in-blocks
    function flatten(obj: any, prefix = "") {
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const value = obj[k];
          const keyPath = prefix ? `${prefix}.${k}` : k;
          if (Array.isArray(value)) {
            value.forEach((v, idx) => keyValueArray.push({ key: keyPath, value: v }));
          } else if (value && typeof value === "object") {
            flatten(value, keyPath);
          } else {
            keyValueArray.push({ key: keyPath, value });
          }
        }
      }
    }

    flatten(data);

    return ApiResponse.success("Informações do firewall (key/value)", keyValueArray);
  }

  // -------------------------
  // Obter apenas IPs bloqueados
  // -------------------------
  static getBlocked() {
    this.loadBlocked();
    return ApiResponse.success("IPs bloqueados", { blocked: this.blockedIPs });
  }
}

// -------------------------
// Handler da API
// -------------------------
export default async function handler(req: { method: any; query: any; body: any; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: unknown): any; new(): any; }; }; }) {
  const { method, query, body } = req;
  const { action } = query;

  try {
    if (method === "GET" && action === "blocked") {
      return res.status(200).json(Firewall.getBlocked());
    }
    if (method === "GET" && action === "info") {
      return res.status(200).json(Firewall.getInfo());
    }
    if (method === "POST" && action === "block") {
      return res.status(200).json(Firewall.block(body?.ip));
    }
    if (method === "POST" && action === "unblock") {
      return res.status(200).json(Firewall.unblock(body?.ip));
    }
    if (method === "POST" && action === "route") {
      return res.status(200).json(Firewall.addRoute(body?.destination, body?.gateway));
    }
    if (method === "POST" && action === "nat") {
      return res.status(200).json(Firewall.addNAT(body?.internalIP, body?.externalIP));
    }
    if (method === "POST" && action === "vpn") {
      return res.status(200).json(Firewall.setVPN(body?.enable));
    }
    if (method === "GET" && action === "connections") {
      return res.status(200).json(await Firewall.getConnections());
    }
    if (method === "GET" && !action) {
      return res.status(200).json(ApiResponse.success("Bem-vindo! Seu acesso foi permitido pelo firewall.", {
        project: "HIVE PROJECT",
        version: "1.2.0",
        platform: os.platform()
      }));
    }

    return res.status(404).json(ApiResponse.error("NOT_FOUND", "Rota não encontrada."));
  } catch (err: any) {
    console.error(err);
    return res.status(500).json(ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", { message: err.message, stack: err.stack }));
  }
}