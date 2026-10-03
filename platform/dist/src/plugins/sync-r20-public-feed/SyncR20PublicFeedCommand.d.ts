import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
declare const schema: any;
type Input = z.infer<typeof schema>;
interface Result {
    cachedAt: string;
    items: number;
}
export default class SyncR20PublicFeedCommand extends BaseCommand<Input, Result> {
    readonly name = "sync-r20-public-feed";
    readonly version = "1.0.0";
    readonly schema: any;
    readonly allowedRoles: readonly ["DIRECTION", "ADMIN", "SYSTEM"];
    execute(input: Input, context: CommandContext): Promise<Result>;
}
export {};
