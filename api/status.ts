// api/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    message: "Olá do Vercel!",
    timestamp: Date.now(),
  });
}