import { Redis } from "ioredis";

export function createRedisConnection(url = process.env.REDIS_URL): Redis | null {
  if (!url) return null;
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false
  });
}
