import { Queue, QueueEvents } from "bullmq";
import type { Redis } from "ioredis";
import type { CommandJobData } from "./types.js";
export declare const COMMAND_QUEUE = "scd-commands";
export declare function createCommandQueue(connection: Redis): Queue<CommandJobData>;
export declare function createCommandQueueEvents(connection: Redis): QueueEvents;
