import axios from 'axios';
import { NodeStatus } from './NodeStatus';

export class Node {
  name: string;
  ip: string;
  sta_ip: string;

  constructor(name: string, ip: string, sta_ip: string) {
    this.name = name;
    this.ip = ip;
    this.sta_ip = sta_ip;
  }

  async fetchStatus(): Promise<NodeStatus> {
    try {
      const res = await axios.get(`http://${this.sta_ip}/status`, { timeout: 3000 });
      return res.data;
    } catch {}

    try {
      const res = await axios.get(`http://${this.ip}/status`, { timeout: 3000 });
      return res.data;
    } catch {
      return { error: 'Offline ou inacessível' };
    }
  }

  async sendCommand(action: string): Promise<any> {
    try {
      const res = await axios.post(`http://${this.sta_ip}/command`, { action }, { timeout: 3000 });
      return res.data;
    } catch {}

    try {
      const res = await axios.post(`http://${this.ip}/command`, { action }, { timeout: 3000 });
      return res.data;
    } catch (e) {
      throw new Error(`${e}Falha ao enviar comando "${action}" para ${this.name}.`);
    }
  }
}