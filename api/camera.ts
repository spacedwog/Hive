// API Camera para Vercel (ou local)
import type { IncomingMessage, ServerResponse } from "http";

// Tipagem genérica compatível com Vercel
type VercelRequest = IncomingMessage & { body?: any };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: (data?: any) => void;
};

// Estado simulado da câmera/ESP32
let esp32Status = {
  led_builtin: "on",
  led_opposite: "off",
  sensor_db: 42.7,
  mode: "Soft-AP" as "Soft-AP" | "STA",
  ip: "192.168.4.1",
};

function toggleLed() {
  esp32Status.led_builtin = esp32Status.led_builtin === "on" ? "off" : "on";
}

function switchMode() {
  esp32Status.mode = esp32Status.mode === "Soft-AP" ? "STA" : "Soft-AP";
  esp32Status.ip = esp32Status.mode === "Soft-AP" ? "192.168.4.1" : "192.168.15.188";
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // GET retorna dados simulados da câmera
  if (req.method === "GET") {
    const data = {
      timestamp: Date.now(),
      status: {
        led_builtin: esp32Status.led_builtin,
        led_opposite: esp32Status.led_opposite,
        sensor_db: esp32Status.sensor_db,
        mode: esp32Status.mode,
        ip: esp32Status.ip,
      },
      streamUrl: `http://${esp32Status.ip}/stream`,
    };

    return res.status(200).json(data);
  }

  // POST para comandos (ex: toggle LED ou alternar modo)
  if (req.method === "POST") {
    let { body } = req;

    // Se body for string JSON, parseia
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { action } = body || {};

    if (action === "toggle_led") {
      toggleLed();
      return res.status(200).json({ success: true, message: "LED toggled via Vercel API" });
    }

    if (action === "switch_mode") {
      switchMode();
      return res.status(200).json({ success: true, message: "Mode switched via Vercel API", ip: esp32Status.ip });
    }

    return res.status(400).json({ error: "Ação inválida" });
  }

  // Método não permitido
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}