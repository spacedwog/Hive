export type LedStatus = "on" | "off";

export type Esp32Status = {
  sensor_db: number;
  led_builtin: LedStatus;
  led_opposite: LedStatus;
  ip: string;
};

export default class Esp32Service {
  static SOFTAP_IP = "http://192.168.4.1";
  static STA_IP = "http://192.168.15.188";

  status: Esp32Status;
  mode: "Soft-AP" | "STA";

  constructor() {
    this.mode = "Soft-AP";
    this.status = {
      sensor_db: 0,
      led_builtin: "off",
      led_opposite: "on",
      ip: Esp32Service.SOFTAP_IP,
    };
  }

  switchMode() {
    this.mode = this.mode === "Soft-AP" ? "STA" : "Soft-AP";
    this.status.ip = this.mode === "Soft-AP" ? Esp32Service.SOFTAP_IP : Esp32Service.STA_IP;
  }

  async toggleLed() {
    const endpoint = this.status.led_builtin === "on" ? "L" : "H";
    try {
      const res = await fetch(`${this.status.ip}/${endpoint}`);
      const json = await res.json();
      this.status = {
        ...this.status,
        ...json,
      };
    } catch (err) {
      console.error("Erro toggleLed:", err);
      // alterna manualmente se fetch falhar
      this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
      this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
    }
  }

  // Implementação correta de fetchStatus
  async fetchStatus(): Promise<Esp32Status> {
    try {
      const res = await fetch(`${this.status.ip}/status`);
      const json = await res.json();

      // Simula sensor de som se ainda não estiver no ESP32
      const sensor_db = json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1));

      this.status = {
        ...this.status,
        ...json,
        sensor_db,
      };

      return this.status;
    } catch (err) {
      console.error("Erro ao buscar status ESP32:", err);
      throw err;
    }
  }
}