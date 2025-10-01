// api-routes.js
import { exec } from "child_process";
import express from "express";

const app = express();
const PORT = 3000;

// Endpoint que executa PowerShell e retorna as rotas de rede
app.get("/routes", (req, res) => {
  exec(
    `powershell.exe -Command "Get-NetRoute | Select-Object DestinationPrefix, NextHop | ConvertTo-Json -Depth 2"`,
    { windowsHide: true },
    (error, stdout, stderr) => {
      if (error) {
        console.error("Erro PowerShell:", stderr);
        return res.status(500).json({ success: false, error: stderr });
      }

      try {
        // Pode retornar objeto único ou array, dependendo do número de rotas
        const data = JSON.parse(stdout);
        const routes = Array.isArray(data) ? data : [data];
        res.json(routes);
      } catch (err) {
        console.error("Erro parse JSON:", err.message);
        res.status(500).json({ success: false, error: "Falha ao interpretar rotas" });
      }
    }
  );
});

// Teste rápido no navegador: http://localhost:3000/routes
app.listen(PORT, () => {
  console.log(`🔥 API de rotas rodando em http://localhost:${PORT}/routes`);
});