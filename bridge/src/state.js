import fs from "node:fs/promises";
import path from "node:path";
import { leasePath, registryPath, serverStatePath, stateDir, tunnelStatePath } from "./config.js";

export async function ensureStateDir() {
  await fs.mkdir(stateDir(), { recursive: true, mode: 0o700 });
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(file, data) {
  await ensureStateDir();
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tmp, file);
}

export async function readRegistry() {
  const data = await readJson(registryPath(), { assets: {} });
  data.assets ||= {};
  return data;
}

export async function writeRegistry(data) {
  await writeJson(registryPath(), data);
}

export async function saveServerState(state) {
  await writeJson(serverStatePath(), state);
}

export async function readServerState() {
  return readJson(serverStatePath(), null);
}

export async function removeServerState() {
  await fs.rm(serverStatePath(), { force: true });
}

export async function saveTunnelState(state) {
  await writeJson(tunnelStatePath(), state);
}

export async function readTunnelState() {
  return readJson(tunnelStatePath(), null);
}

export async function removeTunnelState() {
  await fs.rm(tunnelStatePath(), { force: true });
}

export async function writeLease(data) {
  await writeJson(leasePath(), data);
}

export async function readLease() {
  return readJson(leasePath(), null);
}

export async function removeLease() {
  await fs.rm(leasePath(), { force: true });
}

export async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export function resolveUserPath(input) {
  if (!input) throw new Error("Missing file path.");
  if (input.startsWith("~/")) {
    return path.join(process.env.HOME || "", input.slice(2));
  }
  return path.resolve(input);
}