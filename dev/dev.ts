/*
 * One-command development environment: rebuild the card on change and serve
 * dev/preview.html, which reloads itself when dist/lg-remote-control.js changes.
 *
 *   bun run dev
 *
 * Ctrl+C stops both processes.
 */
import { spawn } from "node:child_process";

const windows = process.platform === "win32";
const build = spawn("bun", ["run", "start"], { stdio: "inherit", shell: windows });
const server = spawn("bun", ["dev/serve.ts"], { stdio: "inherit", shell: windows });

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  build.kill();
  server.kill();
  process.exit(code);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

build.on("exit", (code) => {
  if (!stopping) {
    console.error(`build watcher exited (${code ?? "signal"})`);
    stop(code ?? 1);
  }
});
server.on("exit", (code) => {
  if (!stopping) {
    console.error(`preview server exited (${code ?? "signal"})`);
    stop(code ?? 1);
  }
});

console.log("dev: watching src/ and serving dev/preview.html");
