// pages/api/status.js
export default function handler(req, res) {
  try {
    // Headers para segurança e cache
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");

    // Simulação de health-check
    const health = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed,
      env: process.env.NODE_ENV,
    };

    res.status(200).json({
      message: "Olá do Vercel!",
      timestamp: Date.now(),
      health,
    });
  } catch (err) {
    console.error("Erro interno:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}