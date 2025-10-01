export type LedStatus = "on" | "off";

export type Esp32Status = {
  sensor_db: number;
  led_builtin: LedStatus;
  led_opposite: LedStatus;
  ip_ap: string;
  ip_sta: string;
  auto_off_ms: number;
};

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
      ip_ap: Esp32Service.SOFTAP_IP,
      ip_sta: "desconectado",
      auto_off_ms: 5000,
    };
  }

  switchMode(): "Soft-AP" | "STA" {
    this.mode = this.mode === "Soft-AP" ? "STA" : "Soft-AP";
    console.log(`🔄 Modo alterado para ${this.mode}`);
    return this.mode;
  }

  private getCurrentIP() {
    return this.mode === "Soft-AP" ? Esp32Service.SOFTAP_IP : Esp32Service.STA_IP;
  }

  private async request(path: string, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.getCurrentIP()}/${path}`, {
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
    console.warn(`🔁 Iniciando reconexão automática em ${this.getCurrentIP()}...`);

    this.reconnectInterval = setInterval(async () => {
      attempts++;
      try {
        const json = await this.request(path);
        console.log(`✅ Reconectado via ${this.mode}`);
        this.status = { ...this.status, ...json };
        this.stopReconnectLoop();
      } catch {
        console.warn(`⏳ Tentativa ${attempts}/${maxRetries} falhou em ${this.getCurrentIP()}...`);
        if (attempts >= maxRetries) {
          console.error(`❌ Máximo de tentativas atingido em ${this.getCurrentIP()}, mantendo último estado.`);
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

  async toggleLed(turnOn: boolean) {
    const endpoint = turnOn ? "led/on" : "led/off";
    try {
      const json = await this.request(endpoint);
      this.status = { ...this.status, ...json };
    } catch (err) {
      console.error(`⚠️ Erro ao alternar LED em ${this.mode}:`, err);
      try {
        const json = await this.tryReconnectOnce(endpoint);
        this.status = { ...this.status, ...json };
      } catch {
        this.startReconnectLoop(endpoint, 5000, 5);
      }
    }
  }

  async fetchStatus(): Promise<Esp32Status> {
    try {
      const json = await this.request("status");
      this.status = { ...this.status, ...json };
      this.stopReconnectLoop();
      return this.status;
    } catch (err) {
      console.error(`⚠️ Erro ao buscar status:`, err);
      try {
        const json = await this.tryReconnectOnce("status");
        this.status = { ...this.status, ...json };
        return this.status;
      } catch {
        this.startReconnectLoop("status", 5000, 5);
        return this.status;
      }
    }
  }

  async fetchSnapshot(): Promise<{ json: Esp32Status; image: Blob }> {
    try {
      const res = await fetch(`${this.getCurrentIP()}/snapshot`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();

      // Extrai JSON do multipart
      const jsonMatch = text.match(/\{.*\}/s);
      const json = jsonMatch ? JSON.parse(jsonMatch[0]) : this.status;

      // Para imagem, você precisaria de um Blob real se o backend suportasse fetch como multipart
      const imageBlob = new Blob([text], { type: "image/jpeg" });

      this.status = { ...this.status, ...json };
      return { json: this.status, image: imageBlob };
    } catch (err) {
      console.error("⚠️ Erro ao buscar snapshot:", err);
      this.startReconnectLoop("snapshot", 5000, 5);
      return { json: this.status, image: new Blob() };
    }
  }

  async setAutoOff(ms: number) {
    try {
      const json = await this.request(`config?auto_off_ms=${ms}`);
      this.status.auto_off_ms = json.auto_off_ms ?? ms;
    } catch (err) {
      console.error("⚠️ Erro ao atualizar auto_off_ms:", err);
    }
  }
}