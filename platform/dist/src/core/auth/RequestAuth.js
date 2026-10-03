const DEVELOPMENT_ROLES = new Set([
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
]);
export class RequestAuth {
    r20;
    constructor(r20) {
        this.r20 = r20;
    }
    async authenticate(request) {
        const session = request.headers["x-scd-session"];
        if (typeof session === "string" && session) {
            return this.r20.validateSession(session);
        }
        if (process.env.AUTH_MODE !== "development") {
            throw new Error("Authentication required");
        }
        const userId = String(request.headers["x-user-id"] ?? "dev-user");
        const requested = String(request.headers["x-user-roles"] ?? "ADMIN")
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter((value) => DEVELOPMENT_ROLES.has(value));
        return { userId, roles: requested.length ? requested : ["USER_BASE"] };
    }
}
//# sourceMappingURL=RequestAuth.js.map