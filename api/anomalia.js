export default async function handler(req, res) {
  if(req.method === "GET") {
    return res.status(200).json({ message: "Envie uma anomalia via POST." });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { server, device, message, current_value, timestamp } = req.body;

  // Aqui você pode salvar em um banco de dados, enviar alerta, etc.
  // Por enquanto, apenas loga e retorna sucesso.
  console.log("Anomalia recebida:", { server, device, message, current_value, timestamp });

  return res.status(200).json({ ok: true, received: { server, device, message, current_value, timestamp } });
}
