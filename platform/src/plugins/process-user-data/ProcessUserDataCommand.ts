import { z } from "zod";
import {
  BaseCommand,
  type CommandContext
} from "../../core/commands/BaseCommand.js";

const schema = z.object({
  userId: z.string().min(1),
  activities: z.array(
    z.object({
      type: z.string().min(1),
      durationSeconds: z.number().int().nonnegative(),
      completed: z.boolean()
    })
  ).max(10000)
});

type Input = z.infer<typeof schema>;

interface Result {
  userId: string;
  totalActivities: number;
  completedActivities: number;
  completionRate: number;
  totalDurationSeconds: number;
}

export default class ProcessUserDataCommand extends BaseCommand<Input, Result> {
  public readonly name = "process-user-data";
  public readonly version = "1.0.0";
  public readonly schema = schema;
  public override readonly allowedRoles = ["DIRECTION", "ADMIN", "SYSTEM"] as const;

  public async execute(input: Input, context: CommandContext): Promise<Result> {
    const completed = input.activities.filter((activity) => activity.completed).length;
    const totalDurationSeconds = input.activities.reduce(
      (total, activity) => total + activity.durationSeconds,
      0
    );

    const result: Result = {
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

  public override async rollback(input: Input, context: CommandContext): Promise<void> {
    await context.state.delete(
      `tenant:${context.tenantId}:user:${input.userId}:analytics`
    );
  }
}
