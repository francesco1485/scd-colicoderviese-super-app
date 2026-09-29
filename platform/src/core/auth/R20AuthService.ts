import type { Actor, Role } from "../commands/BaseCommand.js";
import type { R20BridgeClient } from "../../adapters/R20BridgeClient.js";

interface R20UserLike {
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  staff?: boolean;
  direction?: boolean;
  permissions?: Record<string, unknown>;
  user?: R20UserLike;
}

const ROLE_MAP: Record<string, Role> = {
  USER: "USER_BASE",
  USER_BASE: "USER_BASE",
  FAMILY: "FAMILY",
  FAMIGLIA: "FAMILY",
  ATHLETE: "ATHLETE",
  ATLETA: "ATHLETE",
  MISTER: "MISTER",
  COACH: "MISTER",
  STAFF: "STAFF",
  DIRIGENTE: "MANAGER",
  MANAGER: "MANAGER",
  SEGRETERIA: "SECRETARIAT",
  SECRETARIAT: "SECRETARIAT",
  TESSERAMENTI: "REGISTRATION",
  REGISTRATION: "REGISTRATION",
  TORNEI: "TOURNAMENTS",
  TOURNAMENTS: "TOURNAMENTS",
  DIREZIONE: "DIRECTION",
  DIRECTION: "DIRECTION",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM"
};

function mapRole(value: string): Role | null {
  return ROLE_MAP[value.trim().toUpperCase()] ?? null;
}

export class R20AuthService {
  public constructor(private readonly bridge: R20BridgeClient) {}

  public async validateSession(sessionToken: string): Promise<Actor> {
    if (!sessionToken) throw new Error("Missing SCD session token");

    const raw = await this.bridge.call<R20UserLike>(
      "auth.validate",
      {},
      sessionToken
    );

    const source = raw.user ?? raw;
    const roles = new Set<Role>();

    for (const value of source.roles ?? []) {
      const mapped = mapRole(value);
      if (mapped) roles.add(mapped);
    }

    if (source.role) {
      const mapped = mapRole(source.role);
      if (mapped) roles.add(mapped);
    }

    if (source.staff) roles.add("STAFF");
    if (source.direction || source.permissions?.direction === true) roles.add("DIRECTION");
    if (roles.size === 0) roles.add("USER_BASE");

    const userId = String(source.userId ?? source.id ?? source.email ?? "");
    if (!userId) throw new Error("R20 session does not contain a user identity");

    const actor: Actor = { userId, roles: [...roles] };
    if (source.email) actor.email = source.email;
    return actor;
  }
}
