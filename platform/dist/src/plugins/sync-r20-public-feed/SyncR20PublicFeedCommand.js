import { z } from "zod";
import { BaseCommand } from "../../core/commands/BaseCommand.js";
import { R20BridgeClient } from "../../adapters/R20BridgeClient.js";
const schema = z.object({
    limit: z.number().int().min(1).max(100).default(40)
});
export default class SyncR20PublicFeedCommand extends BaseCommand {
    name = "sync-r20-public-feed";
    version = "1.0.0";
    schema = schema;
    allowedRoles = ["DIRECTION", "ADMIN", "SYSTEM"];
    async execute(input, context) {
        const bridge = new R20BridgeClient();
        const data = await bridge.call("public.feed", { limit: input.limit });
        const serialized = JSON.stringify(data);
        const cachedAt = new Date().toISOString();
        await context.state.set(`tenant:${context.tenantId}:r20:public-feed`, serialized, 600);
        const items = Array.isArray(data)
            ? data.length
            : typeof data === "object" && data !== null
                ? Object.keys(data).length
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
//# sourceMappingURL=SyncR20PublicFeedCommand.js.map