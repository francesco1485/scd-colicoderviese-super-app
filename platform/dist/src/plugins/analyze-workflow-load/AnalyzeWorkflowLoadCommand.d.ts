import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
declare const schema: any;
type Input = z.infer<typeof schema>;
interface Result {
    pressure: "LOW" | "MEDIUM" | "HIGH";
    score: number;
    signals: string[];
}
export default class AnalyzeWorkflowLoadCommand extends BaseCommand<Input, Result> {
    readonly name = "analyze-workflow-load";
    readonly version = "1.0.0";
    readonly schema: any;
    readonly executionMode: "sync";
    readonly allowedRoles: readonly ["DIRECTION", "ADMIN", "SYSTEM"];
    execute(input: Input, context: CommandContext): Promise<Result>;
}
export {};
