import { Redis } from "ioredis";
export function createRedisConnection(url = process.env.REDIS_URL) {
    if (!url)
        return null;
    return new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false
    });
}
//# sourceMappingURL=connection.js.map