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

export default function handler(req: VercelRequest, res: VercelResponse) {
  // GET retorna dados simulados da câmera
  if (req.method === "GET") {
    const data = {
      timestamp: Date.now(),
      status: {
        led_builtin: "on",
        led_opposite: "off",
        sensor_db: 42.7,
      },
      streamUrl: "http://192.168.15.188/stream", // exemplo de URL do ESP32
    };

    return res.status(200).json(data);
  }

  // POST para comandos (ex: toggle LED)
  if (req.method === "POST") {
    let {body} = req;

    // Se body for string JSON, parseia
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { action } = body || {};

    if (action === "toggle_led") {
      return res
        .status(200)
        .json({ success: true, message: "LED toggled via Vercel API" });
    }

    return res.status(400).json({ error: "Ação inválida" });
  }

  // Método não permitido
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}