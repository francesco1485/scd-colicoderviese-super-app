import { z } from "zod";
import type { EventBus } from "../events/EventBus.js";
import type { KeyValueStore } from "../state/KeyValueStore.js";

export type Role =
  | "USER_BASE"
  | "FAMILY"
  | "ATHLETE"
  | "MISTER"
  | "STAFF"
  | "MANAGER"
  | "SECRETARIAT"
  | "REGISTRATION"
  | "TOURNAMENTS"
  | "DIRECTION"
  | "ADMIN"
  | "SYSTEM";

export interface Actor {
  userId: string;
  email?: string;
  roles: Role[];
}

export interface CommandContext {
  tenantId: string;
  actor: Actor;
  sessionToken?: string;
  correlationId: string;
  causationId?: string;
  idempotencyKey?: string;
  state: KeyValueStore;
  events: EventBus;
  signal: AbortSignal;
}

export type CommandExecutionMode = "sync" | "async";

export abstract class BaseCommand<TInput, TResult> {
  public abstract readonly name: string;
  public abstract readonly version: string;
  public abstract readonly schema: z.ZodType<TInput>;

  public readonly executionMode: CommandExecutionMode = "async";
  public readonly allowedRoles: readonly Role[] = [
    "USER_BASE",
    "FAMILY",
    "ATHLETE",
    "MISTER",
    "STAFF",
    "MANAGER",
    "SECRETARIAT",
    "REGISTRATION",
    "TOURNAMENTS",
    "DIRECTION",
    "ADMIN",
    "SYSTEM"
  ];

  public get id(): string {
    return `${this.name}@${this.version}`;
  }

  public validate_schema(payload: unknown): TInput {
    return this.schema.parse(payload);
  }

  public authorize(context: CommandContext): void {
    const granted = context.actor.roles.some((role) => this.allowedRoles.includes(role));
    if (!granted) {
      throw new Error(`Actor ${context.actor.userId} not authorized for ${this.id}`);
    }
  }

  public abstract execute(input: TInput, context: CommandContext): Promise<TResult>;

  public async rollback(
    _input: TInput,
    _context: CommandContext,
    _reason: unknown
  ): Promise<void> {
    // Override only when the command creates compensatable side effects.
  }
}

export type AnyCommand = BaseCommand<unknown, unknown>;
