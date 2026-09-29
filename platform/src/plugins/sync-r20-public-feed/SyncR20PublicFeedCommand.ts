import { z } from "zod";
import {
  BaseCommand,
  type CommandContext
} from "../../core/commands/BaseCommand.js";
import { R20BridgeClient } from "../../adapters/R20BridgeClient.js";

const schema = z.object({
  limit: z.number().int().min(1).max(100).default(40)
});

type Input = z.infer<typeof schema>;

interface Result {
  cachedAt: string;
  items: number;
}

export default class SyncR20PublicFeedCommand extends BaseCommand<Input, Result> {
  public readonly name = "sync-r20-public-feed";
  public readonly version = "1.0.0";
  public readonly schema = schema;
  public override readonly allowedRoles = ["DIRECTION", "ADMIN", "SYSTEM"] as const;

  public async execute(input: Input, context: CommandContext): Promise<Result> {
    const bridge = new R20BridgeClient();
    const data = await bridge.call<unknown>("public.feed", { limit: input.limit });
    const serialized = JSON.stringify(data);
    const cachedAt = new Date().toISOString();

    await context.state.set(
      `tenant:${context.tenantId}:r20:public-feed`,
      serialized,
      600
    );

    const items = Array.isArray(data)
      ? data.length
      : typeof data === "object" && data !== null
        ? Object.keys(data as Record<string, unknown>).length
        : 1;

    await context.events.publish({
      type: "r20.public_feed.synced",
      tenantId: context.tenantId,
      correlationId: context.correlationId,
      actorId: context.actor.userId,
      occurredAt: cachedAt,
      payload: { items }
    });

    return { cachedAt, items };
  }
}
