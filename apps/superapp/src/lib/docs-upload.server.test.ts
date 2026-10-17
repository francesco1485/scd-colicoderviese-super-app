import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  postToArchive,
  sha256Hex,
  signUpload,
  uploadConfig,
  type UploadMeta,
} from "./docs-upload.server";

const SECRET = "s".repeat(40);
const URL_OK = "https://hook.eu2.make.com/abcdEFGH1234";
const meta: UploadMeta = {
  v: 1,
  kind: "FOTOTESSERA",
  personRef: "00000000-0000-4000-8000-000000000001",
  folderHint: "Prova_Bimbo",
  fileName: "fototessera_2026-10-17.jpg",
  mime: "image/jpeg",
  size: 4,
  sha256: "",
  requestRef: null,
};

describe("upload config", () => {
  it("is off without a Make hook URL or with a short secret", () => {
    expect(uploadConfig({})).toBeNull();
    expect(
      uploadConfig({
        SCD_DOCS_UPLOAD_WEBHOOK_URL: URL_OK,
        SCD_DOCS_UPLOAD_SECRET: "short",
      }),
    ).toBeNull();
    expect(
      uploadConfig({
        SCD_DOCS_UPLOAD_WEBHOOK_URL: "http://hook.eu2.make.com/abcdEFGH1234",
        SCD_DOCS_UPLOAD_SECRET: SECRET,
      }),
    ).toBeNull();
    expect(
      uploadConfig({
        SCD_DOCS_UPLOAD_WEBHOOK_URL: "https://evil.example.com/hook",
        SCD_DOCS_UPLOAD_SECRET: SECRET,
      }),
    ).toBeNull();
    expect(
      uploadConfig({
        SCD_DOCS_UPLOAD_WEBHOOK_URL: URL_OK,
        SCD_DOCS_UPLOAD_SECRET: SECRET,
      }),
    ).toEqual({ url: URL_OK, secret: SECRET });
  });
});

describe("postToArchive", () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const m = { ...meta, sha256: sha256Hex(bytes) };

  it("signs timestamp, file hash and meta with HMAC-SHA256 and never sends the secret", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchImpl = async (url: string, init?: RequestInit) => {
      seen = { url, init: init ?? {} };
      return new Response(
        JSON.stringify({ ok: true, driveFileId: "1AbCdEfGhIjKlMnOp" }),
        { status: 200 },
      );
    };
    const out = await postToArchive(
      { url: URL_OK, secret: SECRET },
      m,
      bytes,
      fetchImpl,
      () => 1_700_000_000_000,
    );
    expect(out).toEqual({ ok: true, driveFileId: "1AbCdEfGhIjKlMnOp" });
    expect(seen!.url).toBe(URL_OK);
    const h = seen!.init.headers as Record<string, string>;
    expect(h["X-SCD-Timestamp"]).toBe("1700000000");
    const expected = createHmac("sha256", SECRET)
      .update(`1700000000.${m.sha256}.${JSON.stringify(m)}`)
      .digest("hex");
    expect(h["X-SCD-Signature"]).toBe(`sha256=${expected}`);
    expect(signUpload(SECRET, 1700000000, m.sha256, JSON.stringify(m))).toBe(
      expected,
    );
    const form = seen!.init.body as FormData;
    expect(form.get("meta")).toBe(JSON.stringify(m));
    expect(form.get("file")).toBeInstanceOf(Blob);
    expect(JSON.stringify(h)).not.toContain(SECRET);
    expect(String(form.get("meta"))).not.toContain(SECRET);
  });

  it("fails closed on HTTP errors, network errors and answers without a valid Drive id", async () => {
    const cfg = { url: URL_OK, secret: SECRET };
    expect(
      await postToArchive(
        cfg,
        m,
        bytes,
        async () => new Response("no", { status: 500 }),
      ),
    ).toEqual({ ok: false, code: "ARCHIVE_FAILED" });
    expect(
      await postToArchive(cfg, m, bytes, async () => {
        throw new Error("down");
      }),
    ).toEqual({ ok: false, code: "ARCHIVE_FAILED" });
    expect(
      await postToArchive(
        cfg,
        m,
        bytes,
        async () =>
          new Response(JSON.stringify({ ok: true, driveFileId: "../x" })),
      ),
    ).toEqual({ ok: false, code: "ARCHIVE_FAILED" });
    expect(
      await postToArchive(cfg, m, bytes, async () => new Response("not json")),
    ).toEqual({ ok: false, code: "ARCHIVE_FAILED" });
  });
});
