export interface R20Envelope<T = unknown> {
  ok?: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export class R20BridgeClient {
  public constructor(
    private readonly endpoint =
      process.env.R20_BRIDGE_URL ??
      "https://scd-colicoderviese-official-r21.onrender.com/api/scd"
  ) {}

  public async call<T>(
    action: string,
    payload: Record<string, unknown> = {},
    sessionToken = ""
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scd-client": "command-platform"
      },
      body: JSON.stringify({ action, payload, sessionToken })
    });

    const raw = await response.text();
    let parsed: R20Envelope<T>;
    try {
      parsed = JSON.parse(raw) as R20Envelope<T>;
    } catch {
      throw new Error(`R20 returned invalid JSON for ${action}`);
    }

    if (!response.ok || parsed.ok === false) {
      throw new Error(parsed.error ?? parsed.message ?? `R20 action failed: ${action}`);
    }

    if ("data" in parsed && parsed.data !== undefined) return parsed.data;
    return parsed as T;
  }
}
