import { Queue, QueueEvents } from "bullmq";
import type IORedis from "ioredis";
import type { CommandJobData } from "./types.js";

export const COMMAND_QUEUE = "scd-commands";

export function createCommandQueue(connection: IORedis): Queue<CommandJobData> {
  return new Queue<CommandJobData>(COMMAND_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: Number(process.env.MAX_COMMAND_ATTEMPTS ?? 3),
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 }
    }
  });
}

export function createCommandQueueEvents(connection: IORedis): QueueEvents {
  return new QueueEvents(COMMAND_QUEUE, { connection });
}
