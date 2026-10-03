import chokidar from "chokidar";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
export class CommandRegistry {
    pluginDirectory;
    commands = new Map();
    aliases = new Map();
    fileCommands = new Map();
    watcher;
    constructor(pluginDirectory) {
        this.pluginDirectory = pluginDirectory;
    }
    async initialize(options = {}) {
        await this.scanDirectory();
        if (options.watch ?? true)
            this.startWatcher();
    }
    get(commandIdOrName) {
        const direct = this.commands.get(commandIdOrName);
        if (direct)
            return direct.command;
        const versionedId = this.aliases.get(commandIdOrName);
        if (!versionedId)
            throw new Error(`Command not registered: ${commandIdOrName}`);
        const loaded = this.commands.get(versionedId);
        if (!loaded)
            throw new Error(`Command implementation missing: ${versionedId}`);
        return loaded.command;
    }
    has(commandIdOrName) {
        return this.commands.has(commandIdOrName) || this.aliases.has(commandIdOrName);
    }
    list() {
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
    async close() {
        await this.watcher?.close();
    }
    async scanDirectory() {
        const files = await this.walk(this.pluginDirectory);
        for (const file of files) {
            if (this.isLoadable(file))
                await this.loadFile(file);
        }
    }
    async walk(directory) {
        let entries;
        try {
            entries = await readdir(directory, { withFileTypes: true });
        }
        catch (error) {
            const code = error.code;
            if (code === "ENOENT")
                return [];
            throw error;
        }
        const result = [];
        for (const entry of entries) {
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory())
                result.push(...(await this.walk(absolute)));
            else
                result.push(absolute);
        }
        return result;
    }
    isLoadable(file) {
        if (file.endsWith(".d.ts"))
            return false;
        return /\.(mjs|js|ts)$/.test(file);
    }
    async loadFile(file) {
        if (!this.isLoadable(file))
            return;
        const info = await stat(file);
        const url = `${pathToFileURL(file).href}?v=${info.mtimeMs}`;
        const module = (await import(url));
        if (!module.default)
            return;
        const instance = new module.default();
        this.assertCommand(instance);
        this.unregisterFile(file);
        this.commands.set(instance.id, { command: instance, file, loadedAt: Date.now() });
        this.aliases.set(instance.name, instance.id);
        this.fileCommands.set(file, [instance.id]);
        process.stdout.write(JSON.stringify({ level: "info", event: "command.loaded", command: instance.id, file }) + "\n");
    }
    unregisterFile(file) {
        const ids = this.fileCommands.get(file) ?? [];
        for (const id of ids) {
            const old = this.commands.get(id);
            this.commands.delete(id);
            if (old && this.aliases.get(old.command.name) === id)
                this.aliases.delete(old.command.name);
        }
        this.fileCommands.delete(file);
    }
    assertCommand(command) {
        if (!command || typeof command !== "object") {
            throw new Error("Invalid plugin: command instance is missing");
        }
        const candidate = command;
        if (typeof candidate.name !== "string" ||
            typeof candidate.version !== "string" ||
            typeof candidate.execute !== "function" ||
            typeof candidate.rollback !== "function" ||
            typeof candidate.validate_schema !== "function") {
            throw new Error("Plugin does not satisfy BaseCommand contract");
        }
    }
    startWatcher() {
        this.watcher = chokidar.watch(this.pluginDirectory, { ignoreInitial: true });
        this.watcher.on("add", (file) => void this.safeReload(file));
        this.watcher.on("change", (file) => void this.safeReload(file));
        this.watcher.on("unlink", (file) => this.unregisterFile(file));
    }
    async safeReload(file) {
        try {
            await this.loadFile(file);
        }
        catch (error) {
            process.stderr.write(JSON.stringify({
                level: "error",
                event: "command.reload_failed",
                file,
                error: error instanceof Error ? error.message : String(error)
            }) + "\n");
        }
    }
}
//# sourceMappingURL=CommandRegistry.js.map