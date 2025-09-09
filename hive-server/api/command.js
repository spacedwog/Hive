import axios from "axios";
import { Buffer } from "buffer";

export default async function handler(req, res) {
  const USER = "spacedwog";
  const PASS = "Kimera12@";
  const authHeader = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

  // Verifica Basic Auth
  const auth = req.headers.authorization;
  if (!auth || auth !== authHeader) {
    res.status(401).setHeader("WWW-Authenticate", 'Basic realm="Hive Server"');
    return res.send("Acesso negado");
  }

  const { server, command, ...payload } = req.body;
  if (!server || !command) return res.status(400).json({ error: "Faltando server ou command" });

  try {
    const response = await axios.post(`${server}/command`, { command, ...payload }, { timeout: 5000 });
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}