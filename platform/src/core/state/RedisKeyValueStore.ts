import type IORedis from "ioredis";
import type { KeyValueStore } from "./KeyValueStore.js";

export class RedisKeyValueStore implements KeyValueStore {
  public constructor(private readonly redis: IORedis) {}

  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, value, "EX", ttlSeconds);
      return;
    }
    await this.redis.set(key, value);
  }

  public async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async hashSet(key: string, values: Record<string, string>): Promise<void> {
    if (Object.keys(values).length === 0) return;
    await this.redis.hset(key, values);
  }

  public async hashGetAll(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }
}
