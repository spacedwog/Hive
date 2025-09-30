import { Buffer } from "buffer";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { status, image } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: "Status ESP32 não fornecido" });
      }

      // Salva imagem se fornecida
      let fileName = null;
      if (image) {
        fileName = `photo_${Date.now()}.jpg`;
        const filePath = path.join("/tmp", fileName);
        const imageBuffer = Buffer.from(image, "base64");
        fs.writeFileSync(filePath, imageBuffer);
        console.log(`✅ Foto salva: ${fileName}`);
      }

      // Salva status + foto em JSON (temporal ou para logs)
      const logData = {
        timestamp: new Date().toISOString(),
        status,
        fileName,
      };

      const logFile = path.join("/tmp", "esp32_log.json");
      let logArray = [];
      if (fs.existsSync(logFile)) {
        logArray = JSON.parse(fs.readFileSync(logFile, "utf8"));
      }
      logArray.push(logData);
      fs.writeFileSync(logFile, JSON.stringify(logArray, null, 2));

      console.log("📡 Status recebido:", status);

      res.status(200).json({ success: true, message: "Dados recebidos com sucesso", logData });
    } catch (err) {
      console.error("Erro ao processar dados:", err);
      res.status(500).json({ success: false, message: "Erro no servidor" });
    }
  } else {
    res.status(405).json({ success: false, message: "Método não permitido. Use POST." });
  }
}