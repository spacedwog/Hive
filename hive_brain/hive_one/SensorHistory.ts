export class SensorHistory {
  private history: { [key: string]: number[] } = {};

  add(key: string, value: number) {
    const arr = [...(this.history[key] ?? []), value].slice(-60);
    this.history[key] = arr;
  }

  get(key: string): number[] {
    return this.history[key] ?? [];
  }

  getAll(): { [key: string]: number[] } {
    return this.history;
  }
}
