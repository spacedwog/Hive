export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Aqui você pode buscar o status real dos devices, mas por enquanto deixo mockado
    const status = {
      NODEMCU: {
        device: "ESP8266",
        server_ip: "192.168.4.1",
        status: "OK",
        sensor_db: Math.random() * 70,
        mesh: true,
        anomaly: { detected: false },
        timestamp: Date.now(),
      },
    };

    res.status(200).json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}