import type { DomainEvent, EventBus } from "./EventBus.js";

export class MemoryEventBus implements EventBus {
  public readonly events: DomainEvent[] = [];

  public async publish<TPayload>(event: DomainEvent<TPayload>): Promise<string> {
    this.events.push(event as DomainEvent);
    return String(this.events.length);
  }
}
