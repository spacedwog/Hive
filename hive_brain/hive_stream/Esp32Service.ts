 // eslint-disable-next-line import/no-unresolved
import { ESP32_SOFTAP_IP, ESP32_STA_IP } from "@env";

export type LedStatus = "on" | "off";

export type Esp32Status = {
  ip: string;
  sensor_db: number;
  led_builtin: LedStatus;
  led_opposite: LedStatus;
  ip_ap: string;
  ip_sta: string;
  auto_off_ms: number;
};

type ModalCallback = (message: string) => void;

export default class Esp32Service {
  static SOFTAP_IP = ESP32_SOFTAP_IP;
  static STA_IP = ESP32_STA_IP;

  status: Esp32Status;
  mode: "Soft-AP" | "STA";
  private reconnectInterval?: NodeJS.Timeout;
  private modalCallback?: ModalCallback;

  constructor() {
    this.mode = "STA"; // Inicializa no STA por padrão
    this.status = {
      ip: this.mode === "STA" ? Esp32Service.STA_IP : Esp32Service.SOFTAP_IP,
      sensor_db: 0,
      led_builtin: "off",
      led_opposite: "on",
      ip_ap: Esp32Service.SOFTAP_IP,
      ip_sta: Esp32Service.STA_IP,
      auto_off_ms: 5000,
    };

    console.log("📡 ESP32 Service iniciado");
    console.log("STA_IP do .env:", Esp32Service.STA_IP);
    console.log("SOFTAP_IP do .env:", Esp32Service.SOFTAP_IP);
  }

  // Permite registrar um callback para exibir modal
  onModal(callback: ModalCallback) {
    this.modalCallback = callback;
  }

  // Método auxiliar para disparar o modal
  private showModal(message: string) {
    if (this.modalCallback) {
      this.modalCallback(message);
    }
  }

  switchMode(): "Soft-AP" | "STA" {
    this.mode = this.mode === "STA" ? "Soft-AP" : "STA";
    this.status.ip = this.mode === "STA" ? Esp32Service.STA_IP : Esp32Service.SOFTAP_IP;
    console.log(`🔄 Modo alterado para ${this.mode}, IP atual: ${this.status.ip}`);
    return this.mode;
  }

  private getCurrentIP(): string {
    return this.status.ip;
  }

  private async request(path: string, timeoutMs = 15000) {
    const url = `${this.getCurrentIP()}/${path}`;
    console.log(`🌐 Fazendo request para: ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
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
        this.syncStatus(json);
        this.stopReconnectLoop();
        this.showModal("Reconexão bem-sucedida!");
      } catch {
        console.warn(`⏳ Tentativa ${attempts}/${maxRetries} falhou em ${this.getCurrentIP()}...`);
        if (attempts >= maxRetries) {
          console.error(`❌ Máximo de tentativas atingido, mantendo último estado.`);
          this.showModal("Falha ao reconectar ao ESP32. Verifique a conexão.");
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
      this.syncStatus(json);
    } catch (err) {
      console.error(`⚠️ Erro ao alternar LED:`, err);
      this.showModal("Erro ao alternar LED. Tentando reconectar...");
      try {
        const json = await this.tryReconnectOnce(endpoint);
        this.syncStatus(json);
      } catch {
        this.startReconnectLoop(endpoint, 5000, 5);
        this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
        this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
      }
    }
  }

  private syncStatus(json: Partial<Esp32Status>) {
    this.status.led_builtin = json.led_builtin ?? this.status.led_builtin;
    this.status.led_opposite = json.led_opposite ?? this.status.led_opposite;
    this.status.sensor_db = json.sensor_db ?? this.status.sensor_db;
    this.status.ip_ap = json.ip_ap ?? this.status.ip_ap;
    this.status.ip_sta = json.ip_sta ?? this.status.ip_sta;
    this.status.auto_off_ms = json.auto_off_ms ?? this.status.auto_off_ms;
  }

  async fetchStatus(): Promise<Esp32Status> {
    try {
      const json = await this.request("status");
      this.syncStatus({
        ...json,
        sensor_db: json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1)),
      });
      this.stopReconnectLoop();
      return this.status;
    } catch (err) {
      console.error(`⚠️ Erro ao buscar status:`, err);
      this.showModal("Erro ao buscar status do ESP32. Tentando reconectar...");
      try {
        const json = await this.tryReconnectOnce("status");
        this.syncStatus({
          ...json,
          sensor_db: json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1)),
        });
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

      this.syncStatus(json);
      return { json: this.status, image: imageBlob };
    } catch (err) {
      console.error("⚠️ Erro ao buscar snapshot:", err);
      this.showModal("Erro ao buscar snapshot. Tentando reconectar...");
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
      this.showModal("Erro ao atualizar auto_off_ms.");
    }
  }
}