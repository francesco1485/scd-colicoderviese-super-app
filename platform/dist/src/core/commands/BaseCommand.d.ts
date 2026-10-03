import { z } from "zod";
import type { EventBus } from "../events/EventBus.js";
import type { KeyValueStore } from "../state/KeyValueStore.js";
export type Role = "USER_BASE" | "FAMILY" | "ATHLETE" | "MISTER" | "STAFF" | "MANAGER" | "SECRETARIAT" | "REGISTRATION" | "TOURNAMENTS" | "DIRECTION" | "ADMIN" | "SYSTEM";
export interface Actor {
    userId: string;
    email?: string;
    roles: Role[];
}
export interface CommandContext {
    tenantId: string;
    actor: Actor;
    correlationId: string;
    causationId?: string;
    idempotencyKey?: string;
    state: KeyValueStore;
    events: EventBus;
    signal: AbortSignal;
}
export type CommandExecutionMode = "sync" | "async";
export declare abstract class BaseCommand<TInput, TResult> {
    abstract readonly name: string;
    abstract readonly version: string;
    abstract readonly schema: z.ZodType<TInput>;
    readonly executionMode: CommandExecutionMode;
    readonly allowedRoles: readonly Role[];
    get id(): string;
    validate_schema(payload: unknown): TInput;
    authorize(context: CommandContext): void;
    abstract execute(input: TInput, context: CommandContext): Promise<TResult>;
    rollback(_input: TInput, _context: CommandContext, _reason: unknown): Promise<void>;
}
export type AnyCommand = BaseCommand<unknown, unknown>;
