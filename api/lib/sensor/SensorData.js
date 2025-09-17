class SensorData {
  get(body = null) {
    const sensor_db = body && body.sensor_db != null ? body.sensor_db : Math.random() * 100;
    const anomalyDetected = sensor_db > 80;

    return {
      device: body && body.device ? body.device : "ESP32 NODE",
      server_ip: body && body.server_ip ? body.server_ip : "192.168.4.1",
      sta_ip: body && body.sta_ip ? body.sta_ip : "192.168.0.101",
      sensor_raw: body && body.sensor_raw != null ? body.sensor_raw : Math.floor(Math.random() * 500),
      sensor_db,
      status: body && body.status ? body.status : "online",
      anomaly: {
        detected: anomalyDetected,
        message: anomalyDetected ? "Ruído alto detectado" : "",
        current_value: sensor_db,
      },
    };
  }
}

export default SensorData;