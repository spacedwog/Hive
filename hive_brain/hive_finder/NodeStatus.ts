export type NodeStatus = {
  device?: string;
  server_ip?: string;
  status?: string;
  sensor_db?: number;
  anomaly?: {
    detected: boolean;
    message: string;
    expected_range?: string;
    current_value?: number;
    timestamp_ms?: number;
  };
  mesh?: boolean;
  timestamp?: number;
  error?: string;
  wifi_ssid?: string;
};