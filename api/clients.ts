import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = req.query.server as string;

  // Simulação de lista de clientes conectados
  const clients = [
    { id: 1, name: 'Sensor_A', ip: `${server}-A`, status: 'online' },
    { id: 2, name: 'Sensor_B', ip: `${server}-B`, status: 'online' },
  ];

  res.status(200).json({ server, clients });
}