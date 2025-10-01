export interface Esp32Status {
  sensor_db: number;
  led_builtin: "on" | "off";
  led_opposite: "on" | "off";
  ip: string;
}

export default class Esp32Service {
  static SOFTAP_IP = "http://192.168.4.1";
  static STA_IP = "http://192.168.15.188";

  status: Esp32Status;
  mode: "Soft-AP" | "STA";
  private reconnectInterval?: NodeJS.Timeout;

  constructor() {
    this.mode = "Soft-AP";
    this.status = {
      sensor_db: 0,
      led_builtin: "off",
      led_opposite: "on",
      ip: Esp32Service.SOFTAP_IP,
    };
  }

  switchMode(): "Soft-AP" | "STA" {
    this.mode = this.mode === "Soft-AP" ? "STA" : "Soft-AP";
    this.status.ip =
      this.mode === "Soft-AP" ? Esp32Service.SOFTAP_IP : Esp32Service.STA_IP;

    console.log(`🔄 Modo alterado para ${this.mode} (${this.status.ip})`);
    return this.mode;
  }

  private async request(path: string, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.status.ip}/${path}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async tryReconnectOnce(path: string) {
    return this.request(path);
  }

  private startReconnectLoop(path: string, intervalMs = 5000, maxRetries = 5) {
    if (this.reconnectInterval) {
      return;
    }

    let attempts = 0;
    console.warn(`🔁 Iniciando loop de reconexão automática em ${this.status.ip}...`);

    this.reconnectInterval = setInterval(async () => {
      attempts++;
      try {
        const json = await this.request(path);
        console.log(`✅ Reconectado via ${this.mode} (${this.status.ip})`);
        this.status = { ...this.status, ...json };
        this.stopReconnectLoop();
      } catch {
        console.warn(`⏳ Tentativa ${attempts}/${maxRetries} falhou em ${this.status.ip}...`);
        if (attempts >= maxRetries) {
          console.error(`❌ Máximo de tentativas atingido em ${this.status.ip}, mantendo último estado.`);
          this.stopReconnectLoop();
        }
      }
    }, intervalMs);
  }

  private stopReconnectLoop() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = undefined;
      console.log("🛑 Loop de reconexão encerrado.");
    }
  }

  async toggleLed() {
    const endpoint = this.status.led_builtin === "on" ? "L" : "H";
    try {
      const json = await this.request(endpoint);
      this.status = { ...this.status, ...json };
    } catch (err) {
      console.error(`⚠️ Erro ao alternar LED em ${this.mode} (${this.status.ip}):`, err);

      try {
        const json = await this.tryReconnectOnce(endpoint);
        this.status = { ...this.status, ...json };
      } catch {
        this.startReconnectLoop(endpoint, 5000, 5);

        // fallback visual imediato
        this.status.led_builtin =
          this.status.led_builtin === "on" ? "off" : "on";
        this.status.led_opposite =
          this.status.led_opposite === "on" ? "off" : "on";
      }
    }
  }

  async fetchStatus(): Promise<Esp32Status> {
    try {
      const json = await this.request("status");
      const sensor_db =
        json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1));

      this.status = { ...this.status, ...json, sensor_db };
      this.stopReconnectLoop();
      return this.status;
    } catch (err) {
      console.error(`⚠️ Erro ao buscar status do ESP32 em ${this.mode} (${this.status.ip}):`, err);

      try {
        const json = await this.tryReconnectOnce("status");
        const sensor_db =
          json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1));
        this.status = { ...this.status, ...json, sensor_db };
        return this.status;
      } catch {
        this.startReconnectLoop("status", 5000, 5);
        console.error("❌ Reconexão falhou, mantendo último estado.");
        return this.status;
      }
    }
  }
}