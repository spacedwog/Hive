import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { server, device, message, current_value, timestamp } = req.body;

  console.warn('⚠️ Anomalia reportada via fallback:', {
    server,
    device,
    message,
    current_value,
    timestamp,
  });

  res.status(200).json({ ok: true, received: { server, device, message, current_value, timestamp } });
}