export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  hashSet(key: string, values: Record<string, string>): Promise<void>;
  hashGetAll(key: string): Promise<Record<string, string>>;
}
