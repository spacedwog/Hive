export default class VercelService {
  baseUrl = "https://hive-chi-woad.vercel.app/api"; // Substitua pela URL do seu deploy

  // Fetch de dados da API Vercel
  async fetchData() {
    try {
      const response = await fetch(`${this.baseUrl}/camera`);
      const data = await response.json();

      // Retorna dados e HTML opcional
      const html = `<p>Status LED: ${data.status.led_builtin}</p>`;
      return { data, html };
    } catch (err) {
      console.error("Erro ao acessar Vercel:", err);
      throw err;
    }
  }

  // Comando para alternar LED via Vercel
  async toggleLed() {
    try {
      const response = await fetch(`${this.baseUrl}/camera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_led" }),
      });
      return await response.json();
    } catch (err) {
      console.error("Erro ao enviar comando toggle LED:", err);
      throw err;
    }
  }
}