// api/routes.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // Chama a API do firewall para obter informações completas
    const response = await fetch("https://hive-chi-woad.vercel.app/api/firewall?action=route");
    const data = await response.json();

    if (data.success && data.data?.routingTable) {
      return res.status(200).json({
        success: true,
        routes: data.data.routingTable,
      });
    }

    // Caso não existam rotas ainda
    return res.status(200).json({
      success: true,
      routes: [],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}