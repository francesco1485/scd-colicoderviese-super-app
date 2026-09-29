import chokidar, { type FSWatcher } from "chokidar";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AnyCommand } from "./BaseCommand.js";

type CommandConstructor = new () => AnyCommand;

interface LoadedCommand {
  command: AnyCommand;
  file: string;
  loadedAt: number;
}

export interface CommandDescriptor {
  id: string;
  name: string;
  version: string;
  executionMode: string;
  allowedRoles: readonly string[];
}

export class CommandRegistry {
  private readonly commands = new Map<string, LoadedCommand>();
  private readonly aliases = new Map<string, string>();
  private readonly fileCommands = new Map<string, string[]>();
  private watcher?: FSWatcher;

  public constructor(private readonly pluginDirectory: string) {}

  public async initialize(options: { watch?: boolean } = {}): Promise<void> {
    await this.scanDirectory();
    if (options.watch ?? true) this.startWatcher();
  }

  public get(commandIdOrName: string): AnyCommand {
    const direct = this.commands.get(commandIdOrName);
    if (direct) return direct.command;

    const versionedId = this.aliases.get(commandIdOrName);
    if (!versionedId) throw new Error(`Command not registered: ${commandIdOrName}`);

    const loaded = this.commands.get(versionedId);
    if (!loaded) throw new Error(`Command implementation missing: ${versionedId}`);
    return loaded.command;
  }

  public has(commandIdOrName: string): boolean {
    return this.commands.has(commandIdOrName) || this.aliases.has(commandIdOrName);
  }

  public list(): CommandDescriptor[] {
    return [...this.commands.values()]
      .map(({ command }) => ({
        id: command.id,
        name: command.name,
        version: command.version,
        executionMode: command.executionMode,
        allowedRoles: command.allowedRoles
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  public async close(): Promise<void> {
    await this.watcher?.close();
  }

  private async scanDirectory(): Promise<void> {
    const files = await this.walk(this.pluginDirectory);
    for (const file of files) {
      if (this.isLoadable(file)) await this.loadFile(file);
    }
  }

  private async walk(directory: string): Promise<string[]> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return [];
      throw error;
    }

    const result: string[] = [];
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) result.push(...(await this.walk(absolute)));
      else result.push(absolute);
    }
    return result;
  }

  private isLoadable(file: string): boolean {
    if (file.endsWith(".d.ts")) return false;
    return /\.(mjs|js|ts)$/.test(file);
  }

  private async loadFile(file: string): Promise<void> {
    if (!this.isLoadable(file)) return;
    const info = await stat(file);
    const url = `${pathToFileURL(file).href}?v=${info.mtimeMs}`;
    const module = (await import(url)) as { default?: CommandConstructor };
    if (!module.default) return;

    const instance = new module.default();
    this.assertCommand(instance);
    this.unregisterFile(file);

    this.commands.set(instance.id, { command: instance, file, loadedAt: Date.now() });
    this.aliases.set(instance.name, instance.id);
    this.fileCommands.set(file, [instance.id]);

    process.stdout.write(
      JSON.stringify({ level: "info", event: "command.loaded", command: instance.id, file }) + "\n"
    );
  }

  private unregisterFile(file: string): void {
    const ids = this.fileCommands.get(file) ?? [];
    for (const id of ids) {
      const old = this.commands.get(id);
      this.commands.delete(id);
      if (old && this.aliases.get(old.command.name) === id) this.aliases.delete(old.command.name);
    }
    this.fileCommands.delete(file);
  }

  private assertCommand(command: unknown): asserts command is AnyCommand {
    if (!command || typeof command !== "object") {
      throw new Error("Invalid plugin: command instance is missing");
    }
    const candidate = command as Partial<AnyCommand>;
    if (
      typeof candidate.name !== "string" ||
      typeof candidate.version !== "string" ||
      typeof candidate.execute !== "function" ||
      typeof candidate.rollback !== "function" ||
      typeof candidate.validate_schema !== "function"
    ) {
      throw new Error("Plugin does not satisfy BaseCommand contract");
    }
  }

  private startWatcher(): void {
    this.watcher = chokidar.watch(this.pluginDirectory, { ignoreInitial: true });
    this.watcher.on("add", (file) => void this.safeReload(file));
    this.watcher.on("change", (file) => void this.safeReload(file));
    this.watcher.on("unlink", (file) => this.unregisterFile(file));
  }

  private async safeReload(file: string): Promise<void> {
    try {
      await this.loadFile(file);
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          level: "error",
          event: "command.reload_failed",
          file,
          error: error instanceof Error ? error.message : String(error)
        }) + "\n"
      );
    }
  }
}
