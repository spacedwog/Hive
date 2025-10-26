import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = req.query.server as string;
  
  // Exemplo simulado de fallback (poderia buscar dados de cache, DB ou telemetria remota)
  const simulated = {
    server,
    device: 'FallbackNode',
    status: 'ativo',
    analog_percent: Math.random() * 100,
    temperatura_C: 25 + Math.random() * 5,
    umidade_pct: 50 + Math.random() * 10,
    ultrassonico_m: 0.3 + Math.random() * 0.5,
    presenca: Math.random() > 0.5,
    location: { latitude: -23.55052, longitude: -46.633308 },
  };

  res.status(200).json(simulated);
}