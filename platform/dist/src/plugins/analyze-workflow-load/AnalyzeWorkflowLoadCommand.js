import { z } from "zod";
import { BaseCommand } from "../../core/commands/BaseCommand.js";
const schema = z.object({
    queued: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
    failedLastHour: z.number().int().nonnegative(),
    p95DurationMs: z.number().nonnegative(),
    activeOperators: z.number().int().nonnegative()
});
export default class AnalyzeWorkflowLoadCommand extends BaseCommand {
    name = "analyze-workflow-load";
    version = "1.0.0";
    schema = schema;
    executionMode = "sync";
    allowedRoles = ["DIRECTION", "ADMIN", "SYSTEM"];
    async execute(input, context) {
        const queuePressure = Math.min(40, input.queued * 2);
        const runningPressure = Math.min(20, input.running);
        const failurePressure = Math.min(25, input.failedLastHour * 5);
        const latencyPressure = Math.min(15, input.p95DurationMs / 1000);
        const score = Math.round(queuePressure + runningPressure + failurePressure + latencyPressure);
        const signals = [];
        if (input.queued > 10)
            signals.push("queue_backlog");
        if (input.failedLastHour > 0)
            signals.push("recent_failures");
        if (input.p95DurationMs > 5000)
            signals.push("slow_p95");
        if (input.activeOperators === 0 && input.queued > 0)
            signals.push("unattended_work");
        const result = {
            pressure: score >= 65 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW",
            score,
            signals
        };
        await context.events.publish({
            type: "workflow.load.analyzed",
            tenantId: context.tenantId,
            correlationId: context.correlationId,
            actorId: context.actor.userId,
            occurredAt: new Date().toISOString(),
            payload: result
        });
        return result;
    }
}
//# sourceMappingURL=AnalyzeWorkflowLoadCommand.js.map