const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const storePath = path.join(dataDir, "rsvp.json");

function findExistingAsset(filePath) {
  if (fs.existsSync(filePath)) return filePath;

  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const candidates = [
    base,
    base.toLowerCase(),
    base.toUpperCase(),
  ];

  for (const candidate of candidates) {
    const candidatePath = path.join(dir, candidate);
    if (fs.existsSync(candidatePath)) return candidatePath;
  }

  return filePath;
}

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(
      storePath,
      JSON.stringify({ count: 0, submissions: [] }, null, 2),
      "utf8",
    );
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch {
    return { count: 0, submissions: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
}

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

function serveFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".mp3": "audio/mpeg",
      ".ico": "image/x-icon",
      ".json": "application/json; charset=utf-8",
    };
    const contentType = types[ext] || "application/octet-stream";
    fs.readFile(filePath, (err, data) => {
      if (err) {
        send(res, 404, "Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  } catch {
    send(res, 500, "Server error");
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/rsvp") {
    if (req.method === "GET") {
      const store = readStore();
      send(res, 200, JSON.stringify({ count: store.count }), "application/json; charset=utf-8");
      return;
    }

    if (req.method === "POST") {
      try {
        const payload = await parseBody(req);
        const store = readStore();
        store.count += 1;
        store.submissions.push({
          name: String(payload.name || "").slice(0, 120),
          attending: payload.attending === "no" ? "no" : "yes",
          guests: Number(payload.guests || 1),
          message: String(payload.message || "").slice(0, 500),
          language: "en",
          createdAt: new Date().toISOString(),
        });
        writeStore(store);
        send(res, 200, JSON.stringify({ count: store.count }), "application/json; charset=utf-8");
      } catch {
        send(res, 400, JSON.stringify({ error: "Invalid JSON" }), "application/json; charset=utf-8");
      }
      return;
    }

    send(res, 405, "Method Not Allowed");
    return;
  }

  const routes = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/script.js": "script.js",
    "/mariposatransparente.png": "mariposatransparente.png",
    "/sobretransparente.png": "sobretransparente.png",
    "/foto1.jpg": "foto1.jpg",
    "/foto2.jpg": "foto2.jpg",
    "/foto3.jpg": "foto3.jpg",
  };

  if (routes[pathname]) {
    serveFile(res, path.join(rootDir, routes[pathname]));
    return;
  }

  if (pathname.startsWith("/invitacion/") || pathname.startsWith("/invitación/")) {
    const normalizedPathname = pathname.replace(/^\/invitación\//, "/invitacion/");
    const assetPath = findExistingAsset(path.join(rootDir, normalizedPathname));
    serveFile(res, assetPath);
    return;
  }

  send(res, 404, "Not found");
});

server.listen(port, host, () => {
  console.log(`English quinceanera invitation running on http://${host}:${port}`);
});
