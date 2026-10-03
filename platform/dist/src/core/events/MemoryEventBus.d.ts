import type { DomainEvent, EventBus } from "./EventBus.js";
export declare class MemoryEventBus implements EventBus {
    readonly events: DomainEvent[];
    publish<TPayload>(event: DomainEvent<TPayload>): Promise<string>;
}
