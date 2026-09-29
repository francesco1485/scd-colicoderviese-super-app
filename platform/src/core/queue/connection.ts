import IORedis from "ioredis";

export function createRedisConnection(url = process.env.REDIS_URL): IORedis | null {
  if (!url) return null;
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false
  });
}
