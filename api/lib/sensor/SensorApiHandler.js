import ApiResponse from "../response/apiResponse";
import SensorData from "../sensor/SensorData";
import ServerInfo from "../server/ServerInfo";

class SensorApiHandler {
  constructor() {
    this.lastSensorData = null;
    this.apiResponse = new ApiResponse();
    this.sensorData = new SensorData();
    this.serverInfo = new ServerInfo();
  }

  logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }

  async handle(req, res) {
    this.logRequest(req);
    res.setHeader("Content-Type", "application/json");

    try {
      if (req.method === "GET") {
        const info = req.query.info || "sensor";

        if (info === "sensor") {
          const data = this.lastSensorData || this.sensorData.get();
          return res.status(200).json(this.apiResponse.success("Dados do sensor", data));
        }

        if (info === "server") {
          return res.status(200).json(this.apiResponse.success("Dados do servidor", this.serverInfo.get()));
        }

        return res.status(400).json(this.apiResponse.error("INVALID_PARAM", `Valor inválido para 'info': ${info}`));
      }

      if (req.method === "POST") {
        const data = req.body || {};
        const sensorData = this.sensorData.get(data);

        this.lastSensorData = sensorData;

        return res.status(200).json(this.apiResponse.success("Sensor atualizado", sensorData));
      }

      return res.status(405).json(this.apiResponse.error("METHOD_NOT_ALLOWED", "Use GET ou POST neste endpoint."));
    } catch (err) {
      console.error("Erro interno:", err);
      return res.status(500).json(
        this.apiResponse.error("INTERNAL_ERROR", "Erro interno no servidor", { message: err.message, stack: err.stack })
      );
    }
  }
}

export default SensorApiHandler;