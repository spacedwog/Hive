import ApiResponse from "../response/apiResponse";
import ServerInfo from "../server/ServerInfo";

class StatusApiHandler {
  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static handle(req, res) {
    StatusApiHandler.logRequest(req);

    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method !== "GET") {
        return res
          .status(405)
          .json(ApiResponse.error("METHOD_NOT_ALLOWED", "Método não permitido. Use GET."));
      }

      if (!req.query.info) {
        return res
          .status(400)
          .json(ApiResponse.error("MISSING_PARAM", "Parâmetro 'info' ausente na URL."));
      }

      if (req.query.info === "server") {
        return res.status(200).json(ServerInfo.get());
      }

      return res
        .status(400)
        .json(
          ApiResponse.error("INVALID_PARAM", `Valor inválido para 'info': ${req.query.info}`, {
            acceptedValues: ["server"],
          })
        );
    } catch (err) {
      console.error("Erro interno:", err);
      return res
        .status(500)
        .json(
          ApiResponse.error("INTERNAL_ERROR", "Erro interno no servidor.", {
            message: err.message,
            stack: err.stack,
          })
        );
    }
  }
}

export default StatusApiHandler;