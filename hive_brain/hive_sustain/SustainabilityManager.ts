/**
 * SustainabilityManager - Gerenciador de Sustentabilidade Tecnológica
 * 
 * Responsável por monitorar e otimizar o consumo de recursos do sistema,
 * promovendo práticas sustentáveis de desenvolvimento e operação.
 */

export type PowerMode = 'high-performance' | 'balanced' | 'eco' | 'ultra-eco';

export type ResourceMetrics = {
  cpu_usage_percent: number;
  memory_usage_mb: number;
  network_requests_count: number;
  network_data_mb: number;
  energy_score: number; // 0-100, quanto maior, mais eficiente
  timestamp: string;
};

export type SustainabilityReport = {
  mode: PowerMode;
  metrics: ResourceMetrics;
  recommendations: string[];
  carbon_footprint_estimate: number; // gramas de CO2
  efficiency_rating: 'A+' | 'A' | 'B' | 'C' | 'D';
};

export class SustainabilityManager {
  private static instance: SustainabilityManager;
  private powerMode: PowerMode = 'balanced';
  private metrics: ResourceMetrics[] = [];
  private maxMetricsHistory = 100;
  private networkRequestCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private requestCounter = 0;
  private dataTransferred = 0; // em bytes
  private startTime = Date.now();

  // Configurações de timeout baseadas no modo de energia
  private timeoutConfigs = {
    'high-performance': { api: 10000, poll: 30000, cache: 60000 },
    'balanced': { api: 8000, poll: 60000, cache: 300000 },
    'eco': { api: 5000, poll: 90000, cache: 600000 },
    'ultra-eco': { api: 3000, poll: 180000, cache: 1800000 }
  };

  private constructor() {
    console.log('🌱 Sustainability Manager inicializado');
    this.loadPreferences();
    this.startMetricsCollection();
  }

  static getInstance(): SustainabilityManager {
    if (!SustainabilityManager.instance) {
      SustainabilityManager.instance = new SustainabilityManager();
    }
    return SustainabilityManager.instance;
  }

  // ==================== POWER MODE ====================

  setPowerMode(mode: PowerMode): void {
    console.log(`🔋 Alterando modo de energia: ${this.powerMode} → ${mode}`);
    this.powerMode = mode;
    this.savePreferences();
    this.applyPowerModeOptimizations();
  }

  getPowerMode(): PowerMode {
    return this.powerMode;
  }

  private applyPowerModeOptimizations(): void {
    switch (this.powerMode) {
      case 'ultra-eco':
        console.log('⚡ Modo Ultra-Eco ativado: máxima economia de recursos');
        this.clearOldCache(0.9); // Remove 90% do cache
        break;
      case 'eco':
        console.log('🌿 Modo Eco ativado: economia de recursos');
        this.clearOldCache(0.5); // Remove 50% do cache
        break;
      case 'balanced':
        console.log('⚖️ Modo Balanceado ativado');
        this.clearOldCache(0.2); // Remove 20% do cache
        break;
      case 'high-performance':
        console.log('🚀 Modo Alta Performance ativado');
        break;
    }
  }

  getTimeout(type: 'api' | 'poll' | 'cache'): number {
    return this.timeoutConfigs[this.powerMode][type];
  }

  // ==================== NETWORK OPTIMIZATION ====================

