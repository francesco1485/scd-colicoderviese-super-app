import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import type { CommandRegistry } from "../core/commands/CommandRegistry.js";
import type { CommandContext } from "../core/commands/BaseCommand.js";
import type { EventBus } from "../core/events/EventBus.js";
import type { KeyValueStore } from "../core/state/KeyValueStore.js";
import { COMMAND_QUEUE } from "../core/queue/commandQueue.js";
import type { CommandJobData } from "../core/queue/types.js";

export interface CommandWorkerDependencies {
  connection: Redis;
  registry: CommandRegistry;
  state: KeyValueStore;
  events: EventBus;
  concurrency?: number;
}

export function createCommandWorker(
  dependencies: CommandWorkerDependencies
): Worker<CommandJobData> {
  const worker = new Worker<CommandJobData>(
    COMMAND_QUEUE,
    async (job: Job<CommandJobData>) => {
      const command = dependencies.registry.get(job.data.command);
      const input = command.validate_schema(job.data.payload);
      const controller = new AbortController();

      const context: CommandContext = {
        tenantId: job.data.tenantId,
        actor: job.data.actor,
        correlationId: job.data.correlationId,
        state: dependencies.state,
        events: dependencies.events,
        signal: controller.signal
      };
      if (job.data.causationId !== undefined) context.causationId = job.data.causationId;
      if (job.data.idempotencyKey !== undefined) context.idempotencyKey = job.data.idempotencyKey;

      command.authorize(context);

      await dependencies.events.publish({
        type: "command.started",
        tenantId: job.data.tenantId,
        correlationId: job.data.correlationId,
        actorId: job.data.actor.userId,
        occurredAt: new Date().toISOString(),
        payload: { command: command.id, jobId: job.id, attempt: job.attemptsMade + 1 }
      });

      try {
        const result = await command.execute(input, context);
        await dependencies.events.publish({
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
          await dependencies.events.publish({
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
          await dependencies.events.publish({
            type: "command.retrying",
            tenantId: job.data.tenantId,
            correlationId: job.data.correlationId,
            actorId: job.data.actor.userId,
            occurredAt: new Date().toISOString(),
            payload: {
              command: command.id,
              jobId: job.id,
              attempt: job.attemptsMade + 1
            }
          });
        }
        throw error;
      }
    },
    {
      connection: dependencies.connection,
      concurrency: dependencies.concurrency ?? Number(process.env.WORKER_CONCURRENCY ?? 8)
    }
  );

  worker.on("error", (error) => {
    process.stderr.write(
      JSON.stringify({ level: "error", event: "worker.error", error: error.message }) + "\n"
    );
  });

  return worker;
}
