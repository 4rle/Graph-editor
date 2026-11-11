import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(fileURLToPath(new URL("./dist", import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".wasm": "application/wasm",
};
http
  .createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (name.split("/").some((p) => p.startsWith("."))) {
        res.writeHead(403);
        return res.end();
      }
      let target = path.resolve(
        root,
        "." + (name === "/" ? "/index.html" : name),
      );
      if (!target.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      let content;
      try {
        content = await readFile(target);
      } catch (err) {
        if (path.extname(name) || !req.headers.accept?.includes("text/html"))
          throw err;
        target = path.join(root, "index.html");
        content = await readFile(target);
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT || 5173), "0.0.0.0", () =>
    console.log("Serving production dist on " + (process.env.PORT || 5173)),
  );
