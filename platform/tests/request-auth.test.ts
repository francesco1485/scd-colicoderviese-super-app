import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import type { R20AuthService } from "../src/core/auth/R20AuthService.js";
import { RequestAuth } from "../src/core/auth/RequestAuth.js";

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

test("RequestAuth rejects development headers in production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAuthMode = process.env.AUTH_MODE;
  process.env.NODE_ENV = "production";
  process.env.AUTH_MODE = "development";

  try {
    const auth = new RequestAuth({
      validateSession: async () => ({
        userId: "r20-user",
        roles: ["USER_BASE"]
      })
    } as unknown as R20AuthService);
    const request = {
      headers: {
        "x-user-id": "attacker",
        "x-user-roles": "ADMIN"
      }
    } as unknown as FastifyRequest;

    await assert.rejects(auth.authenticate(request), /Authentication required/);
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnv);
    restoreEnvironment("AUTH_MODE", previousAuthMode);
  }
});

test("RequestAuth continues to validate R20 sessions in production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAuthMode = process.env.AUTH_MODE;
  process.env.NODE_ENV = "production";
  process.env.AUTH_MODE = "development";

  try {
    const auth = new RequestAuth({
      validateSession: async (session: string) => ({
        userId: `r20:${session}`,
        roles: ["USER_BASE"]
      })
    } as unknown as R20AuthService);
    const request = {
      headers: {
        "x-scd-session": "valid-session",
        "x-user-id": "attacker",
        "x-user-roles": "ADMIN"
      }
    } as unknown as FastifyRequest;

    assert.deepEqual(await auth.authenticate(request), {
      userId: "r20:valid-session",
      roles: ["USER_BASE"]
    });
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnv);
    restoreEnvironment("AUTH_MODE", previousAuthMode);
  }
});

test("RequestAuth keeps development headers available outside production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAuthMode = process.env.AUTH_MODE;
  process.env.NODE_ENV = "test";
  process.env.AUTH_MODE = "development";

  try {
    const auth = new RequestAuth({
      validateSession: async () => ({ userId: "r20-user", roles: ["USER_BASE"] })
    } as unknown as R20AuthService);
    const request = {
      headers: {
        "x-user-id": "dev-user",
        "x-user-roles": "ADMIN"
      }
    } as unknown as FastifyRequest;

    assert.deepEqual(await auth.authenticate(request), {
      userId: "dev-user",
      roles: ["ADMIN"]
    });
  } finally {
    restoreEnvironment("NODE_ENV", previousNodeEnv);
    restoreEnvironment("AUTH_MODE", previousAuthMode);
  }
});
