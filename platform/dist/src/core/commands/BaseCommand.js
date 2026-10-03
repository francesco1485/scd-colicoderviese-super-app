export class BaseCommand {
    executionMode = "async";
    allowedRoles = [
        "USER_BASE",
        "FAMILY",
        "ATHLETE",
        "MISTER",
        "STAFF",
        "MANAGER",
        "SECRETARIAT",
        "REGISTRATION",
        "TOURNAMENTS",
        "DIRECTION",
        "ADMIN",
        "SYSTEM"
    ];
    get id() {
        return `${this.name}@${this.version}`;
    }
    validate_schema(payload) {
        return this.schema.parse(payload);
    }
    authorize(context) {
        const granted = context.actor.roles.some((role) => this.allowedRoles.includes(role));
        if (!granted) {
            throw new Error(`Actor ${context.actor.userId} not authorized for ${this.id}`);
        }
    }
    async rollback(_input, _context, _reason) {
        // Override only when the command creates compensatable side effects.
    }
}
//# sourceMappingURL=BaseCommand.js.map