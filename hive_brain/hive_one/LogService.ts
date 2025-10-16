import { LogEntry, LogLevel } from "../../hive_body/hive_modal/LogModal.tsx";

type LogCallback = (log: LogEntry) => void;

export default class LogService {
  private static instance: LogService;
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private callbacks: LogCallback[] = [];

  private constructor() {}

  static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  subscribe(callback: LogCallback) {
    this.callbacks.push(callback);
  }

  unsubscribe(callback: LogCallback) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  private notifySubscribers(log: LogEntry) {
    this.callbacks.forEach((callback) => callback(log));
  }

  private addLog(level: LogLevel, message: string, details?: string) {
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      details,
    };

    this.logs.unshift(log);

    // Limita o número de logs
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Notifica os assinantes
    this.notifySubscribers(log);

    // Também mantém no console para desenvolvimento
    const emoji = level === "info" ? "ℹ️" : level === "warn" ? "⚠️" : level === "error" ? "❌" : "✅";
    const timestamp = log.timestamp.toLocaleTimeString("pt-BR");
    
    if (level === "error") {
      console.error(`${emoji} [${timestamp}] ${message}`, details || "");
    } else if (level === "warn") {
      console.warn(`${emoji} [${timestamp}] ${message}`, details || "");
    } else {
      console.log(`${emoji} [${timestamp}] ${message}`, details || "");
    }
  }

  info(message: string, details?: string) {
    this.addLog("info", message, details);
  }

  warn(message: string, details?: string) {
    this.addLog("warn", message, details);
  }

  error(message: string, details?: string) {
    this.addLog("error", message, details);
  }

  success(message: string, details?: string) {
    this.addLog("success", message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.info("Logs limpos");
  }

  getStats() {
    return {
      total: this.logs.length,
      info: this.logs.filter((l) => l.level === "info").length,
      warn: this.logs.filter((l) => l.level === "warn").length,
      error: this.logs.filter((l) => l.level === "error").length,
      success: this.logs.filter((l) => l.level === "success").length,
    };
  }
}
