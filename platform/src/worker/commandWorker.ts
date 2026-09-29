import { Worker } from "bullmq";
import { fileURLToPath } from "node:url";
import { CommandRegistry } from "../core/commands/CommandRegistry.js";
import type { CommandContext } from "../core/commands/BaseCommand.js";
import { RedisEventBus } from "../core/events/RedisEventBus.js";
import { COMMAND_QUEUE } from "../core/queue/commandQueue.js";
import { createRedisConnection } from "../core/queue/connection.js";
import type { CommandJobData } from "../core/queue/types.js";
import { RedisKeyValueStore } from "../core/state/RedisKeyValueStore.js";

const maybeConnection = createRedisConnection();
if (!maybeConnection) {
  throw new Error("REDIS_URL is required for the external command worker");
}
const connection = maybeConnection;

const maybeStateConnection = createRedisConnection();
if (!maybeStateConnection) {
  throw new Error("REDIS_URL is required for worker state");
}
const stateConnection = maybeStateConnection;

const pluginDirectory =
  process.env.PLUGIN_DIR ??
  fileURLToPath(new URL("../plugins", import.meta.url));

const registry = new CommandRegistry(pluginDirectory);
await registry.initialize({ watch: process.env.PLUGIN_HOT_RELOAD === "true" });

const state = new RedisKeyValueStore(stateConnection);
const events = new RedisEventBus(stateConnection);

const worker = new Worker<CommandJobData>(
  COMMAND_QUEUE,
  async (job) => {
    const command = registry.get(job.data.command);
    const input = command.validate_schema(job.data.payload);
    const controller = new AbortController();

    const context: CommandContext = {
      tenantId: job.data.tenantId,
      actor: job.data.actor,
      correlationId: job.data.correlationId,
      state,
      events,
      signal: controller.signal
    };
    if (job.data.causationId !== undefined) context.causationId = job.data.causationId;
    if (job.data.idempotencyKey !== undefined) context.idempotencyKey = job.data.idempotencyKey;

    command.authorize(context);

    await events.publish({
      type: "command.started",
      tenantId: job.data.tenantId,
      correlationId: job.data.correlationId,
      actorId: job.data.actor.userId,
      occurredAt: new Date().toISOString(),
      payload: { command: command.id, jobId: job.id, attempt: job.attemptsMade + 1 }
    });

    try {
      const result = await command.execute(input, context);
      await events.publish({
        type: "command.completed",
        tenantId: job.data.tenantId,
        correlationId: job.data.correlationId,
        actorId: job.data.actor.userId,
        occurredAt: new Date().toISOString(),
        payload: { command: command.id, jobId: job.id }
      });
      return result;
    } catch (error) {
      const maxAttempts = Number(job.opts.attempts ?? 1);
      const finalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (finalAttempt) {
        await command.rollback(input, context, error);
        await events.publish({
          type: "command.failed",
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          actorId: job.data.actor.userId,
          occurredAt: new Date().toISOString(),
          payload: {
            command: command.id,
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      } else {
        await events.publish({
          type: "command.retrying",
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          actorId: job.data.actor.userId,
          occurredAt: new Date().toISOString(),
          payload: { command: command.id, jobId: job.id, attempt: job.attemptsMade + 1 }
        });
      }
      throw error;
    }
  },
  {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 8)
  }
);

worker.on("error", (error) => {
  process.stderr.write(
    JSON.stringify({ level: "error", event: "worker.error", error: error.message }) + "\n"
  );
});

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  process.stdout.write(JSON.stringify({ level: "info", event: "worker.shutdown", signal }) + "\n");
  await worker.close();
  await registry.close();
  await stateConnection.quit();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.stdout.write(
  JSON.stringify({
    level: "info",
    event: "worker.ready",
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 8),
    commands: registry.list().map((command) => command.id)
  }) + "\n"
);
