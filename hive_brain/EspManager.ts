
export type NodeStatus = {
  device?: string;
  server?: string;
  status?: "ativo" | "parado" | "offline";
  ultrassonico_m?: number;
  analog_percent?: number;
  presenca?: boolean;
  temperatura_C?: number | null;
  umidade_pct?: number | null;
  timestamp?: string;
  error?: string;
  latitude?: number;
  longitude?: number;
  clients?: any[];
  anomaly?: {
    detected: boolean;
    message: string;
    current_value: number;
  };
};

export const MAX_POINTS = 60;
export const FALLBACK_LAT = -23.5505;
export const FALLBACK_LON = -46.6333;