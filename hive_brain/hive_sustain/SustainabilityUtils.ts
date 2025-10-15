/**
 * Sustainability Utilities - Utilitários de Sustentabilidade
 * 
 * Funções auxiliares para promover práticas sustentáveis no código
 */

export class SustainabilityUtils {
  /**
   * Debounce function - Reduz chamadas desnecessárias
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function - Limita taxa de execução
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Lazy loading - Carrega recursos apenas quando necessário
   */
  static lazy<T>(loader: () => Promise<T>): () => Promise<T> {
    let cached: T | null = null;
    let loading: Promise<T> | null = null;

    return async () => {
      if (cached) return cached;
      if (loading) return loading;

      loading = loader();
      cached = await loading;
      loading = null;
      return cached;
    };
  }

  /**
   * Memoização - Cache de resultados de função
   */
  static memoize<T extends (...args: any[]) => any>(
    func: T
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        console.log(`♻️ Cache hit: ${func.name}`);
        return cache.get(key);
      }

      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  /**
   * Batching - Agrupa operações para reduzir overhead
   */
  static createBatcher<T>(
    batchFn: (items: T[]) => Promise<void>,
    wait: number = 1000
  ) {
    let batch: T[] = [];
    let timeout: NodeJS.Timeout | null = null;

    const flush = async () => {
      if (batch.length > 0) {
        const items = [...batch];
        batch = [];
        await batchFn(items);
      }
    };

    return {
      add: (item: T) => {
        batch.push(item);
        
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(flush, wait);
      },
      flush,
    };
  }

  /**
   * Calcula estimativa de energia consumida
   */
  static calculateEnergyConsumption(
    requests: number,
    dataMB: number,
    cpuPercent: number,
    durationMinutes: number
  ): {
    total_joules: number;
    total_wh: number;
    carbon_g: number;
  } {
    // Estimativas simplificadas
    const networkEnergyJ = requests * 0.5; // 0.5J por request
    const dataEnergyJ = dataMB * 10; // 10J por MB
    const cpuEnergyJ = (cpuPercent / 100) * durationMinutes * 60 * 2; // 2J/s a 100%

    const totalJoules = networkEnergyJ + dataEnergyJ + cpuEnergyJ;
    const totalWh = totalJoules / 3600;
    const carbonG = totalWh * 0.5; // 0.5g CO2 por Wh (média)

    return {
      total_joules: parseFloat(totalJoules.toFixed(2)),
      total_wh: parseFloat(totalWh.toFixed(4)),
      carbon_g: parseFloat(carbonG.toFixed(2)),
    };
  }

  /**
   * Determina se deve usar modo econômico baseado em bateria
   */
  static async shouldUseEcoMode(): Promise<boolean> {
    try {
      // Verifica bateria se disponível (web/mobile)
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        
        // Ativa eco mode se bateria < 20% ou não está carregando
        if (battery.level < 0.2 || !battery.charging) {
          console.log('🔋 Bateria baixa detectada, recomendando modo eco');
          return true;
        }
      }
    } catch (error) {
      console.log('⚠️ API de bateria não disponível');
    }

    return false;
  }

  /**
   * Formata bytes em formato legível
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Calcula hash simples para cache keys
   */
  static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Logger com níveis baseado em modo de energia
   */
  static createEcoLogger(powerMode: string) {
    const shouldLog = (level: 'debug' | 'info' | 'warn' | 'error'): boolean => {
      if (powerMode === 'ultra-eco') return level === 'error';
      if (powerMode === 'eco') return ['error', 'warn'].includes(level);
      if (powerMode === 'balanced') return ['error', 'warn', 'info'].includes(level);
      return true; // high-performance
    };

    return {
      debug: (...args: any[]) => shouldLog('debug') && console.debug(...args),
      info: (...args: any[]) => shouldLog('info') && console.log(...args),
      warn: (...args: any[]) => shouldLog('warn') && console.warn(...args),
      error: (...args: any[]) => shouldLog('error') && console.error(...args),
    };
  }

  /**
   * Compress JSON para reduzir tamanho de transferência
   */
  static compressJSON(obj: any): string {
    // Remove espaços e otimiza
    return JSON.stringify(obj);
  }

  /**
   * Retry com backoff exponencial (sustentável)
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          console.log(`🔄 Retry ${i + 1}/${maxRetries} em ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Idle detection - Detecta inatividade para economizar recursos
   */
  static createIdleDetector(
    idleCallback: () => void,
    activeCallback: () => void,
    idleTimeout: number = 60000
  ) {
    let idleTimer: NodeJS.Timeout | null = null;
    let isIdle = false;

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      
      if (isIdle) {
        isIdle = false;
        activeCallback();
      }

      idleTimer = setTimeout(() => {
        isIdle = true;
        idleCallback();
      }, idleTimeout);
    };

    // Event listeners para detectar atividade
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      if (typeof window !== 'undefined') {
        window.addEventListener(event, resetTimer);
      }
    });

    resetTimer();

    return {
      destroy: () => {
        if (idleTimer) clearTimeout(idleTimer);
        events.forEach(event => {
          if (typeof window !== 'undefined') {
            window.removeEventListener(event, resetTimer);
          }
        });
      }
    };
  }

  /**
   * Resource pool - Pool de recursos para reutilização
   */
  static createResourcePool<T>(
    factory: () => T,
    maxSize: number = 10
  ) {
    const pool: T[] = [];

    return {
      acquire: (): T => {
        if (pool.length > 0) {
          console.log('♻️ Reutilizando recurso do pool');
          return pool.pop()!;
        }
        console.log('🆕 Criando novo recurso');
        return factory();
      },
      release: (resource: T): void => {
        if (pool.length < maxSize) {
          pool.push(resource);
          console.log(`📦 Recurso retornado ao pool (${pool.length}/${maxSize})`);
        }
      },
      size: (): number => pool.length,
      clear: (): void => {
        pool.length = 0;
        console.log('🧹 Pool limpo');
      },
    };
  }
}

export default SustainabilityUtils;
