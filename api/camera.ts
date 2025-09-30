import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ success: false, message: 'Imagem não fornecida' });
      }

      // Decodifica base64
      const buffer = Buffer.from(image, 'base64');

      // Salva em /tmp ou em diretório local (Vercel tem restrições de escrita)
      const fileName = `photo_${Date.now()}.jpg`;
      const filePath = path.join('/tmp', fileName);

      fs.writeFileSync(filePath, buffer);

      console.log(`✅ Foto recebida e salva: ${filePath}`);

      // Resposta de sucesso
      return res.status(200).json({ success: true, fileName });
    } catch (err) {
      console.error('Erro ao processar a imagem:', err);
      return res.status(500).json({ success: false, message: 'Erro interno' });
    }
  } else if (req.method === 'GET') {
    return res.status(200).json({ message: 'API de câmera ativa' });
  } else {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }
}