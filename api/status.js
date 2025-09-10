// api/status.js
export default function handler(req, res) {
  res.status(200).json({
    message: "Olá do Vercel!",
    timestamp: Date.now()
  });
}