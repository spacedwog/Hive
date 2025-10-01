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
  static SOFTAP_FALLBACK = "http://192.168.4.1"; // fallback Soft-AP
  status: Esp32Status;
  private reconnectInterval?: NodeJS.Timeout;

  constructor() {
    this.status = {
      sensor_db: 0,
      led_builtin: "off",
      led_opposite: "on",
      ip_ap: Esp32Service.SOFTAP_FALLBACK,
      ip_sta: "desconectado",
      auto_off_ms: 5000,
    };
  }

  // Retorna o IP atual (STA se disponível, senão fallback Soft-AP)
  private getCurrentIP(): string {
    return this.status.ip_sta !== "desconectado"
      ? `http://${this.status.ip_sta}`
      : Esp32Service.SOFTAP_FALLBACK;
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
        console.log(`✅ Reconectado via ${this.getCurrentIP()}`);
        this.status = {
          ...this.status,
          ...json,
          ip_ap: json.ip_ap ?? this.status.ip_ap,
          ip_sta: json.ip_sta ?? this.status.ip_sta,
          auto_off_ms: json.auto_off_ms ?? this.status.auto_off_ms,
        };
        this.stopReconnectLoop();
      } catch {
        console.warn(`⏳ Tentativa ${attempts}/${maxRetries} falhou em ${this.getCurrentIP()}...`);
        if (attempts >= maxRetries) {
          console.error(`❌ Máximo de tentativas atingido, mantendo último estado.`);
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

  async toggleLed(turnOn?: boolean) {
    const endpoint = turnOn !== undefined
      ? turnOn ? "led/on" : "led/off"
      : this.status.led_builtin === "on" ? "led/off" : "led/on";

    try {
      const json = await this.request(endpoint);
      this.status = {
        ...this.status,
        ...json,
        ip_ap: json.ip_ap ?? this.status.ip_ap,
        ip_sta: json.ip_sta ?? this.status.ip_sta,
      };
    } catch (err) {
      console.error(`⚠️ Erro ao alternar LED:`, err);
      try {
        const json = await this.tryReconnectOnce(endpoint);
        this.status = {
          ...this.status,
          ...json,
          ip_ap: json.ip_ap ?? this.status.ip_ap,
          ip_sta: json.ip_sta ?? this.status.ip_sta,
        };
      } catch {
        this.startReconnectLoop(endpoint, 5000, 5);
        // fallback manual
        this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
        this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
      }
    }
  }

  async fetchStatus(): Promise<Esp32Status> {
    try {
      const json = await this.request("status");
      this.status = {
        ...this.status,
        ...json,
        sensor_db: json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1)),
        ip_ap: json.ip_ap ?? this.status.ip_ap,
        ip_sta: json.ip_sta ?? this.status.ip_sta,
        auto_off_ms: json.auto_off_ms ?? this.status.auto_off_ms,
      };
      this.stopReconnectLoop();
      return this.status;
    } catch (err) {
      console.error(`⚠️ Erro ao buscar status:`, err);
      try {
        const json = await this.tryReconnectOnce("status");
        this.status = {
          ...this.status,
          ...json,
          sensor_db: json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1)),
          ip_ap: json.ip_ap ?? this.status.ip_ap,
          ip_sta: json.ip_sta ?? this.status.ip_sta,
          auto_off_ms: json.auto_off_ms ?? this.status.auto_off_ms,
        };
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

      const jsonMatch = text.match(/\{.*\}/s);
      const json = jsonMatch ? JSON.parse(jsonMatch[0]) : this.status;

      const imageBlob = new Blob([text], { type: "image/jpeg" });

      this.status = {
        ...this.status,
        ...json,
        ip_ap: json.ip_ap ?? this.status.ip_ap,
        ip_sta: json.ip_sta ?? this.status.ip_sta,
      };
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