import axios from "axios";
import { Buffer } from "buffer";

export default async function handler(req, res) {
  const USER = "spacedwog";
  const PASS = "Kimera12@";
  const authHeader = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

  const devices = [
    "http://192.168.4.1",
    "http://192.168.15.166"
  ];

  // Verifica Basic Auth
  const auth = req.headers.authorization;
  if (!auth || auth !== authHeader) {
    res.status(401).setHeader("WWW-Authenticate", 'Basic realm="Hive Server"');
    return res.send("Acesso negado");
  }

  try {
    const responses = await Promise.all(
      devices.map(async (url) => {
        try {
          const r = await axios.get(`${url}/status`, { timeout: 3000 });
          return { ...r.data, server: url, latitude: r.data.latitude ?? -23.5505, longitude: r.data.longitude ?? -46.6333, clients: r.data.clients ?? [] };
        } catch (err) {
          return { server: url, status: "offline", error: err.message, latitude: -23.5505, longitude: -46.6333, clients: [] };
        }
      })
    );
    res.status(200).json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}