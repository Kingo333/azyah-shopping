// Small LRU of prepared garment photos (base64), keyed by URL + mode, so switching
// back to a garment during Live Cam skips the download and the clean-up.

export class GarmentRefCache {
  private readonly map = new Map<string, string>();

  constructor(private readonly maxEntries = 8) {}

  get(key: string): string | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v); // most recently used last
    }
    return v;
  }

  set(key: string, value: string): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }

  get size(): number {
    return this.map.size;
  }
}

export const garmentRefCache = new GarmentRefCache();
