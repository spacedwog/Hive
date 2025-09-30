export type Esp32Status = {
  led_builtin: "on" | "off";
  led_opposite: "on" | "off";
  ip: string;
  sensor_db: number;
};

export default class Esp32Service {
  status: Esp32Status = {
    led_builtin: "off",
    led_opposite: "off",
    ip: "192.168.4.1", // IP inicial Soft-AP
    sensor_db: 0,
  };

  mode: "Soft-AP" | "STA" = "Soft-AP";

  // Alterna o LED built-in
  async toggleLed(): Promise<Esp32Status | string> {
    try {
      this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
      return { ...this.status };
    } catch (err) {
      return `Erro ao alternar LED: ${err}`;
    }
  }

  // Alterna entre Soft-AP e STA e ajusta IP
  switchMode() {
    this.mode = this.mode === "Soft-AP" ? "STA" : "Soft-AP";

    // Altera IP conforme o modo
    this.status.ip = this.mode === "Soft-AP" ? "192.168.4.1" : "192.168.15.188";
  }

  // Simula leitura de status do ESP32
  async fetchStatus(): Promise<Esp32Status> {
    try {
      // Simula sensor de som
      this.status.sensor_db = Math.random() * 100;

      // Retorna status atualizado
      return { ...this.status };
    } catch (err) {
      console.error("Erro ao buscar status do ESP32:", err);
      return { ...this.status };
    }
  }
}