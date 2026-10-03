import type { FastifyRequest } from "fastify";
import type { Actor, Role } from "../commands/BaseCommand.js";
import type { R20AuthService } from "./R20AuthService.js";

const DEVELOPMENT_ROLES = new Set<Role>([
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
  public constructor(private readonly r20: R20AuthService) {}

  public async authenticate(request: FastifyRequest): Promise<Actor> {
    const session = request.headers["x-scd-session"];
    if (typeof session === "string" && session) {
      return this.r20.validateSession(session);
    }

    if (
      process.env.AUTH_MODE !== "development" ||
      process.env.NODE_ENV === "production"
    ) {
      throw new Error("Authentication required");
    }

    const userId = String(request.headers["x-user-id"] ?? "dev-user");
    const requested = String(request.headers["x-user-roles"] ?? "ADMIN")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((value): value is Role => DEVELOPMENT_ROLES.has(value as Role));

    return { userId, roles: requested.length ? requested : ["USER_BASE"] };
  }
}
