import { FirewallInfo } from "./firewall";

export default async function handler(req, res) {
  try {
    const { method, body } = req;

    if (method === "GET") {
      return res.status(200).json({ success: true, routes: FirewallInfo.routingTable, rules: FirewallInfo.routingTable });
    }

    if (method === "POST") {
      const { destination, gateway } = body || {};
      const result = FirewallInfo.addRoute(destination, gateway);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json({ success: true, routes: FirewallInfo.routingTable, rules: FirewallInfo.routingTable });
    }

    if (method === "DELETE") {
      const { destination } = body || {};
      if (!destination) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_ROUTE", message: "Destination é obrigatório para remoção." },
        });
      }

      const index = FirewallInfo.routingTable.findIndex(r => r.destination === destination);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Rota não encontrada." },
        });
      }

      // Remove a rota
      FirewallInfo.routingTable.splice(index, 1);

      // Atualiza também as regras criadas (se você mantém regras separadas, remova lá também)
      if (FirewallInfo.rules) {
        FirewallInfo.rules = FirewallInfo.rules.filter(r => r.destination !== destination);
      }

      return res.status(200).json({
        success: true,
        message: `Rota ${destination} removida.`,
        routes: FirewallInfo.routingTable,
        rules: FirewallInfo.rules || FirewallInfo.routingTable,
      });
    }

    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: `Método ${method} não permitido.` },
    });

  } catch (err) {
    console.error("Erro em /api/routes:", err);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message, stack: err.stack },
    });
  }
}