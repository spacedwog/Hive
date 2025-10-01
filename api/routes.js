import { FirewallInfo } from "./firewall";

export default async function handler(req, res) {
  try {
    const data = FirewallInfo.getInfo();

    if (data.success && data.data?.routingTable) {
      return res.status(200).json({
        success: true,
        routes: data.data.routingTable,
      });
    }

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