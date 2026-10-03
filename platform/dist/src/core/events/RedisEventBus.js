export class RedisEventBus {
    redis;
    stream;
    constructor(redis, stream = "scd:events") {
        this.redis = redis;
        this.stream = stream;
    }
    async publish(event) {
        const id = await this.redis.xadd(this.stream, "*", "type", event.type, "tenantId", event.tenantId, "correlationId", event.correlationId, "actorId", event.actorId, "occurredAt", event.occurredAt, "payload", JSON.stringify(event.payload));
        if (!id)
            throw new Error("Redis did not return an event id");
        return id;
    }
}
//# sourceMappingURL=RedisEventBus.js.map