import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test runner separato dalla config Lovable (niente TanStack Start/Nitro nei test unitari).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
