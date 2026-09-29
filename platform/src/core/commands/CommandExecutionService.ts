import { createHash, randomUUID } from "node:crypto";
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

export class CommandExecutionService {
  public constructor(
    private readonly registry: CommandRegistry,
    private readonly state: KeyValueStore,
    private readonly events: EventBus,
    private readonly queue: Queue<CommandJobData> | null,
    private readonly defaultMode: "inline" | "queue" = "inline"
  ) {}

  public async submit(request: SubmitCommandRequest): Promise<CommandSubmission> {
    const command = this.registry.get(request.command);
    const input = command.validate_schema(request.payload);
    const correlationId = request.correlationId ?? randomUUID();
    const controller = new AbortController();

    const context: CommandContext = {
      tenantId: request.tenantId,
      actor: request.actor,
      correlationId,
      state: this.state,
      events: this.events,
      signal: controller.signal
    };
    if (request.causationId !== undefined) context.causationId = request.causationId;
    if (request.idempotencyKey !== undefined) context.idempotencyKey = request.idempotencyKey;

    command.authorize(context);

    const useQueue =
      command.executionMode === "async" &&
      this.defaultMode === "queue" &&
      this.queue !== null;

    if (!useQueue) {
      await this.events.publish({
        type: "command.started",
        tenantId: request.tenantId,
        correlationId,
        actorId: request.actor.userId,
        occurredAt: new Date().toISOString(),
        payload: { command: command.id, mode: "inline" }
      });

      try {
        const result = await command.execute(input, context);
        await this.events.publish({
          type: "command.completed",
          tenantId: request.tenantId,
          correlationId,
          actorId: request.actor.userId,
          occurredAt: new Date().toISOString(),
          payload: { command: command.id, mode: "inline" }
        });
        return { accepted: true, mode: "inline", command: command.id, correlationId, result };
      } catch (error) {
        await command.rollback(input, context, error);
        await this.events.publish({
          type: "command.failed",
          tenantId: request.tenantId,
          correlationId,
          actorId: request.actor.userId,
          occurredAt: new Date().toISOString(),
          payload: {
            command: command.id,
            mode: "inline",
            error: error instanceof Error ? error.message : String(error)
          }
        });
        throw error;
      }
    }

    const idempotencyKey = request.idempotencyKey ?? randomUUID();
    const jobId = createHash("sha256")
      .update(`${request.tenantId}|${command.id}|${idempotencyKey}`)
      .digest("hex");

    const previous = await this.state.get(`command:idempotency:${jobId}`);
    if (previous) {
      return {
        accepted: true,
        mode: "queued",
        command: command.id,
        correlationId,
        jobId: previous
      };
    }

    const data: CommandJobData = {
      command: command.id,
      payload: request.payload,
      tenantId: request.tenantId,
      actor: request.actor,
      correlationId,
      idempotencyKey,
      acceptedAt: new Date().toISOString()
    };
    if (request.causationId !== undefined) data.causationId = request.causationId;

    const job = await this.queue.add(command.name, data, { jobId });
    await this.state.set(`command:idempotency:${jobId}`, String(job.id), 86400);

    await this.events.publish({
      type: "command.accepted",
      tenantId: request.tenantId,
      correlationId,
      actorId: request.actor.userId,
      occurredAt: new Date().toISOString(),
      payload: { command: command.id, jobId: job.id }
    });

    return {
      accepted: true,
      mode: "queued",
      command: command.id,
      correlationId,
      jobId: String(job.id)
    };
  }
}
