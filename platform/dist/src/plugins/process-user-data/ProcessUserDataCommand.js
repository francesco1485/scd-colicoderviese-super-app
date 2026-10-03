import { z } from "zod";
import { BaseCommand } from "../../core/commands/BaseCommand.js";
const schema = z.object({
    userId: z.string().min(1),
    activities: z.array(z.object({
        type: z.string().min(1),
        durationSeconds: z.number().int().nonnegative(),
        completed: z.boolean()
    })).max(10000)
});
export default class ProcessUserDataCommand extends BaseCommand {
    name = "process-user-data";
    version = "1.0.0";
    schema = schema;
    allowedRoles = ["DIRECTION", "ADMIN", "SYSTEM"];
    async execute(input, context) {
        const completed = input.activities.filter((activity) => activity.completed).length;
        const totalDurationSeconds = input.activities.reduce((total, activity) => total + activity.durationSeconds, 0);
        const result = {
            userId: input.userId,
            totalActivities: input.activities.length,
            completedActivities: completed,
            completionRate: input.activities.length === 0 ? 0 : completed / input.activities.length,
            totalDurationSeconds
        };
        const key = `tenant:${context.tenantId}:user:${input.userId}:analytics`;
        await context.state.hashSet(key, {
            result: JSON.stringify(result),
            updatedAt: new Date().toISOString()
        });
        await context.events.publish({
            type: "user.data.processed",
            tenantId: context.tenantId,
            correlationId: context.correlationId,
            actorId: context.actor.userId,
            occurredAt: new Date().toISOString(),
            payload: result
        });
        return result;
    }
    async rollback(input, context) {
        await context.state.delete(`tenant:${context.tenantId}:user:${input.userId}:analytics`);
    }
}
//# sourceMappingURL=ProcessUserDataCommand.js.map