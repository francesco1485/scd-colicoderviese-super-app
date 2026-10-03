import type { Actor } from "../commands/BaseCommand.js";
export interface CommandJobData {
    command: string;
    payload: unknown;
    tenantId: string;
    actor: Actor;
    correlationId: string;
    causationId?: string;
    idempotencyKey?: string;
    acceptedAt: string;
}
export interface CommandSubmission {
    accepted: true;
    mode: "queued" | "inline";
    command: string;
    correlationId: string;
    jobId?: string;
    result?: unknown;
}
