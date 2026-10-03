import type { Redis } from "ioredis";
import type { DomainEvent, EventBus } from "./EventBus.js";
export declare class RedisEventBus implements EventBus {
    private readonly redis;
    private readonly stream;
    constructor(redis: Redis, stream?: string);
    publish<TPayload>(event: DomainEvent<TPayload>): Promise<string>;
}
