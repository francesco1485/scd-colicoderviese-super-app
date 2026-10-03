import { CommandRegistry } from "../core/commands/CommandRegistry.js";
import { CommandExecutionService } from "../core/commands/CommandExecutionService.js";
import { MemoryEventBus } from "../core/events/MemoryEventBus.js";
import { RedisEventBus } from "../core/events/RedisEventBus.js";
import { MemoryKeyValueStore } from "../core/state/MemoryKeyValueStore.js";
import { RedisKeyValueStore } from "../core/state/RedisKeyValueStore.js";
export declare function createRuntime(): Promise<{
    registry: CommandRegistry;
    state: MemoryKeyValueStore | RedisKeyValueStore;
    events: MemoryEventBus | RedisEventBus;
    queue: any;
    queueConnection: any;
    stateConnection: any;
    executor: CommandExecutionService;
    executionMode: string;
    redisAvailable: boolean;
    close(): Promise<void>;
}>;
export type PlatformRuntime = Awaited<ReturnType<typeof createRuntime>>;
