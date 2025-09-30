import axios from "axios";
import { FALLBACK_LAT, FALLBACK_LON } from "./EspManager";

export class GeoCoder {
  private cache: Record<string, { latitude: number; longitude: number }> = {};

  constructor(private retries: number = 3) {}

  async geocode(location: string): Promise<{ latitude: number; longitude: number }> {
    if (!location) {
      return { latitude: FALLBACK_LAT, longitude: FALLBACK_LON };
    }
    if (this.cache[location]) {
      return this.cache[location];
    }

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: location, format: "json", limit: 1 },
          headers: { "User-Agent": "HiveApp/1.0", "Accept-Language": "pt-BR" },
        });

        if (res.data.length > 0) {
          const coords = { latitude: parseFloat(res.data[0].lat), longitude: parseFloat(res.data[0].lon) };
          this.cache[location] = coords;
          return coords;
        }
        return { latitude: FALLBACK_LAT, longitude: FALLBACK_LON };
      } catch (err: any) {
        console.error(`GeoCoder tentativa ${attempt} falhou:`, err.message || err);
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    return { latitude: FALLBACK_LAT, longitude: FALLBACK_LON };
  }
}