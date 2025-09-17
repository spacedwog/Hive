export type LedStatus = "on" | "off";
export type Esp32Status = {
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
    const newState = this.status.led_builtin === "on" ? "L" : "H";
    await fetch(`${this.status.ip}/${newState}`);
    this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
    this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
  }
}
