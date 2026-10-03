import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import type { CommandRegistry } from "../core/commands/CommandRegistry.js";
import type { EventBus } from "../core/events/EventBus.js";
import type { KeyValueStore } from "../core/state/KeyValueStore.js";
import type { CommandJobData } from "../core/queue/types.js";
export interface CommandWorkerDependencies {
    connection: Redis;
    registry: CommandRegistry;
    state: KeyValueStore;
    events: EventBus;
    concurrency?: number;
}
export declare function createCommandWorker(dependencies: CommandWorkerDependencies): Worker<CommandJobData>;
