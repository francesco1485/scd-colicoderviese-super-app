import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
declare const schema: any;
type Input = z.infer<typeof schema>;
interface Result {
    userId: string;
    totalActivities: number;
    completedActivities: number;
    completionRate: number;
    totalDurationSeconds: number;
}
export default class ProcessUserDataCommand extends BaseCommand<Input, Result> {
    readonly name = "process-user-data";
    readonly version = "1.0.0";
    readonly schema: any;
    readonly allowedRoles: readonly ["DIRECTION", "ADMIN", "SYSTEM"];
    execute(input: Input, context: CommandContext): Promise<Result>;
    rollback(input: Input, context: CommandContext): Promise<void>;
}
export {};
