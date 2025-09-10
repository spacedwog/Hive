// api/status.js
export default function handler(req, res) {
  try {
    res.status(200).json({
      message: "Olá do Vercel!",
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("Erro interno:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}