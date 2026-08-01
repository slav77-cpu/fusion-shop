import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setupEnv.ts"],
    globalSetup: ["./src/test/globalSetup.ts"],
    testTimeout: 15000,
    // Route tests share one Postgres test database and reset tables in
    // beforeEach — running files in parallel would race those resets.
    fileParallelism: false,
  },
});
