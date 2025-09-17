export default class VercelService {
  static VERCEL_URL = "https://hive-chi-woad.vercel.app";

  async fetchData(): Promise<{ data: any; html: string | null }> {
    try {
      const response = await fetch(`${VercelService.VERCEL_URL}/api/status?info=server`);
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return { data: json, html: null };
      } catch {
        return { data: null, html: text };
      }
    } catch (err) {
      console.error("Erro ao acessar Vercel:", err);
      return { data: null, html: null };
    }
  }
}