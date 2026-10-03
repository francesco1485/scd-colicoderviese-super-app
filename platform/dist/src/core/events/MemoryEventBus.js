export class MemoryEventBus {
    events = [];
    async publish(event) {
        this.events.push(event);
        return String(this.events.length);
    }
}
//# sourceMappingURL=MemoryEventBus.js.map