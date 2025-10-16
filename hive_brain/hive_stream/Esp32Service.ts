// eslint-disable-next-line import/no-unresolved
import { ESP32_SOFTAP_IP, ESP32_STA_IP } from "@env";
import SustainabilityManager from '../hive_sustain/SustainabilityManager.ts';

export type LedStatus = "on" | "off";
export type PowerMode = "eco" | "balanced" | "performance";

// Estrutura real retornada pelo ESP32-CAM
export type Esp32Status = {
  led_builtin: LedStatus;
  led_opposite: LedStatus;
  sensor_db: number;
  ip_ap: string;
  ip_sta: string;
  auto_off_ms: number;
  power_mode?: PowerMode;
  energy_score?: number;
  free_heap?: number;
  total_requests?: number;
  uptime_ms?: number;
};

type ModalCallback = (message: string) => void;
type ErrorCallback = (error: ErrorLog) => void;

export type ErrorLog = {
  id: string;
  timestamp: Date;
  message: string;
  type: 'network' | 'timeout' | 'http' | 'unknown';
  endpoint?: string;
  ip?: string;
  mode?: string;
  details?: string;
};

export default class Esp32Service {
  static SOFTAP_IP = ESP32_SOFTAP_IP;
  static STA_IP = ESP32_STA_IP;

  status: Esp32Status;
  mode: "Soft-AP" | "STA";
  private reconnectInterval?: NodeJS.Timeout;
  private modalCallback?: ModalCallback;
  private errorCallback?: ErrorCallback;
  private retryCount = 0;
  private sustainManager: SustainabilityManager;
  private errorHistory: ErrorLog[] = [];
  private maxErrorHistory = 20;

  constructor() {
    this.sustainManager = SustainabilityManager.getInstance();
    this.mode = "STA";
    this.status = {
      led_builtin: "off",
      led_opposite: "on",
      sensor_db: 0,
      ip_ap: Esp32Service.SOFTAP_IP,
      ip_sta: Esp32Service.STA_IP,
      auto_off_ms: 5000,
      power_mode: "balanced",
      energy_score: 0,
      free_heap: 0,
      total_requests: 0,
      uptime_ms: 0,
    };

    console.log("📡 ESP32-CAM Service iniciado");
    console.log("STA_IP do .env:", Esp32Service.STA_IP);
    console.log("SOFTAP_IP do .env:", Esp32Service.SOFTAP_IP);
  }

  onModal(callback: ModalCallback) {
    this.modalCallback = callback;
  }

  onError(callback: ErrorCallback) {
    this.errorCallback = callback;
  }

  private showModal(message: string) {
    if (this.modalCallback) {
      this.modalCallback(message);
    }
  }

  private logError(message: string, type: ErrorLog['type'], endpoint?: string, details?: string) {
    const errorLog: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      type,
      endpoint,
      ip: this.getCurrentIP(),
      mode: this.mode,
      details
    };

