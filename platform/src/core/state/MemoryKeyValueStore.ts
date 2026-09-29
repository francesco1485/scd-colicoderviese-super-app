import type { KeyValueStore } from "./KeyValueStore.js";

interface Entry {
  value: string;
  expiresAt?: number;
}

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, Entry>();
  private readonly hashes = new Map<string, Record<string, string>>();

  public async get(key: string): Promise<string | null> {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return entry.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const entry: Entry = { value };
    if (ttlSeconds !== undefined) entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this.values.set(key, entry);
  }

  public async delete(key: string): Promise<void> {
    this.values.delete(key);
    this.hashes.delete(key);
  }

  public async hashSet(key: string, values: Record<string, string>): Promise<void> {
    this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...values });
  }

  public async hashGetAll(key: string): Promise<Record<string, string>> {
    return { ...(this.hashes.get(key) ?? {}) };
  }
}
