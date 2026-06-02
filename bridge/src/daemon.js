import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { daemonLogPath, DEFAULT_HOST, DEFAULT_IDLE_SECONDS, DEFAULT_PORT } from "./config.js";
import { ensureCloudflared } from "./deps.js";
import { startAssetServer } from "./server.js";
import { readLease, readServerState, readTunnelState, removeLease, removeServerState, removeTunnelState, writeLease } from "./state.js";
import { startTunnel } from "./tunnel.js";

export async function touchLease(options = {}) {
  const idleSeconds = Number(options.idleSeconds || DEFAULT_IDLE_SECONDS);
  const now = Date.now();
  const lease = {
    idleSeconds,
    touchedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + idleSeconds * 1000).toISOString()
  };
  await writeLease(lease);
  return lease;
}

export async function ensureBridgeRunning(options = {}) {
  const provider = options.provider || process.env.AGNES_TUNNEL_PROVIDER || "cloudflared";
  const port = Number(options.port || DEFAULT_PORT);
  const host = options.host || DEFAULT_HOST;
  const idleSeconds = Number(options.idleSeconds || DEFAULT_IDLE_SECONDS);

  await touchLease({ idleSeconds });

  if (provider === "cloudflared") {
    await ensureCloudflared({ install: options.installCloudflared ?? true });
  }

  if (await bridgeLooksReady()) {
    await touchLease({ idleSeconds });
    return bridgeStatus();
  }

  await startDaemonProcess({ provider, port, host, idleSeconds });
  await waitForReady(Number(options.timeoutMs || 45000));
  await touchLease({ idleSeconds });
  return bridgeStatus();
}

export async function runDaemon(options = {}) {
  const provider = options.provider || process.env.AGNES_TUNNEL_PROVIDER || "cloudflared";
  const port = Number(options.port || DEFAULT_PORT);
  const host = options.host || DEFAULT_HOST;
  const idleSeconds = Number(options.idleSeconds || DEFAULT_IDLE_SECONDS);

  if (provider === "cloudflared") {
    await ensureCloudflared({ install: options.installCloudflared ?? true });
  }

  await touchLease({ idleSeconds });
  const serverResult = await startAssetServer({ host, port });
  const tunnelProcess = await startTunnel({ provider, localUrl: serverResult.baseUrl });

  const stop = async () => {
    tunnelProcess.kill?.("SIGTERM");
    await removeTunnelState();
    await removeServerState();
    await removeLease();
    process.exit(0);
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  const timer = setInterval(async () => {
    const lease = await readLease();
    const expiresAt = lease?.expiresAt ? new Date(lease.expiresAt).getTime() : 0;
    if (!expiresAt || Date.now() >= expiresAt) {
      clearInterval(timer);
      await stop();
    }
  }, 5000);

  await new Promise((resolve) => tunnelProcess.on("exit", resolve));
  clearInterval(timer);
  await removeTunnelState();
  await removeServerState();
}

export async function stopBridge() {
  const server = await readServerState();
  const tunnel = await readTunnelState();

  for (const pid of [tunnel?.pid, server?.pid]) {
    if (pid && processAlive(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
      }
    }
  }

  await removeTunnelState();
  await removeServerState();
  await removeLease();
  return { stopped: true, serverPid: server?.pid || null, tunnelPid: tunnel?.pid || null };
}

async function startDaemonProcess(options) {
  await fs.promises.mkdir(path.dirname(daemonLogPath()), { recursive: true });
  const logFd = fs.openSync(daemonLogPath(), "a");
  const cliPath = fileURLToPath(new URL("../bin/agnes-bridge.js", import.meta.url));
  const child = spawn(process.execPath, [
    cliPath,
    "daemon",
    "--provider", options.provider,
    "--port", String(options.port),
    "--host", options.host,
    "--idle-seconds", String(options.idleSeconds)
  ], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: process.env,
    windowsHide: true
  });
  child.unref();
}

async function bridgeLooksReady() {
  const status = await bridgeStatus();
  if (!status.server || !status.tunnel?.publicUrl) return false;
  if (!status.server.pid || !processAlive(status.server.pid)) return false;
  if (!status.tunnel.pid || !processAlive(status.tunnel.pid)) return false;
  try {
    const response = await fetch(`${status.server.baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function bridgeStatus() {
  return {
    server: await readServerState(),
    tunnel: await readTunnelState(),
    lease: await readLease()
  };
}

async function waitForReady(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await bridgeLooksReady()) return;
    await sleep(500);
  }
  throw new Error(`Bridge did not become ready within ${timeoutMs}ms. See log: ${daemonLogPath()}`);
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}