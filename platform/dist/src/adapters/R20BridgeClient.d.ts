export interface R20Envelope<T = unknown> {
    ok?: boolean;
    data?: T;
    error?: string;
    message?: string;
    [key: string]: unknown;
}
export declare class R20BridgeClient {
    private readonly endpoint;
    constructor(endpoint?: any);
    call<T>(action: string, payload?: Record<string, unknown>, sessionToken?: string): Promise<T>;
}
