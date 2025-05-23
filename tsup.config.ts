import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entry: ["src/index.ts"], // Entry point for the application
  outDir: "lib", // Output directory for the compiled files
  treeshake: true, // We want to tree-shake the code to reduce the bundle size
  sourcemap: true, // Generate source maps for easier debugging
  dts: true, // Generate TypeScript declaration files
  minify: false, // Too small to justify minifying
  clean: true, // Clean the output directory before each build
  format: ["esm", "cjs"],
  platform: "node",
  target: "es2022",
}));
