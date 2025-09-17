import axios from 'axios';
import { SensorData } from './types';

export class VercelService {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  async sendSensorData(data: SensorData) {
    try {
      await axios.post(`${this.url}/api/sensor_dth22`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Erro ao enviar para Vercel:', err);
    }
  }

  async fetchSensorInfo(): Promise<{ data: any | null; html: string | null }> {
    try {
      const res = await fetch(`${this.url}/api/sensor_dth22?info=sensor`);
      const text = await res.text();
      try {
        return { data: JSON.parse(text), html: null };
      } catch {
        return { data: null, html: text };
      }
    } catch (err) {
      console.error('Erro ao acessar Vercel:', err);
      return { data: null, html: null };
    }
  }
/**
   * Busca os dados do sensor em formato XML da API do Vercel.
   * Retorna uma string XML ou null em caso de erro.
   */
  async fetchSensorInfoXML(): Promise<string | null> {
    try {
      const res = await fetch(`${this.url}/api/sensor_dth22?info=sensor&format=xml`);
      if (!res.ok) {
        throw new Error('Resposta não OK');
      }
      return await res.text();
    } catch (err) {
      console.error('Erro ao acessar Vercel (XML):', err);
      return null;
    }
  }
}