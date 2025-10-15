/**
 * EnergyOptimizedEspService - Versão otimizada do ESP32 Service com foco em sustentabilidade
 * 
 * Integra gerenciamento de energia e otimizações de rede
 */

// eslint-disable-next-line import/no-unresolved
import { ESP32_SOFTAP_IP, ESP32_STA_IP } from "@env";
import SustainabilityManager from '../hive_sustain/SustainabilityManager.ts';

export type LedStatus = "on" | "off";

export type Esp32Status = {
  ip: string;
  sensor_db: number;
  led_builtin: LedStatus;
  led_opposite: LedStatus;
  ip_ap: string;
  ip_sta: string;
  auto_off_ms: number;
  power_mode?: string;
  energy_score?: number;
};

type ModalCallback = (message: string) => void;

export class EnergyOptimizedEspService {
  static SOFTAP_IP = ESP32_SOFTAP_IP;
  static STA_IP = ESP32_STA_IP;

  status: Esp32Status;
  mode: "Soft-AP" | "STA";
  private sustainManager: SustainabilityManager;
  private modalCallback?: ModalCallback;

  constructor() {
    this.sustainManager = SustainabilityManager.getInstance();
    this.mode = "STA";
    this.status = {
      ip: this.mode === "STA" ? EnergyOptimizedEspService.STA_IP : EnergyOptimizedEspService.SOFTAP_IP,
      sensor_db: 0,
      led_builtin: "off",
      led_opposite: "on",
      ip_ap: EnergyOptimizedEspService.SOFTAP_IP,
      ip_sta: EnergyOptimizedEspService.STA_IP,
      auto_off_ms: 5000,
      power_mode: this.sustainManager.getPowerMode(),
    };

    console.log("🌱 ESP32 Service Sustentável iniciado");
  }

  onModal(callback: ModalCallback) {
    this.modalCallback = callback;
  }

  private showModal(message: string) {
    if (this.modalCallback) {
      this.modalCallback(message);
    }
  }

  switchMode(): "Soft-AP" | "STA" {
    this.mode = this.mode === "STA" ? "Soft-AP" : "STA";
    this.status.ip = this.mode === "STA" ? EnergyOptimizedEspService.STA_IP : EnergyOptimizedEspService.SOFTAP_IP;
    console.log(`🔄 Modo alterado para ${this.mode}, IP atual: ${this.status.ip}`);
    return this.mode;
  }

  private getCurrentIP(): string {
    return this.status.ip;
  }

  async getStatus(): Promise<Esp32Status> {
    try {
      console.log(`📡 Consultando status com otimização de energia...`);
      
      // Usa cachedRequest do SustainabilityManager
      const url = `http://${this.getCurrentIP()}/status`;
      const data = await this.sustainManager.cachedRequest<any>(
        url,
        { method: 'GET' },
        this.sustainManager.getTimeout('cache')
      );

      this.status = {
        ...this.status,
        ...data,
        power_mode: this.sustainManager.getPowerMode(),
        energy_score: this.sustainManager.generateReport().metrics.energy_score,
      };

      return this.status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao obter status: ${errorMessage}`);
      this.showModal(`Erro ao obter status: ${errorMessage}`);
      throw error;
    }
  }

  async toggleLed(): Promise<void> {
    try {
      const currentState = this.status.led_builtin;
      const newState = currentState === "on" ? "off" : "on";
      
      console.log(`💡 Alternando LED: ${currentState} → ${newState}`);
      
      const url = `http://${this.getCurrentIP()}/led?state=${newState}`;
      await this.sustainManager.cachedRequest(
        url,
        { method: 'GET' },
        5000 // Cache curto para comandos
      );

      this.status.led_builtin = newState;
      this.status.led_opposite = newState === "on" ? "off" : "on";
      
      console.log(`✅ LED alternado com sucesso`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao alternar LED: ${errorMessage}`);
      this.showModal(`Erro ao alternar LED: ${errorMessage}`);
      throw error;
    }
  }

  async setAutoOff(ms: number): Promise<void> {
    try {
      console.log(`⏲️ Configurando auto_off para ${ms}ms...`);
      
      const url = `http://${this.getCurrentIP()}/config?auto_off_ms=${ms}`;
      const data = await this.sustainManager.cachedRequest<any>(
        url,
        { method: 'GET' },
        30000 // Cache por 30s
      );

      this.status.auto_off_ms = data.auto_off_ms ?? ms;
      console.log(`✅ Auto_off configurado: ${this.status.auto_off_ms}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao configurar auto_off: ${errorMessage}`);
      this.showModal(`Erro ao configurar auto_off: ${errorMessage}`);
      throw error;
    }
  }

  getSustainabilityReport() {
    return this.sustainManager.generateReport();
  }

  getStatistics() {
    return this.sustainManager.getStatistics();
  }
}

export default EnergyOptimizedEspService;
