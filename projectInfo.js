import os from "os";
import ApiResponse from "./apiResponse.js";

class ProjectInfo {
  static get() {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
      2,
      "0"
    )}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(
      2,
      "0"
    )}`;

    return ApiResponse.success("Informações do projeto HIVE", {
      projectName: "HIVE",
      description:
        "HIVE é um projeto de monitoramento e controle de dispositivos IoT, " +
        "integrando ESP32, NodeMCU e sistemas web para visualização de status, controle de LEDs, câmeras e dados em tempo real.",
      functionalities: [
        "Controle de LEDs e periféricos do ESP32",
        "Visualização de câmera MJPEG e nativa",
        "Integração com Vercel e APIs REST",
        "Monitoramento de status do dispositivo e memória",
        "Compatível com modo Soft-AP e STA"
      ],
      contact: {
        author: "Felipe Santos",
        email: "felipersantos1988@gmail.com",
        github: "https://github.com/spacedwog"
      },
      currentTime: formattedDate,
      server: {
        platform: os.platform(),
        cpuModel: os.cpus()[0].model,
        memoryMB: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024)
        },
        uptimeSeconds: Math.floor(process.uptime())
      }
    });
  }
}

export default ProjectInfo;