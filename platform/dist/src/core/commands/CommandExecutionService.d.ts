import type { Queue } from "bullmq";
import type { CommandContext } from "./BaseCommand.js";
import type { CommandRegistry } from "./CommandRegistry.js";
import type { EventBus } from "../events/EventBus.js";
import type { KeyValueStore } from "../state/KeyValueStore.js";
import type { CommandJobData, CommandSubmission } from "../queue/types.js";
export interface SubmitCommandRequest {
    command: string;
    payload: unknown;
    tenantId: string;
    actor: CommandContext["actor"];
    correlationId?: string;
    causationId?: string;
    idempotencyKey?: string;
}
export declare class CommandExecutionService {
    private readonly registry;
    private readonly state;
    private readonly events;
    private readonly queue;
    private readonly defaultMode;
    constructor(registry: CommandRegistry, state: KeyValueStore, events: EventBus, queue: Queue<CommandJobData> | null, defaultMode?: "inline" | "queue");
    submit(request: SubmitCommandRequest): Promise<CommandSubmission>;
}
