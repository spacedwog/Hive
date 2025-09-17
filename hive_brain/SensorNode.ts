import axios from 'axios';
import { SensorData } from './types';

export class SensorNode {
  name: string;
  ip: string;
  sta_ip: string;

  constructor(name: string, ip: string, sta_ip: string) {
    this.name = name;
    this.ip = ip;
    this.sta_ip = sta_ip;
  }

  async fetchStatus(): Promise<SensorData | null> {
    try {
      const res = await axios.get(`http://${this.sta_ip}/status`, { timeout: 3000 });
      return res.data;
    } catch {}
    try {
      const res = await axios.get(`http://${this.ip}/status`, { timeout: 3000 });
      return res.data;
    } catch {}
    return null;
  }
}