/**
 * API de teste de conexão com o Vercel.
 * Endpoint: /api/vercel-test
 * Método: GET
 * Retorna uma mensagem de sucesso com informações básicas do ambiente.
 */

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Método não permitido. Use GET.",
      },
      timestamp: Date.now(),
    });
  }

  return res.status(200).json({
    success: true,
    message: "Conexão com Vercel bem-sucedida!",
    environment: process.env.VERCEL ? "Vercel" : "Outro",
    timestamp: Date.now(),
  });
}