import fs from "node:fs";
import http from "node:http";
import { DEFAULT_HOST, DEFAULT_PORT } from "./config.js";
import { getAsset } from "./assets.js";
import { saveServerState } from "./state.js";

export function assetUrl(baseUrl, token) {
  return `${String(baseUrl).replace(/\/$/, "")}/assets/${encodeURIComponent(token)}`;
}

export async function startAssetServer(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
      if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health") {
        if (req.method === "HEAD") {
          res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          return res.end();
        }
        return sendJson(res, 200, { ok: true, service: "agnes-local-bridge" });
      }

      const match = url.pathname.match(/^\/assets\/([^/]+)$/);
      if ((req.method !== "GET" && req.method !== "HEAD") || !match) {
        return sendJson(res, 404, { error: "Not found" });
      }

      const asset = await getAsset(decodeURIComponent(match[1]));
      if (!asset) {
        return sendJson(res, 404, { error: "Asset not found or expired" });
      }

      res.writeHead(200, {
        "content-type": asset.mimeType,
        "cache-control": "no-store",
        "content-length": asset.size
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(asset.path).pipe(res);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const baseUrl = `http://${host}:${server.address().port}`;
  await saveServerState({ host, port: server.address().port, baseUrl, pid: process.pid, startedAt: new Date().toISOString() });
  return { server, host, port: server.address().port, baseUrl };
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body)}\n`);
}