    this.errorHistory.unshift(errorLog);
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.pop();
    }

    console.error(`📝 Erro registrado [${type}]: ${message}`);
    
    if (this.errorCallback) {
      this.errorCallback(errorLog);
    }
  }

  getErrorHistory(): ErrorLog[] {
    return [...this.errorHistory];
  }

  clearErrorHistory() {
    this.errorHistory = [];
    console.log('🧹 Histórico de erros limpo');
  }

  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      network: this.errorHistory.filter(e => e.type === 'network').length,
      timeout: this.errorHistory.filter(e => e.type === 'timeout').length,
      http: this.errorHistory.filter(e => e.type === 'http').length,
      unknown: this.errorHistory.filter(e => e.type === 'unknown').length,
    };
    return stats;
  }

  switchMode(): "Soft-AP" | "STA" {
    this.mode = this.mode === "STA" ? "Soft-AP" : "STA";
    console.log(`🔄 Modo alterado para ${this.mode}, IP atual: ${this.getCurrentIP()}`);
    return this.mode;
  }

  private getCurrentIP(): string {
    return this.mode === "STA" ? this.status.ip_sta : this.status.ip_ap;
  }

  private async testConnectivity(): Promise<boolean> {
    try {
      console.log(`🏓 Testando conectividade com ${this.getCurrentIP()}...`);
      
      const res = await this.sustainManager.cachedRequest(
        `${this.getCurrentIP()}/status`,
        { method: 'GET' },
        10000
      );
      
      const isConnected = true;
      
      if (isConnected) {
        console.log(`✅ ESP32 está acessível em ${this.getCurrentIP()}`);
      } else {
        if (typeof res === "object" && res !== null && "status" in res) {
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

  private calculateBackoffDelay(attempt: number, baseDelay = 5000): number {
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempt, 4));
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, 60000);
    return delay;
  }

  private async request(path: string, options: RequestInit = {}, timeoutMs = 30000) {
    const url = `${this.getCurrentIP()}/${path}`;
    console.log(`🌐 Fazendo request para: ${url}`);
    console.log(`⏱️  Timeout configurado: ${timeoutMs}ms`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      const res = await fetch(url, { ...options, signal: controller.signal });
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Request completado em ${duration}ms`);
      
      if (!res.ok) {
        const errorDetail = `HTTP ${res.status} - ${res.statusText}`;
        this.logError(errorDetail, 'http', path, `Status: ${res.status}`);
        
        if (res.status === 404) {
          console.error(`❌ Endpoint não encontrado: ${path}`);
          console.error(`   Endpoints disponíveis no ESP32-CAM:`);
          console.error(`   - GET /status (obtém status completo)`);
          console.error(`   - GET /led/on (liga o LED)`);
          console.error(`   - GET /led/off (desliga o LED)`);
          console.error(`   - GET /config?auto_off_ms=<ms> (configura auto-off)`);
          console.error(`   - GET /config?power_mode=<mode> (configura modo de energia)`);
        }
        throw new Error(errorDetail);
      }
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      // Categoriza o tipo de erro
      let errorType: ErrorLog['type'] = 'unknown';
      if (errorMessage.includes('Network request failed')) {
        errorType = 'network';
      } else if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('HTTP')) {
        errorType = 'http';
      }
      
      this.logError(errorMessage, errorType, path, `URL: ${url}`);
      
      console.error(`❌ Falha no request: ${errorMessage}`);
      console.error(`   URL: ${url}`);
      console.error(`   Modo: ${this.mode}`);
      console.error(`   Verifique se o ESP32 está ligado e acessível`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async tryReconnectOnce(path: string) {
    console.log(`🔄 Tentando reconexão imediata para: ${path}`);
    console.log(`   IP atual: ${this.getCurrentIP()}`);
    console.log(`   Modo atual: ${this.mode}`);
    
    try {
      // Usa timeout mais curto para reconexão imediata (10s ao invés de 30s)
      return await this.request(path, {}, 10000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`   ⚠️ Erro na tentativa: ${errorMessage}`);
      
      // Verifica se é erro de rede ou timeout
      if (errorMessage.includes('Network request failed')) {
        console.error(`   🔴 Falha de rede: ESP32 pode estar offline ou inacessível`);
        console.error(`   💡 Dica: Verifique se o ESP32 está ligado e na mesma rede`);
      } else if (errorMessage.includes('aborted')) {
        console.error(`   ⏱️  Timeout: ESP32 não respondeu a tempo`);
        console.error(`   💡 Dica: ESP32 pode estar sobrecarregado ou com problemas`);
      }
      
      // Não registra novamente aqui pois já foi registrado no método request()
      throw err;
    }
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
      return json;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao alternar LED: ${errorMessage}`);
      console.error(`   Endpoint tentado: ${endpoint}`);
      this.showModal("Erro ao alternar LED. Tentando reconectar...");
      
      try {
        console.log("🔄 Tentando reconexão imediata...");
        const json = await this.tryReconnectOnce(endpoint);
        this.syncStatus(json);
        console.log("✅ LED alternado após reconexão");
        return json;
      } catch (retryErr) {
        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
        console.error(`❌ Falha na reconexão imediata: ${retryErrorMessage}`);
        
        // Diagnóstico adicional
        if (retryErrorMessage.includes('Network request failed')) {
          console.error(`   🔴 Problema de conectividade de rede detectado`);
          console.error(`   📡 Verifique:`);
          console.error(`      1. ESP32 está ligado?`);
          console.error(`      2. Está na mesma rede Wi-Fi?`);
          console.error(`      3. IP está correto? (${this.getCurrentIP()})`);
        }
        
        console.log("🔁 Iniciando loop de reconexão automática...");
        this.startReconnectLoop(endpoint, 5000, 10);
        this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
        this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
        console.log("🔄 Estado do LED invertido localmente");
        throw retryErr;
      }
    }
  }

  async setAutoOff(ms: number) {
    console.log(`⏲️  Configurando auto_off para ${ms}ms...`);
    
    try {
      const json = await this.request(`config?auto_off_ms=${ms}`);
      this.status.auto_off_ms = json.auto_off_ms ?? ms;
      console.log(`✅ Auto_off configurado: ${this.status.auto_off_ms}ms`);
      return json;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao atualizar auto_off_ms: ${errorMessage}`);
      this.showModal("Erro ao atualizar auto_off_ms.");
      throw err;
    }
  }

  async setPowerMode(mode: PowerMode) {
    console.log(`⚡ Configurando power_mode para: ${mode}`);
    
    try {
      const json = await this.request(`config?power_mode=${mode}`);
      this.syncStatus(json);
      console.log(`✅ Power mode configurado: ${mode}`);
      return json;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao atualizar power_mode: ${errorMessage}`);
      this.showModal("Erro ao atualizar power_mode.");
      throw err;
    }
  }

  private syncStatus(json: Partial<Esp32Status>) {
    this.status = {
      ...this.status,
      ...json,
      led_builtin: json.led_builtin ?? this.status.led_builtin,
      led_opposite: json.led_opposite ?? this.status.led_opposite,
      sensor_db: json.sensor_db ?? this.status.sensor_db,
      ip_ap: json.ip_ap ?? this.status.ip_ap,
      ip_sta: json.ip_sta ?? this.status.ip_sta,
      auto_off_ms: json.auto_off_ms ?? this.status.auto_off_ms,
    };
  }

  async fetchStatus(): Promise<Esp32Status> {
    console.log("📊 Buscando status do ESP32-CAM...");
    
    try {
      const json = await this.request("status");
      this.syncStatus(json);
      this.stopReconnectLoop();
      console.log("✅ Status obtido com sucesso:", json);
      return this.status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`⚠️ Erro ao buscar status: ${errorMessage}`);
      this.showModal("Erro ao buscar status do ESP32. Tentando reconectar...");
      
      try {
        console.log("🔄 Tentando reconexão imediata...");
        const json = await this.tryReconnectOnce("status");
        this.syncStatus(json);
        console.log("✅ Status obtido após reconexão");
        return this.status;
      } catch (retryErr) {
        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
        console.error(`❌ Falha na reconexão imediata: ${retryErrorMessage}`);
        
        // Diagnóstico adicional
        if (retryErrorMessage.includes('Network request failed')) {
          console.error(`   🔴 Problema de conectividade de rede detectado`);
          console.error(`   📡 Ações sugeridas:`);
          console.error(`      1. Verifique se o ESP32 está ligado`);
          console.error(`      2. Confirme que está na mesma rede Wi-Fi`);
          console.error(`      3. Valide o IP no .env: ${this.getCurrentIP()}`);
          console.error(`      4. Tente alternar entre STA/Soft-AP`);
        }
        
        console.log("🔁 Iniciando loop de reconexão automática...");
        this.startReconnectLoop("status", 5000, 10);
        return this.status;
      }
    }
  }

  getSensorData() {
    return {
      led_builtin: this.status.led_builtin,
      led_opposite: this.status.led_opposite,
      sensor_db: this.status.sensor_db,
      power_mode: this.status.power_mode,
      energy_score: this.status.energy_score,
      free_heap: this.status.free_heap,
      uptime_ms: this.status.uptime_ms,
    };
  }

  getPerformanceInfo() {
    return {
      energy_score: this.status.energy_score,
      free_heap: this.status.free_heap,
      total_requests: this.status.total_requests,
      uptime_ms: this.status.uptime_ms,
      power_mode: this.status.power_mode,
    };
  }

  isLedOn() {
    return this.status.led_builtin === "on";
  }

  getActiveIP() {
    return this.getCurrentIP();
  }

  /**
   * Executa diagnóstico completo da conexão com o ESP32
   * @returns Relatório de diagnóstico com informações de conectividade
   */
  async runDiagnostics(): Promise<{
    success: boolean;
    mode: string;
    ip: string;
    connectivity: boolean;
    latency?: number;
    errors: string[];
    suggestions: string[];
  }> {
    console.log("🔍 Iniciando diagnóstico de conexão...");
    const errors: string[] = [];
    const suggestions: string[] = [];
    let connectivity = false;
    let latency: number | undefined;

    // Teste 1: Verificar configuração
    console.log("📋 Teste 1: Verificando configuração...");
    console.log(`   Modo atual: ${this.mode}`);
    console.log(`   IP STA: ${Esp32Service.STA_IP}`);
    console.log(`   IP Soft-AP: ${Esp32Service.SOFTAP_IP}`);
    console.log(`   IP ativo: ${this.getCurrentIP()}`);

    // Teste 2: Teste de conectividade
    console.log("📋 Teste 2: Testando conectividade...");
    try {
      const startTime = Date.now();
      connectivity = await this.testConnectivity();
      latency = Date.now() - startTime;
      
      if (connectivity) {
        console.log(`✅ Conectividade OK (${latency}ms)`);
      } else {
        errors.push("Falha no teste de conectividade");
        suggestions.push("Verifique se o ESP32 está ligado e acessível");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      errors.push(`Erro no teste: ${errorMessage}`);
      
      if (errorMessage.includes('Network request failed')) {
        suggestions.push("ESP32 parece estar offline ou inacessível");
        suggestions.push("Verifique a alimentação do ESP32");
        suggestions.push("Confirme que está na mesma rede Wi-Fi");
      } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        suggestions.push("Timeout na conexão - ESP32 pode estar sobrecarregado");
        suggestions.push("Tente reiniciar o ESP32");
      }
      
      suggestions.push(`Tente alternar entre STA (${Esp32Service.STA_IP}) e Soft-AP (${Esp32Service.SOFTAP_IP})`);
    }

    // Teste 3: Verificar modo alternativo
    if (!connectivity) {
      console.log("📋 Teste 3: Testando modo alternativo...");
      const currentMode = this.mode;
      this.switchMode();
      
      try {
        const altConnectivity = await this.testConnectivity();
        if (altConnectivity) {
          console.log(`✅ Conectividade OK no modo ${this.mode}!`);
          suggestions.push(`Use o modo ${this.mode} (IP: ${this.getCurrentIP()})`);
          connectivity = true;
        } else {
          // Volta para o modo original
          this.switchMode();
        }
      } catch {
        // Volta para o modo original
        this.switchMode();
      }
    }

    // Relatório final
    console.log("\n📊 === RELATÓRIO DE DIAGNÓSTICO ===");
    console.log(`Status: ${connectivity ? '✅ Conectado' : '❌ Sem conexão'}`);
    console.log(`Modo: ${this.mode}`);
    console.log(`IP: ${this.getCurrentIP()}`);
    if (latency) {
      console.log(`Latência: ${latency}ms`);
    }
    
    if (errors.length > 0) {
      console.log("\n❌ Erros encontrados:");
      errors.forEach(err => console.log(`   - ${err}`));
    }
    
    if (suggestions.length > 0) {
      console.log("\n💡 Sugestões:");
      suggestions.forEach(sug => console.log(`   - ${sug}`));
    }
    
    console.log("================================\n");

    return {
      success: connectivity,
      mode: this.mode,
      ip: this.getCurrentIP(),
      connectivity,
      latency,
      errors,
      suggestions
    };
  }
}
