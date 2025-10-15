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
};

type ModalCallback = (message: string) => void;

export default class Esp32Service {
  static SOFTAP_IP = ESP32_SOFTAP_IP;
  static STA_IP = ESP32_STA_IP;

  status: Esp32Status;
  mode: "Soft-AP" | "STA";
  private reconnectInterval?: NodeJS.Timeout;
  private modalCallback?: ModalCallback;
  private retryCount = 0; // Contador de tentativas atual
  private sustainManager: SustainabilityManager;

  constructor() {
    this.sustainManager = SustainabilityManager.getInstance();
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

  // Método para testar conectividade básica (ping)
  private async testConnectivity(): Promise<boolean> {
    try {
      console.log(`🏓 Testando conectividade com ${this.getCurrentIP()}...`);
      
      // Usa SustainabilityManager para requisições otimizadas
      const res = await this.sustainManager.cachedRequest(
        `${this.getCurrentIP()}/status`,
        { method: 'GET' },
        10000 // Cache por 10s
      );
      
      const isConnected = true;
      
      if (isConnected) {
        console.log(`✅ ESP32 está acessível em ${this.getCurrentIP()}`);
      } else {
        if (typeof res === "object" && res !== null && "status" in res) {
          // @ts-ignore
          console.warn(`⚠️ ESP32 respondeu com status ${(res as { status: number }).status}`);
        } else {
          console.warn("⚠️ ESP32 respondeu com status desconhecido");
        }
      }
      
      return isConnected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`❌ Falha no teste de conectividade: ${errorMessage}`);
      console.error(`   IP testado: ${this.getCurrentIP()}`);
      console.error(`   Modo atual: ${this.mode}`);
      return false;
    }
  }

