export interface SensorData {
  device?: string;
  server_ip?: string;
  sta_ip?: string;
  sensor_raw?: number;
  sensor_db?: number;
  status?: string;
  anomaly?: {
    detected: boolean;
    message: string;
    current_value: number;
  };
}