import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { createRuntime } from "../runtime/createRuntime.js";
import { R20BridgeClient } from "../adapters/R20BridgeClient.js";
import { R20AuthService } from "../core/auth/R20AuthService.js";
import { RequestAuth } from "../core/auth/RequestAuth.js";

const app = Fastify({ logger: true });
const runtime = await createRuntime();
const bridge = new R20BridgeClient();
const auth = new RequestAuth(new R20AuthService(bridge));

const allowedOrigins = (process.env.CORS_ORIGINS ?? "https://francesco1485.github.io")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin not allowed"), false);
  }
});

await app.register(swagger, {
  openapi: {
    info: {
      title: "SCD ColicoDerviese Command Platform",
      version: "22.0.0"
    }
  }
});

await app.register(swaggerUi, { routePrefix: "/docs" });

app.get("/health", async () => ({
  ok: true,
  service: "SCD Command Platform",
  version: "22.0.0",
  executionMode: runtime.executionMode,
  redisAvailable: runtime.redisAvailable,
  commands: runtime.registry.list().length,
  timestamp: new Date().toISOString()
}));

app.get("/v1/commands", async () => ({
  commands: runtime.registry.list()
}));

app.post<{ Params: { command: string }; Body: unknown }>(
  "/v1/commands/:command",
  async (request, reply) => {
    try {
      const actor = await auth.authenticate(request);
      const correlationHeader = request.headers["x-correlation-id"];
      const idempotencyHeader = request.headers["idempotency-key"];

      const submission: {
        command: string;
        payload: unknown;
        tenantId: string;
        actor: typeof actor;
        correlationId?: string;
        idempotencyKey?: string;
      } = {
        command: request.params.command,
        payload: request.body,
        tenantId: process.env.SCD_TENANT_ID ?? "scd-colicoderviese",
        actor
      };

      if (typeof correlationHeader === "string") submission.correlationId = correlationHeader;
      if (typeof idempotencyHeader === "string") submission.idempotencyKey = idempotencyHeader;

      const result = await runtime.executor.submit(submission);
      return reply.code(result.mode === "queued" ? 202 : 200).send(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: "Invalid command payload",
          issues: error.issues
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      const unauthorized =
        /authentication required|missing scd session|not authorized/i.test(message);

      request.log.error({ error: message, command: request.params.command }, "command failed");
      return reply.code(unauthorized ? 401 : 400).send({ ok: false, error: message });
    }
  }
);

app.get<{ Params: { id: string } }>("/v1/jobs/:id", async (request, reply) => {
  if (!runtime.queue) {
    return reply.code(503).send({
      ok: false,
      error: "Queue mode is not enabled. Set REDIS_URL and COMMAND_EXECUTION_MODE=queue."
    });
  }

  const job = await runtime.queue.getJob(request.params.id);
  if (!job) return reply.code(404).send({ ok: false, error: "Job not found" });

  return {
    ok: true,
    id: job.id,
    state: await job.getState(),
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason || null,
    attemptsMade: job.attemptsMade
  };
});

app.get("/v1/admin/operations", async (request, reply) => {
  try {
    const actor = await auth.authenticate(request);
    const allowed = actor.roles.some((role) => ["DIRECTION", "ADMIN", "SYSTEM"].includes(role));
    if (!allowed) return reply.code(403).send({ ok: false, error: "Direction role required" });

    const counts = runtime.queue
      ? await runtime.queue.getJobCounts("waiting", "active", "completed", "failed", "delayed")
      : { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };

    return {
      ok: true,
      executionMode: runtime.executionMode,
      queue: counts,
      commands: runtime.registry.list(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return reply.code(401).send({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

const port = Number(process.env.PORT ?? 10000);
await app.listen({ host: "0.0.0.0", port });

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "command platform shutting down");
  await app.close();
  await runtime.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
