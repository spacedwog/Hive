export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { node, action } = req.body;

    if (!node || !action) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    // IPs locais conhecidos
    const ips = ["192.168.4.1", "192.168.15.138"];
    let result = null;

    for (const ip of ips) {
      try {
        const response = await fetch(`http://${ip}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
          timeout: 2000,
        });
        if (response.ok) {
          result = await response.json();
          console.log(`✅ Comando enviado para ${ip}`);
          break;
        }
      } catch (err) {
        console.warn(`❌ Falha ao enviar para ${ip}:`, err.message);
      }
    }

    // fallback mockado
    if (!result) {
      console.warn("⚠️ Nenhum device respondeu. Usando mock.");
      result = {
        node,
        action,
        success: false,
        timestamp: Date.now(),
        message: `Device ${node} offline. Mock executado.`,
      };
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}