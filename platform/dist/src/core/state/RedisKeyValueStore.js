export class RedisKeyValueStore {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        return this.redis.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds !== undefined) {
            await this.redis.set(key, value, "EX", ttlSeconds);
            return;
        }
        await this.redis.set(key, value);
    }
    async delete(key) {
        await this.redis.del(key);
    }
    async hashSet(key, values) {
        if (Object.keys(values).length === 0)
            return;
        await this.redis.hset(key, values);
    }
    async hashGetAll(key) {
        return this.redis.hgetall(key);
    }
}
//# sourceMappingURL=RedisKeyValueStore.js.map