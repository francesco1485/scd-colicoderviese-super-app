import { Queue, QueueEvents } from "bullmq";
export const COMMAND_QUEUE = "scd-commands";
export function createCommandQueue(connection) {
    return new Queue(COMMAND_QUEUE, {
        connection,
        defaultJobOptions: {
            attempts: Number(process.env.MAX_COMMAND_ATTEMPTS ?? 3),
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 }
        }
    });
}
export function createCommandQueueEvents(connection) {
    return new QueueEvents(COMMAND_QUEUE, { connection });
}
//# sourceMappingURL=commandQueue.js.map