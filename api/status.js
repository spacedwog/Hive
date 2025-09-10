// api/status.js

export default function handler(req, res) {
  if (req.method === "POST") {
    const { nome, email } = req.body; // dados enviados no body

    if (!nome || !email) {
      return res.status(400).json({
        error: "Campos 'nome' e 'email' são obrigatórios.",
      });
    }

    return res.status(200).json({
      message: `Olá, ${nome}! Seu e-mail é ${email}.`,
      timestamp: Date.now(),
    });
  }

  if (req.method === "GET") {
    const { nome, email } = req.query; // dados via query string

    return res.status(200).json({
      message: `GET recebido. Nome: ${nome || "não enviado"}, Email: ${
        email || "não enviado"
      }`,
      timestamp: Date.now(),
    });
  }

  return res.status(405).json({ error: "Método não permitido" });
}