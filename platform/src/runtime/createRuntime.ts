import { fileURLToPath } from "node:url";
import { CommandRegistry } from "../core/commands/CommandRegistry.js";
import { CommandExecutionService } from "../core/commands/CommandExecutionService.js";
import { MemoryEventBus } from "../core/events/MemoryEventBus.js";
import { RedisEventBus } from "../core/events/RedisEventBus.js";
import { createCommandQueue } from "../core/queue/commandQueue.js";
import { createRedisConnection } from "../core/queue/connection.js";
import { MemoryKeyValueStore } from "../core/state/MemoryKeyValueStore.js";
import { RedisKeyValueStore } from "../core/state/RedisKeyValueStore.js";

export async function createRuntime() {
  const pluginDirectory =
    process.env.PLUGIN_DIR ??
    fileURLToPath(new URL("../plugins", import.meta.url));

  const registry = new CommandRegistry(pluginDirectory);
  await registry.initialize({
    watch: process.env.PLUGIN_HOT_RELOAD === "true" || process.env.NODE_ENV !== "production"
  });

  const stateRedis = createRedisConnection();
  const queueRedis = createRedisConnection();

  const state = stateRedis
    ? new RedisKeyValueStore(stateRedis)
    : new MemoryKeyValueStore();

  const events = stateRedis
    ? new RedisEventBus(stateRedis)
    : new MemoryEventBus();

  const queue = queueRedis ? createCommandQueue(queueRedis) : null;
  const requestedMode = process.env.COMMAND_EXECUTION_MODE ?? "inline";
  const executionMode = requestedMode === "queue" && queue ? "queue" : "inline";

  const executor = new CommandExecutionService(
    registry,
    state,
    events,
    queue,
    executionMode
  );

  return {
    registry,
    state,
    events,
    queue,
    executor,
    executionMode,
    redisAvailable: Boolean(stateRedis && queueRedis),
    async close(): Promise<void> {
      await registry.close();
      await queue?.close();
      await queueRedis?.quit();
      await stateRedis?.quit();
    }
  };
}

export type PlatformRuntime = Awaited<ReturnType<typeof createRuntime>>;
