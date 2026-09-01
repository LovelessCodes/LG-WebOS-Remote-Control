import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rolldown";
import serve from "rollup-plugin-serve";

const dev = process.env.ROLLDOWN_WATCH || process.env.ROLLUP_WATCH;

const serveopts = {
  contentBase: ["./dist"],
  host: "0.0.0.0",
  port: 5000,
  allowCrossOrigin: true,
  headers: {
    "Access-Control-Allow-Origin": "*",
  },
};

const plugins = [
  typescript(),
  babel({
    exclude: "node_modules/**",
    babelHelpers: "bundled",
  }),
  dev && serve(serveopts),
  !dev && terser(),
];

export default defineConfig({
  input: "src/lg-remote-control.ts",
  output: {
    dir: "dist",
    format: "es",
    minify: false,
  },
  shimMissingExports: true,
  checks: {
    importIsUndefined: false,
  },
  plugins: plugins.filter(Boolean),
});
