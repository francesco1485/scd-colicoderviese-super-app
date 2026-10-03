import type { Actor } from "../commands/BaseCommand.js";
import type { R20BridgeClient } from "../../adapters/R20BridgeClient.js";
export declare class R20AuthService {
    private readonly bridge;
    constructor(bridge: R20BridgeClient);
    validateSession(sessionToken: string): Promise<Actor>;
}
