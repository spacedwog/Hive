import axios from 'axios';
import { SensorData } from './types';

export class VespaService {
  url: string;

  constructor(url: string) {
    this.url = url;
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
      const res = await fetch(`${this.url}/api/placa_vespa?info=sensor`);
      const text = await res.text();
      try {
        return { data: JSON.parse(text), html: null };
      } catch {
        return { data: null, html: text };
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
        throw new Error('Resposta não OK');
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
      const res = await fetch(`${this.url}/api/firewall`);
      if (!res.ok) {
        throw new Error('Resposta não OK');
      }
      return await res.json();
    } catch (err) {
      console.error('Erro ao acessar Firewall:', err);
      return null;
    }
  }
}