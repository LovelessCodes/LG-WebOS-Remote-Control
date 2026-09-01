import { defineConfig } from "rolldown";

const dev = process.env.ROLLDOWN_WATCH || process.env.ROLLUP_WATCH;

export default defineConfig({
  input: "src/lg-remote-control.ts",
  output: {
    dir: "dist",
    format: "es",
    minify: !dev,
  },
  shimMissingExports: true,
  checks: {
    importIsUndefined: false,
  },
});
