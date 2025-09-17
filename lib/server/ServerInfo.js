import os from "os";
import ServerAnomaly from "./ServerAnomaly";

class ServerInfo {
  constructor() {
    this.anomalyDetector = new ServerAnomaly();
  }

  get() {
    const memoryUsedMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(os.totalmem() / 1024 / 1024);
    const loadAverage = os.loadavg()[0];

    return {
      currentTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: { 
        usedMB: memoryUsedMB, 
        totalMB: memoryTotalMB, 
        freeMB: Math.round(os.freemem() / 1024 / 1024) 
      },
      platform: os.platform(),
      cpuModel: os.cpus()[0].model,
      loadAverage: loadAverage.toFixed(2),
      anomaly: this.anomalyDetector.detect(memoryUsedMB, memoryTotalMB, loadAverage),
    };
  }
}

export default ServerInfo;