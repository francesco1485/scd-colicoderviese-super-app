import { fileURLToPath } from "node:url";
import { CommandRegistry } from "../core/commands/CommandRegistry.js";
import { RedisEventBus } from "../core/events/RedisEventBus.js";
import { createRedisConnection } from "../core/queue/connection.js";
import { RedisKeyValueStore } from "../core/state/RedisKeyValueStore.js";
import { createCommandWorker } from "./createCommandWorker.js";
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
const pluginDirectory = process.env.PLUGIN_DIR ??
    fileURLToPath(new URL("../plugins", import.meta.url));
const registry = new CommandRegistry(pluginDirectory);
await registry.initialize({ watch: process.env.PLUGIN_HOT_RELOAD === "true" });
const state = new RedisKeyValueStore(stateConnection);
const events = new RedisEventBus(stateConnection);
const worker = createCommandWorker({
    connection,
    registry,
    state,
    events,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 8)
});
let closing = false;
async function shutdown(signal) {
    if (closing)
        return;
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
process.stdout.write(JSON.stringify({
    level: "info",
    event: "worker.ready",
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 8),
    commands: registry.list().map((command) => command.id)
}) + "\n");
//# sourceMappingURL=commandWorker.js.map