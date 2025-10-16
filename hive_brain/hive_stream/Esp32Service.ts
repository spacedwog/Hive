// eslint-disable-next-line import/no-unresolved
import { ESP32_SOFTAP_IP, ESP32_STA_IP } from "@env";
import LogService from '../hive_one/LogService.ts';
import SustainabilityManager from '../hive_sustain/SustainabilityManager.ts';

export type LedStatus = "on" | "off";

// Estrutura real retornada pelo ESP32-CAM (baseada no firmware esp32_cam.ino)
export type Esp32Status = {
  led_builtin: LedStatus;
  led_opposite: LedStatus;
  sound_level: number;  // Nível do sensor de som (valor analógico)
  ip_ap: string;
  ip_sta: string;
  auto_off_ms: number;  // Tempo em ms para desligar LED automaticamente
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
  private logService: LogService;
  
  // Circuit breaker
  private circuitBreakerFailures = 0;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 30000; // 30s
  private circuitBreakerOpenUntil = 0;
  private isCircuitBreakerOpen = false;
  
  // Cache de status
  private lastSuccessfulStatus: Esp32Status | null = null;
  private lastSuccessTime = 0;

  constructor() {
    this.sustainManager = SustainabilityManager.getInstance();
    this.logService = LogService.getInstance();
    this.mode = "STA";
    this.status = {
      led_builtin: "off",
      led_opposite: "on",
      sound_level: 0,
      ip_ap: Esp32Service.SOFTAP_IP,
      ip_sta: Esp32Service.STA_IP,
      auto_off_ms: 5000,
    };

    this.logService.info("📡 ESP32-CAM Service iniciado");
    this.logService.info(`STA_IP: ${Esp32Service.STA_IP}`);
    this.logService.info(`SOFTAP_IP: ${Esp32Service.SOFTAP_IP}`);
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

    this.logService.error(`Erro registrado [${type}]: ${message}`, details);
    
    if (this.errorCallback) {
      this.errorCallback(errorLog);
    }
  }

  getErrorHistory(): ErrorLog[] {
    return [...this.errorHistory];
  }

  clearErrorHistory() {
    this.errorHistory = [];
    this.logService.info('🧹 Histórico de erros limpo');
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

  private checkCircuitBreaker(): boolean {
    const now = Date.now();
    
    if (this.isCircuitBreakerOpen && now < this.circuitBreakerOpenUntil) {
      const remainingTime = Math.ceil((this.circuitBreakerOpenUntil - now) / 1000);
      this.logService.warn(`Circuit breaker aberto. Tentando novamente em ${remainingTime}s`);
      return false;
    }
    
    if (this.isCircuitBreakerOpen && now >= this.circuitBreakerOpenUntil) {
      this.logService.success("Circuit breaker resetado. Tentando reconectar...");
      this.isCircuitBreakerOpen = false;
      this.circuitBreakerFailures = 0;
    }
    
    return true;
  }

  private recordCircuitBreakerFailure() {
    this.circuitBreakerFailures++;
    
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.isCircuitBreakerOpen = true;
      this.circuitBreakerOpenUntil = Date.now() + this.circuitBreakerTimeout;
      this.logService.error(
        `Circuit breaker aberto após ${this.circuitBreakerFailures} falhas consecutivas`,
        `Pausando requisições por ${this.circuitBreakerTimeout / 1000}s`
      );
    }
  }

  private recordCircuitBreakerSuccess() {
    if (this.circuitBreakerFailures > 0) {
      this.logService.success(`Conexão restaurada após ${this.circuitBreakerFailures} falhas`);
    }
    this.circuitBreakerFailures = 0;
    this.isCircuitBreakerOpen = false;
  }

  getLastKnownStatus(): Esp32Status | null {
    return this.lastSuccessfulStatus;
  }

  getTimeSinceLastSuccess(): number {
    return Date.now() - this.lastSuccessTime;
  }

  switchMode(): "Soft-AP" | "STA" {
    this.mode = this.mode === "STA" ? "Soft-AP" : "STA";
    this.logService.info(`Modo alterado para ${this.mode}`, `IP atual: ${this.getCurrentIP()}`);
    return this.mode;
  }

  private getCurrentIP(): string {
    return this.mode === "STA" ? this.status.ip_sta : this.status.ip_ap;
  }

  private getFormattedURL(path: string): string {
    const ip = this.getCurrentIP();
    
    // Valida se o IP está definido e não é "desconectado"
    if (!ip || ip === "desconectado" || ip === "0.0.0.0") {
      throw new Error(`IP inválido ou não conectado: ${ip}`);
    }
    
    // Remove barras extras e adiciona protocolo HTTP
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanIP = ip.replace(/^http:\/\//, '').replace(/\/$/, '');
    
    return `http://${cleanIP}/${cleanPath}`;
  }

  private async testConnectivity(): Promise<boolean> {
    const currentIP = this.getCurrentIP();
    
    // Valida IP antes de tentar conectar
    if (!currentIP || currentIP === "desconectado" || currentIP === "0.0.0.0") {
      this.logService.error(`IP inválido para teste de conectividade: ${currentIP}`);
      return false;
    }
    
    try {
      this.logService.info(`Testando conectividade com ${currentIP}...`);
      
      const url = this.getFormattedURL('status');
      this.logService.info(`URL de teste: ${url}`);
      
      const res = await this.sustainManager.cachedRequest(
        url,
        { method: 'GET' },
        10000
      );
      
      const isConnected = true;
      
      if (isConnected) {
        this.logService.success(`ESP32 está acessível em ${currentIP}`);
      } else {
        if (typeof res === "object" && res !== null && "status" in res) {
          this.logService.warn(`ESP32 respondeu com status ${(res as { status: number }).status}`);
        } else {
          this.logService.warn("ESP32 respondeu com status desconhecido");
        }
      }
      
      return isConnected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      this.logService.error(
        `Falha no teste de conectividade: ${errorMessage}`,
        `IP testado: ${currentIP} | Modo atual: ${this.mode}`
      );
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
    // Verifica circuit breaker
    if (!this.checkCircuitBreaker()) {
      throw new Error("Circuit breaker aberto. Aguarde antes de tentar novamente.");
    }
    
    let url: string;
    
    try {
      url = this.getFormattedURL(path);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao formatar URL';
      this.logService.error(errorMessage, `Modo: ${this.mode}, IP: ${this.getCurrentIP()}`);
      this.logError(errorMessage, 'network', path, `Modo: ${this.mode}, IP: ${this.getCurrentIP()}`);
      this.recordCircuitBreakerFailure();
      throw err;
    }
    
    this.logService.info(`Fazendo request para: ${url}`, `Timeout: ${timeoutMs}ms | Modo: ${this.mode}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      const res = await fetch(url, { ...options, signal: controller.signal });
      const duration = Date.now() - startTime;
      
      this.logService.info(`Request completado em ${duration}ms`);
      
      if (!res.ok) {
        const errorDetail = `HTTP ${res.status} - ${res.statusText}`;
        this.logError(errorDetail, 'http', path, `Status: ${res.status}`);
        this.recordCircuitBreakerFailure();
        
        if (res.status === 404) {
          this.logService.error(
            `Endpoint não encontrado: ${path}`,
            "Endpoints disponíveis: /status, /led/on, /led/off, /image, /snapshot, /config"
          );
        }
        throw new Error(errorDetail);
      }
      
      this.recordCircuitBreakerSuccess();
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      // Categoriza o tipo de erro
      let errorType: ErrorLog['type'] = 'unknown';
      if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
        errorType = 'network';
      } else if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('HTTP')) {
        errorType = 'http';
      }
      
      this.logError(errorMessage, errorType, path, `URL: ${url}`);
      this.recordCircuitBreakerFailure();
      
      this.logService.error(`Falha no request: ${errorMessage}`, `URL: ${url} | Modo: ${this.mode}`);
      
      // Diagnóstico específico por tipo de erro
      if (errorType === 'network') {
        this.logService.error(
          "ERRO DE REDE DETECTADO",
          `Verifique: ESP32 ligado? | Mesma rede Wi-Fi? | IP: ${this.getCurrentIP()} | Modo: ${this.mode}`
        );
        
        if (this.mode === "STA") {
          this.logService.info("💡 SUGESTÃO: Tente trocar para modo Soft-AP", `IP Soft-AP: ${this.status.ip_ap}`);
        } else {
          this.logService.info("💡 SUGESTÃO: Tente trocar para modo STA", `IP STA: ${this.status.ip_sta}`);
        }
      } else if (errorType === 'timeout') {
        this.logService.error(
          `TIMEOUT DETECTADO: ESP32 não respondeu em ${timeoutMs}ms`,
          "Possível sobrecarga ou problema no firmware"
        );
      }
      
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
      if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
        console.error(`   🔴 Falha de rede: ESP32 pode estar offline ou inacessível`);
        console.error(`   💡 Dica: Verifique se o ESP32 está ligado e na mesma rede`);
        console.error(`   � Dica: Use o botão 'Modo' para trocar entre STA e Soft-AP manualmente`);
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
      this.logService.warn("Loop de reconexão já está ativo, ignorando nova tentativa.");
      return;
    }

    this.retryCount = 0;
    this.logService.info(
      `Iniciando reconexão automática em ${this.getCurrentIP()}`,
      `Máximo de tentativas: ${maxRetries} | Intervalo base: ${baseIntervalMs}ms (com backoff exponencial)`
    );

    this.attemptReconnect(path, baseIntervalMs, maxRetries);
  }

  private attemptReconnect(path: string, baseIntervalMs: number, maxRetries: number) {
    this.retryCount++;
    const currentDelay = this.calculateBackoffDelay(this.retryCount - 1, baseIntervalMs);
    
    this.logService.info(
      `Tentativa ${this.retryCount}/${maxRetries} para ${this.getCurrentIP()}`,
      `Próxima tentativa em ${(currentDelay / 1000).toFixed(1)}s`
    );

    this.request(path)
      .then((json) => {
        this.logService.success(
          `Reconectado com sucesso via ${this.getCurrentIP()}`,
          `Tentativas necessárias: ${this.retryCount}`
        );
        this.syncStatus(json);
        this.stopReconnectLoop();
        this.showModal(`Reconexão bem-sucedida após ${this.retryCount} tentativa(s)!`);
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        this.logService.warn(`Tentativa ${this.retryCount} falhou: ${errorMessage}`);
        
        if (this.retryCount >= maxRetries) {
          this.logService.error(
            `Máximo de ${maxRetries} tentativas atingido, mantendo último estado`,
            `IP testado: ${this.getCurrentIP()} | Modo: ${this.mode} | Sugestão: Verifique se o ESP32 está ligado e na mesma rede`
          );
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
      this.logService.info("🛑 Loop de reconexão encerrado.");
    }
  }

  async checkConnection(): Promise<boolean> {
    this.logService.info("🔍 Iniciando verificação de conexão...");
    const isConnected = await this.testConnectivity();
    
    if (!isConnected && this.mode === "STA") {
      this.logService.warn("Falha no modo STA, tentando Soft-AP automaticamente...");
      this.switchMode();
      const softApConnected = await this.testConnectivity();
      
      if (softApConnected) {
        this.logService.success("Conexão estabelecida via Soft-AP");
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

    this.logService.info(`💡 Alternando LED via endpoint: ${endpoint}`);

    try {
      const json = await this.request(endpoint);
      this.syncStatus(json);
      this.logService.success("LED alternado com sucesso");
      return json;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      this.logService.error(`Erro ao alternar LED: ${errorMessage}`, `Endpoint tentado: ${endpoint}`);
      this.showModal("Erro ao alternar LED. Tentando reconectar...");
      
      try {
        this.logService.info("🔄 Tentando reconexão imediata...");
        const json = await this.tryReconnectOnce(endpoint);
        this.syncStatus(json);
        this.logService.success("LED alternado após reconexão");
        return json;
      } catch (retryErr) {
        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
        this.logService.error(`Falha na reconexão imediata: ${retryErrorMessage}`);
        
        // Diagnóstico adicional
        if (retryErrorMessage.includes('Network request failed')) {
          this.logService.error(
            "Problema de conectividade de rede detectado",
            `Verifique: 1. ESP32 ligado? 2. Mesma rede Wi-Fi? 3. IP correto? (${this.getCurrentIP()})`
          );
        }
        
        this.logService.info("🔁 Iniciando loop de reconexão automática...");
        this.startReconnectLoop(endpoint, 5000, 10);
        this.status.led_builtin = this.status.led_builtin === "on" ? "off" : "on";
        this.status.led_opposite = this.status.led_opposite === "on" ? "off" : "on";
        this.logService.info("🔄 Estado do LED invertido localmente");
        throw retryErr;
      }
    }
  }

  async setAutoOff(ms: number) {
    this.logService.info(`⏲️  Configurando auto_off para ${ms}ms...`);
    
    try {
      const json = await this.request(`config?auto_off_ms=${ms}`);
      this.status.auto_off_ms = json.auto_off_ms ?? ms;
      this.logService.success(`Auto_off configurado: ${this.status.auto_off_ms}ms`);
      return json;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      this.logService.error(`Erro ao atualizar auto_off_ms: ${errorMessage}`);
      this.showModal("Erro ao atualizar auto_off_ms.");
      throw err;
    }
  }

  private syncStatus(json: Partial<Esp32Status>) {
    this.status = {
      ...this.status,
      ...json,
      led_builtin: json.led_builtin ?? this.status.led_builtin,
      led_opposite: json.led_opposite ?? this.status.led_opposite,
      sound_level: json.sound_level ?? this.status.sound_level,
      ip_ap: json.ip_ap ?? this.status.ip_ap,
      ip_sta: json.ip_sta ?? this.status.ip_sta,
      auto_off_ms: json.auto_off_ms ?? this.status.auto_off_ms,
    };
  }

  async fetchStatus(): Promise<Esp32Status> {
    this.logService.info("📊 Buscando status do ESP32-CAM...");
    
    try {
      const json = await this.request("status");
      this.syncStatus(json);
      this.stopReconnectLoop();
      
      // Cacheia status bem-sucedido
      this.lastSuccessfulStatus = { ...this.status };
      this.lastSuccessTime = Date.now();
      
      this.logService.success("Status obtido com sucesso", JSON.stringify(json));
      return this.status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      this.logService.error(`Erro ao buscar status: ${errorMessage}`);
      this.showModal("Erro ao buscar status do ESP32. Tentando reconectar...");
      
      try {
        this.logService.info("🔄 Tentando reconexão imediata...");
        const json = await this.tryReconnectOnce("status");
        this.syncStatus(json);
        this.logService.success("Status obtido após reconexão");
        return this.status;
      } catch (retryErr) {
        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'Erro desconhecido';
        this.logService.error(`Falha na reconexão imediata: ${retryErrorMessage}`);
        
        // Diagnóstico adicional
        if (retryErrorMessage.includes('Network request failed')) {
          this.logService.error(
            "Problema de conectividade de rede detectado",
            `Ações sugeridas: 1. Verifique se o ESP32 está ligado | 2. Confirme mesma rede Wi-Fi | 3. Valide IP: ${this.getCurrentIP()} | 4. Tente alternar STA/Soft-AP`
          );
        }
        
        this.logService.info("🔁 Iniciando loop de reconexão automática...");
        this.startReconnectLoop("status", 5000, 10);
        return this.status;
      }
    }
  }

  getSensorData() {
    return {
      led_builtin: this.status.led_builtin,
      led_opposite: this.status.led_opposite,
      sound_level: this.status.sound_level,
      auto_off_ms: this.status.auto_off_ms,
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
    this.logService.info("🔍 Iniciando diagnóstico de conexão...");
    const errors: string[] = [];
    const suggestions: string[] = [];
    let connectivity = false;
    let latency: number | undefined;

    // Teste 1: Verificar configuração
    this.logService.info("📋 Teste 1: Verificando configuração", 
      `Modo: ${this.mode} | IP STA: ${Esp32Service.STA_IP} | IP Soft-AP: ${Esp32Service.SOFTAP_IP} | IP ativo: ${this.getCurrentIP()}`
    );

    // Teste 2: Teste de conectividade
    this.logService.info("📋 Teste 2: Testando conectividade...");
    try {
      const startTime = Date.now();
      connectivity = await this.testConnectivity();
      latency = Date.now() - startTime;
      
      if (connectivity) {
        this.logService.success(`Conectividade OK (${latency}ms)`);
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
      this.logService.info("📋 Teste 3: Testando modo alternativo...");
      const currentMode = this.mode;
      this.switchMode();
      
      try {
        const altConnectivity = await this.testConnectivity();
        if (altConnectivity) {
          this.logService.success(`Conectividade OK no modo ${this.mode}!`);
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
    this.logService.info(
      "📊 RELATÓRIO DE DIAGNÓSTICO",
      `Status: ${connectivity ? '✅ Conectado' : '❌ Sem conexão'} | Modo: ${this.mode} | IP: ${this.getCurrentIP()}${latency ? ` | Latência: ${latency}ms` : ''}`
    );
    
    if (errors.length > 0) {
      this.logService.error("Erros encontrados no diagnóstico:", errors.join('; '));
    }
    
    if (suggestions.length > 0) {
      this.logService.info("💡 Sugestões:", suggestions.join('; '));
    }

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
