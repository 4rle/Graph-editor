import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const port = process.env.TEST_PORT || "8789",
  url = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    port,
    "--inspector-port",
    "0",
    "--log-level",
    "error",
  ],
  {
    cwd: process.cwd(),
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
for (const pipe of [child.stdout, child.stderr])
  pipe.on("data", (b) => (log = (log + b.toString()).slice(-20000)));
let exited = false;
child.on("exit", () => (exited = true));
try {
  let ready = false;
  for (let i = 0; i < 150 && !exited; i++) {
    try {
      const r = await fetch(url);
      if (r.ok && (await r.text()).includes("bootstrap.js")) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }
  if (!ready) throw Error("Workers local did not become ready:\n" + log);
  for (const script of [
    "browser-smoke",
    "browser-workflows",
    "browser-advanced",
    "browser-deployment",
  ]) {
    console.log(`Cloudflare runtime: ${script}`);
    await new Promise((resolve, reject) => {
      const test = spawn(process.execPath, [`tests/${script}.mjs`], {
        stdio: "inherit",
        env: { ...process.env, APP_URL: url },
      });
      test.on("error", reject);
      test.on("exit", (code) =>
        code === 0 ? resolve() : reject(Error(script + " failed: " + code)),
      );
    });
  }
  console.log("PASS production Cloudflare deployment verification");
} finally {
  if (!exited) {
    if (process.platform === "win32") child.kill();
    else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  }
}
