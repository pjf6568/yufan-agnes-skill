import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_TTL_SECONDS } from "./config.js";
import { pathExists, readRegistry, resolveUserPath, writeRegistry } from "./state.js";

const MIME_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".avif", "image/avif"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
  [".bmp", "image/bmp"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".m4v", "video/x-m4v"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"]
]);

export function mimeTypeFor(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

export async function registerAsset(filePath, options = {}) {
  const absolutePath = resolveUserPath(filePath);
  if (!(await pathExists(absolutePath))) {
    throw new Error(`File does not exist: ${absolutePath}`);
  }

  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${absolutePath}`);
  }

  const ttlSeconds = Number(options.ttlSeconds || DEFAULT_TTL_SECONDS);
  const token = crypto.randomBytes(18).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + ttlSeconds * 1000).toISOString();
  const registry = await readRegistry();

  registry.assets[token] = {
    path: absolutePath,
    basename: path.basename(absolutePath),
    mimeType: mimeTypeFor(absolutePath),
    size: stat.size,
    createdAt: new Date(now).toISOString(),
    expiresAt
  };

  await writeRegistry(pruneExpired(registry));
  return { token, ...registry.assets[token] };
}

export async function getAsset(token) {
  const registry = await readRegistry();
  const asset = registry.assets[token];
  if (!asset) return null;
  if (new Date(asset.expiresAt).getTime() <= Date.now()) {
    delete registry.assets[token];
    await writeRegistry(registry);
    return null;
  }
  return asset;
}

export async function listAssets() {
  const registry = pruneExpired(await readRegistry());
  await writeRegistry(registry);
  return Object.entries(registry.assets).map(([token, asset]) => ({ token, ...asset }));
}

export async function clearExpiredAssets() {
  const before = await readRegistry();
  const after = pruneExpired(before);
  await writeRegistry(after);
  return Object.keys(before.assets).length - Object.keys(after.assets).length;
}

function pruneExpired(registry) {
  const now = Date.now();
  for (const [token, asset] of Object.entries(registry.assets || {})) {
    if (new Date(asset.expiresAt).getTime() <= now) {
      delete registry.assets[token];
    }
  }
  return registry;
}