// --- API Vercel: /api/sensor.js ---
// Projeto: HIVE
// Função: Retornar dados do sensor do ESP32/NodeMCU


function logRequest(req) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
}

function errorResponse(code, error, details = null) {
  return { success: false, error: { code, message: error, details }, timestamp: Date.now() };
}

// Gera dados simulados
function getSensorData() {
  const sensor_db = Math.random() * 100;
  const anomalyDetected = sensor_db > 80;
  return {
    device: 'ESP32 NODE',
    server_ip: '192.168.4.1',
    sta_ip: '192.168.0.101',
    sensor_raw: Math.floor(Math.random() * 500),
    sensor_db: sensor_db,
    status: 'online',
    anomaly: {
      detected: anomalyDetected,
      message: anomalyDetected ? 'Ruído alto detectado' : '',
      current_value: sensor_db,
    },
  };
}

export default function handler(req, res) {
  logRequest(req);

  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method !== 'GET') {
      return res
        .status(405)
        .json(errorResponse('METHOD_NOT_ALLOWED', 'Use apenas GET neste endpoint.'));
    }

    const data = getSensorData();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Erro interno no servidor', { message: err.message }));
  }
}