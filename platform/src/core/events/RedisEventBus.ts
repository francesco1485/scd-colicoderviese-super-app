import type IORedis from "ioredis";
import type { DomainEvent, EventBus } from "./EventBus.js";

export class RedisEventBus implements EventBus {
  public constructor(
    private readonly redis: IORedis,
    private readonly stream = "scd:events"
  ) {}

  public async publish<TPayload>(event: DomainEvent<TPayload>): Promise<string> {
    const id = await this.redis.xadd(
      this.stream,
      "*",
      "type",
      event.type,
      "tenantId",
      event.tenantId,
      "correlationId",
      event.correlationId,
      "actorId",
      event.actorId,
      "occurredAt",
      event.occurredAt,
      "payload",
      JSON.stringify(event.payload)
    );
    if (!id) throw new Error("Redis did not return an event id");
    return id;
  }
}
