import type { FastifyRequest } from "fastify";
import type { Actor } from "../commands/BaseCommand.js";
import type { R20AuthService } from "./R20AuthService.js";
export declare class RequestAuth {
    private readonly r20;
    constructor(r20: R20AuthService);
    authenticate(request: FastifyRequest): Promise<Actor>;
}
