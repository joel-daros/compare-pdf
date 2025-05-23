import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true, // register apis (it, expect...) globally, so they can be used in tests without importing
    clearMocks: true,
    restoreMocks: true,
    exclude: [...configDefaults.exclude, "./lib/**/*"],
  },
});
