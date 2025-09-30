import { Buffer } from "buffer";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { image } = req.body; // recebe Base64 do app

      if (!image) {
        return res.status(400).json({ success: false, message: "Nenhuma imagem enviada" });
      }

      // Cria um nome único para o arquivo
      const fileName = `photo_${Date.now()}.jpg`;
      const filePath = path.join("/tmp", fileName); // /tmp é permitido no Vercel

      // Converte Base64 para binário
      const imageBuffer = Buffer.from(image, "base64");
      fs.writeFileSync(filePath, imageBuffer);

      console.log(`✅ Foto salva: ${fileName}`);

      res.status(200).json({ success: true, message: "Imagem recebida com sucesso", fileName });
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      res.status(500).json({ success: false, message: "Erro no servidor" });
    }
  } else {
    res.status(405).json({ success: false, message: "Método não permitido. Use POST." });
  }
}