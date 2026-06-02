import { spawn } from "node:child_process";
import { readServerState, readTunnelState, removeTunnelState, saveTunnelState } from "./state.js";

export async function startTunnel(options = {}) {
  const provider = options.provider || "cloudflared";
  const serverState = await readServerState();
  const localUrl = options.localUrl || serverState?.baseUrl;
  if (!localUrl) {
    throw new Error("No local server found. Run `agnes-bridge serve` first, or pass --local-url.");
  }

  if (provider === "cloudflared") {
    return startCloudflared(localUrl);
  }
  if (provider === "ngrok") {
    return startNgrok(localUrl);
  }
  if (provider === "localtunnel") {
    return startLocaltunnel(localUrl);
  }
  throw new Error(`Unsupported tunnel provider: ${provider}`);
}

export async function getPublicBaseUrl() {
  if (process.env.AGNES_PUBLIC_BASE_URL) return process.env.AGNES_PUBLIC_BASE_URL;
  const state = await readTunnelState();
  return state?.publicUrl || null;
}

function startCloudflared(localUrl) {
  const child = spawn("cloudflared", ["tunnel", "--url", localUrl], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true
  });
  return watchTunnelProcess(child, "cloudflared", /https:\/\/[-a-zA-Z0-9.]+\.trycloudflare\.com/);
}

function startNgrok(localUrl) {
  const url = new URL(localUrl);
  const child = spawn("ngrok", ["http", url.port || "80", "--log=stdout"], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true
  });
  return watchTunnelProcess(child, "ngrok", /https:\/\/[-a-zA-Z0-9.]+\.ngrok-free\.app|https:\/\/[-a-zA-Z0-9.]+\.ngrok\.io/);
}

async function startLocaltunnel(localUrl) {
  const url = new URL(localUrl);
  const child = spawn("npx", ["--yes", "localtunnel", "--port", url.port || "80", "--local-host", url.hostname], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true
  });
  return watchTunnelProcess(child, "localtunnel", /https:\/\/[-a-zA-Z0-9.]+\.loca\.lt|https:\/\/[-a-zA-Z0-9.]+\.localtunnel\.me/);
}

function watchTunnelProcess(child, provider, urlPattern) {
  let settled = false;

  const handleChunk = async (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    const match = text.match(urlPattern);
    if (match && !settled) {
      settled = true;
      const state = {
        provider,
        publicUrl: match[0],
        pid: child.pid,
        startedAt: new Date().toISOString()
      };
      await saveTunnelState(state);
      console.log(JSON.stringify(state, null, 2));
    }
  };

  child.stdout.on("data", handleChunk);
  child.stderr.on("data", handleChunk);
  child.on("error", (error) => {
    settled = true;
    console.error(`Failed to start ${provider}: ${error.message}`);
    console.error(`Install ${provider}, choose another provider, or set AGNES_PUBLIC_BASE_URL manually.`);
    process.exitCode = 1;
  });
  child.on("exit", async (code, signal) => {
    await removeTunnelState();
    if (!settled) {
      console.error(`${provider} exited before exposing a URL. code=${code} signal=${signal || ""}`);
    }
    process.exitCode = code || 0;
  });

  return child;
}