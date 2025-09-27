export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { node, action } = req.body;

    if (!node || !action) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    // Aqui você poderia encaminhar o comando para o ESP32/NodeMCU real via HTTP/MQTT/etc.
    // Por enquanto vamos simular uma resposta
    const response = {
      node,
      action,
      success: true,
      timestamp: Date.now(),
      message: `Comando "${action}" executado no node ${node}.`,
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}