import os from "node:os";
import path from "node:path";

export const APP_NAME = "agnes-local-bridge";
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = Number(process.env.AGNES_BRIDGE_PORT || 8787);
export const DEFAULT_TTL_SECONDS = Number(process.env.AGNES_ASSET_TTL_SECONDS || 3600);
export const DEFAULT_IDLE_SECONDS = Number(process.env.AGNES_BRIDGE_IDLE_SECONDS || 3600);

export function stateDir() {
  return process.env.AGNES_BRIDGE_STATE_DIR || path.join(os.homedir(), ".agnes-local-bridge");
}

export function registryPath() {
  return path.join(stateDir(), "assets.json");
}

export function serverStatePath() {
  return path.join(stateDir(), "server.json");
}

export function tunnelStatePath() {
  return path.join(stateDir(), "tunnel.json");
}

export function leasePath() {
  return path.join(stateDir(), "lease.json");
}

export function daemonLogPath() {
  return path.join(stateDir(), "daemon.log");
}