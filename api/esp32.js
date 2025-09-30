export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const data = req.body; // JSON enviado pela ESP32

      console.log('📡 Dados recebidos da ESP32:', data);

      // Aqui você poderia salvar em banco de dados ou em arquivo
      // Exemplo: salvar em um arquivo JSON local (não recomendado em produção)
      // const fs = require('fs');
      // fs.writeFileSync('esp32-data.json', JSON.stringify(data, null, 2));

      res.status(200).json({ success: true, message: 'Dados recebidos com sucesso', received: data });
    } catch (err) {
      console.error('Erro ao processar dados:', err);
      res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Método não permitido. Use POST.' });
  }
}