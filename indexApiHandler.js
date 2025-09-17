import ApiResponse from "./apiResponse.js";
import ProjectInfo from "./projectInfo.js";

class IndexApiHandler {
  static logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  static handle(req, res) {
    IndexApiHandler.logRequest(req);

    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method !== "GET") {
        return res
          .status(405)
          .json(
            ApiResponse.error(
              "METHOD_NOT_ALLOWED",
              "Método não permitido. Use GET."
            )
          );
      }

      const info = req.query.info || "project";

      if (info === "project") {
        return res.status(200).json(ProjectInfo.get());
      }

      return res
        .status(400)
        .json(
          ApiResponse.error(
            "INVALID_PARAM",
            `Valor inválido para 'info': ${info}`,
            { acceptedValues: ["project"] }
          )
        );
    } catch (err) {
      console.error("Erro interno:", err);
      return res
        .status(500)
        .json(
          ApiResponse.error(
            "INTERNAL_ERROR",
            "Erro interno no servidor.",
            { message: err.message, stack: err.stack }
          )
        );
    }
  }
}

export default IndexApiHandler;
