// api/routes.js

import { FirewallInfo } from "./firewall"; // Importa o firewall

export default async function handler(req, res) {
  try {
    // Chamada direta à função do firewall para obter info
    const data = FirewallInfo.getInfo();

    // Retorna apenas a tabela de rotas se existir
    if (data.success && data.data?.routingTable) {
      return res.status(200).json({
        success: true,
        routes: data.data.routingTable,
      });
    }

    // Caso não existam rotas
    return res.status(200).json({
      success: true,
      routes: [],
    });

  } catch (err) {
    console.error("Erro em /api/routes:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}