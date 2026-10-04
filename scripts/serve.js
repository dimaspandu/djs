import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.cwd(), process.argv[2] || "src");
const port = Number(process.argv[3] || 8080);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8"
};

if (!fs.existsSync(targetDir)) {
  console.error(`Serving directory not found: ${targetDir}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(req.url.split("?")[0]);
  const relative = requested === "/" ? "test.html" : requested.replace(/^\/+/, "");
  const filePath = path.resolve(targetDir, relative);

  if (filePath !== targetDir && !filePath.startsWith(targetDir + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
});

server.on("error", (err) => {
  console.error(`Server failed: ${err.message}`);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`DJS browser test: http://localhost:${port}/test.html`);
  console.log(`  Serving: ${targetDir}`);
});