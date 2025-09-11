// --- API Vercel: /api/sensor.js ---
// Projeto: HIVE
// Função: Retorna status simulado de sensores

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ success: false, error: 'Método não permitido. Use GET.' });
  }

  const randomSensorDb = Math.random() * 100;
  const anomalyDetected = randomSensorDb > 80;

  const data = {
    device: 'ESP32 NODE-1',
    server_ip: '192.168.4.1',
    sta_ip: '192.168.0.100',
    sensor_raw: Math.floor(Math.random() * 500),
    sensor_db: randomSensorDb,
    status: 'online',
    anomaly: {
      detected: anomalyDetected,
      message: anomalyDetected ? 'Ruído alto detectado' : '',
      current_value: randomSensorDb,
    },
  };

  return res.status(200).json(data);
}