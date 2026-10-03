export class R20BridgeClient {
    endpoint;
    constructor(endpoint = process.env.R20_BRIDGE_URL ??
        "https://scd-colicoderviese-official-r21.onrender.com/api/scd") {
        this.endpoint = endpoint;
    }
    async call(action, payload = {}, sessionToken = "") {
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-scd-client": "command-platform"
            },
            body: JSON.stringify({ action, payload, sessionToken })
        });
        const raw = await response.text();
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            throw new Error(`R20 returned invalid JSON for ${action}`);
        }
        if (!response.ok || parsed.ok === false) {
            throw new Error(parsed.error ?? parsed.message ?? `R20 action failed: ${action}`);
        }
        if ("data" in parsed && parsed.data !== undefined)
            return parsed.data;
        return parsed;
    }
}
//# sourceMappingURL=R20BridgeClient.js.map