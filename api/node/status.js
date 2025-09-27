export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // IPs locais conhecidos (STA e SoftAP)
  const ips = ["192.168.4.1", "192.168.15.138"]; // ajuste para os IPs reais do seu NodeMCU/ESP32

  try {
    let status = null;

    // tenta consultar cada IP
    for (const ip of ips) {
      try {
        const response = await fetch(`http://${ip}/status`, { timeout: 2000 });
        if (response.ok) {
          status = await response.json();
          console.log(`✅ Status retornado do device em ${ip}`);
          break;
        }
      } catch (err) {
        console.warn(`❌ Falha ao tentar ${ip}:`, err.message);
      }
    }

    // fallback mockado
    if (!status) {
      console.warn("⚠️ Nenhum device respondeu. Usando mock.");
      status = {
        NODEMCU: {
          device: "ESP8266",
          server_ip: "offline",
          status: "OFFLINE",
          sensor_db: Math.random() * 70,
          mesh: false,
          anomaly: { detected: true },
          timestamp: Date.now(),
        },
      };
    }

    res.status(200).json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}