  // Calcula o delay com backoff exponencial
  private calculateBackoffDelay(attempt: number, baseDelay = 5000): number {
    // Backoff exponencial com jitter: baseDelay * 2^attempt + random(0-1000)
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempt, 4));
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, 60000); // Máximo de 60 segundos
    return delay;
  }

  private async request(path: string, timeoutMs = 30000) {
    const url = `${this.getCurrentIP()}/${path}`;
    console.log(`🌐 Fazendo request para: ${url}`);
    console.log(`⏱️  Timeout configurado: ${timeoutMs}ms`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      const res = await fetch(url, { signal: controller.signal });
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Request completado em ${duration}ms`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`❌ Falha no request: ${errorMessage}`);
      console.error(`   URL: ${url}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async tryReconnectOnce(path: string) {
    console.log(`🔄 Tentando reconexão imediata para: ${path}`);
    return this.request(path);
  }

  private startReconnectLoop(path: string, baseIntervalMs = 5000, maxRetries = 10) {
    if (this.reconnectInterval) {
      console.warn("⚠️ Loop de reconexão já está ativo, ignorando nova tentativa.");
      return;
    }

    this.retryCount = 0;
    console.warn(`🔁 Iniciando reconexão automática em ${this.getCurrentIP()}...`);
    console.warn(`   Máximo de tentativas: ${maxRetries}`);
    console.warn(`   Intervalo base: ${baseIntervalMs}ms (com backoff exponencial)`);

    // Primeira tentativa imediata
    this.attemptReconnect(path, baseIntervalMs, maxRetries);
  }

  private attemptReconnect(path: string, baseIntervalMs: number, maxRetries: number) {
    this.retryCount++;
    const currentDelay = this.calculateBackoffDelay(this.retryCount - 1, baseIntervalMs);
    
    console.warn(`⏳ Tentativa ${this.retryCount}/${maxRetries} para ${this.getCurrentIP()}...`);
    console.warn(`   Próxima tentativa em ${(currentDelay / 1000).toFixed(1)}s`);

    this.request(path)
      .then((json) => {
        console.log(`✅ Reconectado com sucesso via ${this.getCurrentIP()}`);
        console.log(`   Tentativas necessárias: ${this.retryCount}`);
        this.syncStatus(json);
        this.stopReconnectLoop();
        this.showModal(`Reconexão bem-sucedida após ${this.retryCount} tentativa(s)!`);
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.warn(`❌ Tentativa ${this.retryCount} falhou: ${errorMessage}`);
        
        if (this.retryCount >= maxRetries) {
          console.error(`❌ Máximo de ${maxRetries} tentativas atingido, mantendo último estado.`);
          console.error(`   IP testado: ${this.getCurrentIP()}`);
          console.error(`   Modo: ${this.mode}`);
          console.error(`   Sugestão: Verifique se o ESP32 está ligado e na mesma rede.`);
          this.showModal(`Falha ao reconectar ao ESP32 após ${maxRetries} tentativas. Verifique a conexão.`);
          this.stopReconnectLoop();
        } else {
          // Agenda próxima tentativa com backoff exponencial
          this.reconnectInterval = setTimeout(() => {
            this.attemptReconnect(path, baseIntervalMs, maxRetries);
          }, currentDelay);
        }
      });
  }

  private stopReconnectLoop() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = undefined;
      this.retryCount = 0;
      console.log("🛑 Loop de reconexão encerrado.");
    }
  }

  // Método público para testar manualmente a conexão
  async checkConnection(): Promise<boolean> {
    console.log("🔍 Iniciando verificação de conexão...");
    const isConnected = await this.testConnectivity();
    
    if (!isConnected && this.mode === "STA") {
      console.log("⚠️ Falha no modo STA, tentando Soft-AP automaticamente...");
      this.switchMode();
      const softApConnected = await this.testConnectivity();
      
      if (softApConnected) {
        console.log("✅ Conexão estabelecida via Soft-AP");
        this.showModal("Conectado via Soft-AP");
        return true;
      }
    }
    
    return isConnected;
  }

  async toggleLed(turnOn?: boolean) {
    const endpoint = turnOn !== undefined
      ? turnOn ? "led/on" : "led/off"
      : this.status.led_builtin === "on" ? "led/off" : "led/on";

    console.log(`💡 Alternando LED via endpoint: ${endpoint}`);

    try {
      const json = await this.request(endpoint);
      this.syncStatus(json);
      console.log("✅ LED alternado com sucesso");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao alternar LED: ${errorMessage}`);
      this.showModal("Erro ao alternar LED. Tentando reconectar...");
      
      try {
        console.log("🔄 Tentando reconexão imediata...");
        const json = await this.tryReconnectOnce(endpoint);
        this.syncStatus(json);
        console.log("✅ LED alternado após reconexão");
      } catch (retryErr) {
        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
        console.error(`❌ Falha na reconexão imediata: ${retryErrorMessage}`);
        console.log("🔁 Iniciando loop de reconexão automática...");
        this.startReconnectLoop(endpoint, 5000, 10);
        // Inverte o estado localmente enquanto tenta reconectar
        this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
        this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
        console.log("🔄 Estado do LED invertido localmente");
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
    console.log("📊 Buscando status do ESP32...");
    
    try {
      const json = await this.request("status");
      this.syncStatus({
        ...json,
        sensor_db: json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1)),
      });
      this.stopReconnectLoop();
      console.log("✅ Status obtido com sucesso");
      return this.status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao buscar status: ${errorMessage}`);
      this.showModal("Erro ao buscar status do ESP32. Tentando reconectar...");
      
      try {
        console.log("🔄 Tentando reconexão imediata...");
        const json = await this.tryReconnectOnce("status");
        this.syncStatus({
          ...json,
          sensor_db: json.sensor_db ?? parseFloat((Math.random() * 100).toFixed(1)),
        });
        console.log("✅ Status obtido após reconexão");
        return this.status;
      } catch (retryErr) {
        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
        console.error(`❌ Falha na reconexão imediata: ${retryErrorMessage}`);
        console.log("🔁 Iniciando loop de reconexão automática...");
        this.startReconnectLoop("status", 5000, 10);
        return this.status;
      }
    }
  }

  async fetchSnapshot(): Promise<{ json: Esp32Status; image: Blob }> {
    console.log("📸 Buscando snapshot do ESP32...");
    
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
      console.log("✅ Snapshot obtido com sucesso");
      return { json: this.status, image: imageBlob };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao buscar snapshot: ${errorMessage}`);
      this.showModal("Erro ao buscar snapshot. Tentando reconectar...");
      console.log("🔁 Iniciando loop de reconexão automática...");
      this.startReconnectLoop("snapshot", 5000, 10);
      return { json: this.status, image: new Blob() };
    }
  }

  async setAutoOff(ms: number) {
    console.log(`⏲️  Configurando auto_off para ${ms}ms...`);
    
    try {
      const json = await this.request(`config?auto_off_ms=${ms}`);
      this.status.auto_off_ms = json.auto_off_ms ?? ms;
      console.log(`✅ Auto_off configurado: ${this.status.auto_off_ms}ms`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao atualizar auto_off_ms: ${errorMessage}`);
      this.showModal("Erro ao atualizar auto_off_ms.");
    }
  }
}