  async cachedRequest<T>(
    url: string,
    options: RequestInit = {},
    ttl?: number
  ): Promise<T> {
    // Verifica cache
    const cached = this.networkRequestCache.get(url);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`♻️ Cache hit: ${url}`);
      return cached.data;
    }

    // Faz requisição com timeout baseado no modo
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.getTimeout('api'));

    try {
      this.requestCounter++;
      const startTime = Date.now();
      
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const dataSize = JSON.stringify(data).length;
      this.dataTransferred += dataSize;

      // Armazena em cache
      const cacheTTL = ttl || this.getTimeout('cache');
      this.networkRequestCache.set(url, { 
        data, 
        timestamp: Date.now(), 
        ttl: cacheTTL 
      });

      const elapsed = Date.now() - startTime;
      console.log(`📡 Request: ${url} | ${elapsed}ms | ${(dataSize / 1024).toFixed(2)}KB`);

      return data;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`⏱️ Timeout: ${url} (${this.getTimeout('api')}ms)`);
      }
      throw error;
    }
  }

  clearCache(): void {
    const size = this.networkRequestCache.size;
    this.networkRequestCache.clear();
    console.log(`🧹 Cache limpo: ${size} entradas removidas`);
  }

  private clearOldCache(threshold: number): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, value] of this.networkRequestCache.entries()) {
      if (Math.random() < threshold || now - value.timestamp > value.ttl) {
        this.networkRequestCache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 ${removed} entradas de cache removidas`);
    }
  }

  // ==================== METRICS COLLECTION ====================

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Coleta a cada 1 minuto
  }

  private collectMetrics(): void {
    const uptime = Date.now() - this.startTime;
    const avgRequestsPerMin = (this.requestCounter / (uptime / 60000)).toFixed(2);
    
    const metrics: ResourceMetrics = {
      cpu_usage_percent: this.estimateCPUUsage(),
      memory_usage_mb: this.estimateMemoryUsage(),
      network_requests_count: this.requestCounter,
      network_data_mb: this.dataTransferred / (1024 * 1024),
      energy_score: this.calculateEnergyScore(),
      timestamp: new Date().toISOString()
    };

    this.metrics.push(metrics);
    
    // Mantém apenas as últimas N métricas
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    console.log(`📊 Métricas | Requests: ${this.requestCounter} | Avg: ${avgRequestsPerMin}/min | Energy: ${metrics.energy_score}`);
  }

  private estimateCPUUsage(): number {
    // Estimativa baseada em atividade de rede e modo de energia
    const baseUsage = {
      'high-performance': 30,
      'balanced': 20,
      'eco': 12,
      'ultra-eco': 8
    }[this.powerMode];

    const activityFactor = Math.min(this.requestCounter / 100, 1);
    return Math.min(baseUsage + (activityFactor * 20), 100);
  }

  private estimateMemoryUsage(): number {
    // Estimativa baseada em cache e histórico
    const cacheSize = this.networkRequestCache.size * 0.1; // ~100KB por entrada
    const metricsSize = this.metrics.length * 0.001; // ~1KB por métrica
    return cacheSize + metricsSize + 50; // 50MB base
  }

  private calculateEnergyScore(): number {
    // Score de 0-100, onde 100 é o mais eficiente
    const cacheHitRatio = this.getCacheHitRatio();
    const modeScore = {
      'high-performance': 60,
      'balanced': 75,
      'eco': 85,
      'ultra-eco': 95
    }[this.powerMode];

    return Math.min(modeScore + (cacheHitRatio * 20), 100);
  }

  private getCacheHitRatio(): number {
    // Simplificado: quanto mais cache, melhor
    return Math.min(this.networkRequestCache.size / 50, 1);
  }

  // ==================== SUSTAINABILITY REPORT ====================

  generateReport(): SustainabilityReport {
    const latestMetrics = this.metrics[this.metrics.length - 1] || {
      cpu_usage_percent: 0,
      memory_usage_mb: 0,
      network_requests_count: 0,
      network_data_mb: 0,
      energy_score: 100,
      timestamp: new Date().toISOString()
    };

    const recommendations = this.getRecommendations(latestMetrics);
    const carbonFootprint = this.estimateCarbonFootprint(latestMetrics);
    const rating = this.calculateEfficiencyRating(latestMetrics);

    return {
      mode: this.powerMode,
      metrics: latestMetrics,
      recommendations,
      carbon_footprint_estimate: carbonFootprint,
      efficiency_rating: rating
    };
  }

  private getRecommendations(metrics: ResourceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.cpu_usage_percent > 70) {
      recommendations.push('🔴 Alto uso de CPU detectado. Considere ativar modo Eco.');
    }

    if (metrics.network_requests_count > 500) {
      recommendations.push('🔴 Muitas requisições de rede. Ative cache agressivo.');
    }

    if (this.powerMode === 'high-performance') {
      recommendations.push('💡 Modo Alta Performance ativo. Mude para Balanceado para economizar energia.');
    }

    if (this.networkRequestCache.size < 10) {
      recommendations.push('💡 Poucos itens em cache. O sistema pode fazer requisições desnecessárias.');
    }

    if (metrics.energy_score > 90) {
      recommendations.push('✅ Excelente eficiência energética! Continue assim.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Sistema operando de forma sustentável.');
    }

    return recommendations;
  }

  private estimateCarbonFootprint(metrics: ResourceMetrics): number {
    // Estimativa simplificada: 0.5g CO2 por MB transferido
    // + 0.1g CO2 por 1% de CPU por minuto
    const networkCarbon = metrics.network_data_mb * 0.5;
    const cpuCarbon = metrics.cpu_usage_percent * 0.1;
    return parseFloat((networkCarbon + cpuCarbon).toFixed(2));
  }

  private calculateEfficiencyRating(metrics: ResourceMetrics): 'A+' | 'A' | 'B' | 'C' | 'D' {
    const score = metrics.energy_score;
    
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  // ==================== STATISTICS ====================

  getStatistics() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    return {
      uptime_hours: uptimeHours,
      total_requests: this.requestCounter,
      total_data_mb: (this.dataTransferred / (1024 * 1024)).toFixed(2),
      cache_entries: this.networkRequestCache.size,
      avg_energy_score: this.calculateAverageEnergyScore(),
      power_mode: this.powerMode
    };
  }

  private calculateAverageEnergyScore(): number {
    if (this.metrics.length === 0) return 100;
    
    const sum = this.metrics.reduce((acc, m) => acc + m.energy_score, 0);
    return parseFloat((sum / this.metrics.length).toFixed(1));
  }

  // ==================== PERSISTENCE ====================

  private savePreferences(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hive_power_mode', this.powerMode);
        console.log('💾 Preferências de sustentabilidade salvas');
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível salvar preferências:', error);
    }
  }

  private loadPreferences(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('hive_power_mode');
        if (saved && ['high-performance', 'balanced', 'eco', 'ultra-eco'].includes(saved)) {
          this.powerMode = saved as PowerMode;
          console.log(`💾 Modo de energia carregado: ${this.powerMode}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível carregar preferências:', error);
    }
  }

  // ==================== RESOURCE CLEANUP ====================

  cleanup(): void {
    console.log('🧹 Limpeza de recursos de sustentabilidade...');
    this.clearCache();
    this.metrics = [];
    this.requestCounter = 0;
    this.dataTransferred = 0;
  }

  reset(): void {
    console.log('🔄 Reiniciando Sustainability Manager...');
    this.cleanup();
    this.powerMode = 'balanced';
    this.startTime = Date.now();
    this.savePreferences();
  }
}

export default SustainabilityManager;
