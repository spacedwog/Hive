import express from "express";
import { exec } from "child_process";

const app = express();

app.get("/routes", (req, res) => {
  exec("powershell.exe -Command \"Get-NetRoute | Select-Object DestinationPrefix, NextHop | ConvertTo-Json\"",
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr });
      }
      try {
        const routes = JSON.parse(stdout);
        res.json(routes);
      } catch {
        res.json([]);
      }
    }
  );
});

app.listen(3000, () => console.log("API de rotas rodando na porta 3000"));