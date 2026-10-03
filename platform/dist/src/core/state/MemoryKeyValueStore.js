export class MemoryKeyValueStore {
    values = new Map();
    hashes = new Map();
    async get(key) {
        const entry = this.values.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
            this.values.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds) {
        const entry = { value };
        if (ttlSeconds !== undefined)
            entry.expiresAt = Date.now() + ttlSeconds * 1000;
        this.values.set(key, entry);
    }
    async delete(key) {
        this.values.delete(key);
        this.hashes.delete(key);
    }
    async hashSet(key, values) {
        this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...values });
    }
    async hashGetAll(key) {
        return { ...(this.hashes.get(key) ?? {}) };
    }
}
//# sourceMappingURL=MemoryKeyValueStore.js.map