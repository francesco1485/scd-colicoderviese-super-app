export interface DomainEvent<TPayload = unknown> {
    type: string;
    tenantId: string;
    correlationId: string;
    actorId: string;
    occurredAt: string;
    payload: TPayload;
}
export interface EventBus {
    publish<TPayload>(event: DomainEvent<TPayload>): Promise<string>;
}
