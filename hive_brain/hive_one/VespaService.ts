import axios from 'axios';
import SustainabilityManager from '../hive_sustain/SustainabilityManager.ts';
import { SensorData } from './types.js';

export class VespaService {
  url: string;
  private sustainManager: SustainabilityManager;

  constructor(url: string) {
    this.url = url;
    this.sustainManager = SustainabilityManager.getInstance();
    console.log('🌱 VespaService inicializado com sustentabilidade');
  }

  async sendSensorData(data: SensorData) {
    try {
      await axios.post(`${this.url}/api/placa_vespa`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Erro ao enviar para Vespa:', err);
    }
  }

  async fetchSensorInfo(): Promise<{ data: any | null; html: string | null }> {
    try {
      const url = `${this.url}/api/placa_vespa?info=sensor`;
      // Usa cache do SustainabilityManager (adaptativo baseado no modo de energia)
      const text = await this.sustainManager.cachedRequest<string>(
        url,
        { method: 'GET' },
        this.sustainManager.getTimeout('cache')
      );
      
      try {
        return { data: JSON.parse(text as any), html: null };
      } catch {
        return { data: null, html: text as any };
      }
    } catch (err) {
      console.error('Erro ao acessar Vespa:', err);
      return { data: null, html: null };
    }
  }

  /**
   * Busca os dados do sensor em formato XML da API do Vespa.
   * Retorna uma string XML ou null em caso de erro.
   */
  async fetchSensorInfoXML(): Promise<string | null> {
    try {
      const res = await fetch(`${this.url}/api/placa_vespa?info=sensor&format=xml`);
      if (!res.ok) {
        throw new Error('Erro ao acessar: ' + res.url);
      }
      return await res.text();
    } catch (err) {
      console.error('Erro ao acessar Vespa (XML):', err);
      return null;
    }
  }
  /**
   * Busca os dados do firewall da API do Vespa.
   * Retorna um objeto com os dados do firewall ou null em caso de erro.
   */
  async fetchFirewallInfo(): Promise<any | null> {
    try {
      const url = `${this.url}/api/firewall`;
      // Usa cache do SustainabilityManager
      const data = await this.sustainManager.cachedRequest<any>(
        url,
        { method: 'GET' },
        this.sustainManager.getTimeout('cache')
      );
      return data;
    } catch (err) {
      console.error('Erro ao acessar Firewall:', err);
      return null;
    }
  }
}