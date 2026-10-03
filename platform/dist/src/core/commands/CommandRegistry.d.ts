import type { AnyCommand } from "./BaseCommand.js";
export interface CommandDescriptor {
    id: string;
    name: string;
    version: string;
    executionMode: string;
    allowedRoles: readonly string[];
}
export declare class CommandRegistry {
    private readonly pluginDirectory;
    private readonly commands;
    private readonly aliases;
    private readonly fileCommands;
    private watcher?;
    constructor(pluginDirectory: string);
    initialize(options?: {
        watch?: boolean;
    }): Promise<void>;
    get(commandIdOrName: string): AnyCommand;
    has(commandIdOrName: string): boolean;
    list(): CommandDescriptor[];
    close(): Promise<void>;
    private scanDirectory;
    private walk;
    private isLoadable;
    private loadFile;
    private unregisterFile;
    private assertCommand;
    private startWatcher;
    private safeReload;
}
