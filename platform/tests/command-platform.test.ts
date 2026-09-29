import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CommandRegistry } from "../src/core/commands/CommandRegistry.js";
import { CommandExecutionService } from "../src/core/commands/CommandExecutionService.js";
import { MemoryEventBus } from "../src/core/events/MemoryEventBus.js";
import { MemoryKeyValueStore } from "../src/core/state/MemoryKeyValueStore.js";

const pluginDirectory = fileURLToPath(new URL("../src/plugins", import.meta.url));

test("CommandRegistry discovers all trusted plugins dynamically", async () => {
  const registry = new CommandRegistry(pluginDirectory);
  await registry.initialize({ watch: false });

  assert.equal(registry.has("process-user-data"), true);
  assert.equal(registry.has("sync-r20-public-feed"), true);
  assert.equal(registry.has("analyze-workflow-load"), true);
  assert.ok(registry.list().length >= 3);

  await registry.close();
});

test("CommandExecutionService validates, authorizes and executes inline commands", async () => {
  const registry = new CommandRegistry(pluginDirectory);
  await registry.initialize({ watch: false });

  const state = new MemoryKeyValueStore();
  const events = new MemoryEventBus();
  const executor = new CommandExecutionService(registry, state, events, null, "inline");

  const result = await executor.submit({
    command: "analyze-workflow-load",
    tenantId: "test",
    actor: { userId: "admin-1", roles: ["ADMIN"] },
    payload: {
      queued: 18,
      running: 5,
      failedLastHour: 2,
      p95DurationMs: 6200,
      activeOperators: 4
    }
  });

  assert.equal(result.mode, "inline");
  assert.equal(result.command, "analyze-workflow-load@1.0.0");
  assert.equal(typeof result.result, "object");
  assert.ok(events.events.some((event) => event.type === "workflow.load.analyzed"));

  await registry.close();
});

test("CommandExecutionService rejects unauthorized roles", async () => {
  const registry = new CommandRegistry(pluginDirectory);
  await registry.initialize({ watch: false });

  const executor = new CommandExecutionService(
    registry,
    new MemoryKeyValueStore(),
    new MemoryEventBus(),
    null,
    "inline"
  );

  await assert.rejects(
    executor.submit({
      command: "analyze-workflow-load",
      tenantId: "test",
      actor: { userId: "base-1", roles: ["USER_BASE"] },
      payload: {
        queued: 0,
        running: 0,
        failedLastHour: 0,
        p95DurationMs: 0,
        activeOperators: 1
      }
    }),
    /not authorized/
  );

  await registry.close();
});
