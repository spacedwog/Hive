import axios from "axios";
import basicAuth from "basic-auth";
import cors from "cors";
import express from "express";

const app = express();
app.use(express.json());
app.use(cors());

// Configuração da autenticação básica
const USER = "spacedwog";
const PASS = "Kimera12@";

// Lista de dispositivos locais que o servidor vai consultar
// Podem ser IPs locais ou outros servidores na rede
const devices = [
  "http://192.168.4.1",
  "http://192.168.15.166"
];

// Middleware de autenticação básica
app.use((req, res, next) => {
  const credentials = basicAuth(req);
  if (!credentials || credentials.name !== USER || credentials.pass !== PASS) {
    res.status(401).setHeader("WWW-Authenticate", 'Basic realm="Hive Server"');
    return res.send("Acesso negado");
  }
  next();
});

// Rota GET /status — agrega status de todos os dispositivos
app.get("/status", async (req, res) => {
  try {
    const responses = await Promise.all(devices.map(async (url) => {
      try {
        const r = await axios.get(`${url}/status`, { timeout: 3000 });
        return {
          ...r.data,
          server: url,
          latitude: r.data.latitude ?? -23.5505,
          longitude: r.data.longitude ?? -46.6333,
          clients: r.data.clients ?? []
        };
      } catch (err) {
        return {
          server: url,
          status: "offline",
          error: err.message,
          latitude: -23.5505,
          longitude: -46.6333,
          clients: []
        };
      }
    }));

    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota POST /command — envia comando para dispositivo específico
app.post("/command", async (req, res) => {
  const { server, command, ...payload } = req.body;
  if (!server || !command) {
    return res.status(400).json({ error: "Faltando server ou command" });
  }

  try {
    const response = await axios.post(`${server}/command`, { command, ...payload }, { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hive server running on port ${PORT}`));