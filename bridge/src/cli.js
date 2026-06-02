import { ensureBridgeRunning, runDaemon, stopBridge } from "./daemon.js";
import { listAssets, clearExpiredAssets } from "./assets.js";
import { startAssetServer } from "./server.js";
import { startTunnel } from "./tunnel.js";
import { readServerState, readTunnelState, ensureStateDir } from "./state.js";
import { ensureCloudflared, commandExists, platformInstallSummary } from "./deps.js";
import { stateDir } from "./config.js";

export async function main(args) {
  const command = args[0] || "help";

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "ensure") {
    const options = parseOptions(args.slice(1));
    const result = await ensureBridgeRunning(options);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "expose") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Usage: agnes-bridge expose <file-path>");
      process.exitCode = 1;
      return;
    }
    const options = parseOptions(args.slice(2));
    const { exposeLocalFile } = await import("./media.js");
    const result = await exposeLocalFile(filePath, options);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "serve") {
    const options = parseOptions(args.slice(1));
    const result = await startAssetServer(options);
    console.log(`Asset server running on ${result.baseUrl}`);
    console.log("Press Ctrl+C to stop.");
    await new Promise(() => {});
    return;
  }

  if (command === "tunnel") {
    const options = parseOptions(args.slice(1));
    await startTunnel(options);
    return;
  }

  if (command === "daemon") {
    const options = parseOptions(args.slice(1));
    await runDaemon(options);
    return;
  }

  if (command === "stop") {
    const result = await stopBridge();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "status") {
    const status = {
      server: await readServerState(),
      tunnel: await readTunnelState(),
      assets: await listAssets(),
      stateDir: stateDir()
    };
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (command === "doctor") {
    await ensureStateDir();
    const cloudflared = await commandExists("cloudflared");
    const ngrok = await commandExists("ngrok");
    console.log(JSON.stringify({
      stateDir: stateDir(),
      cloudflared,
      ngrok,
      platform: platformInstallSummary()
    }, null, 2));
    return;
  }

  if (command === "cleanup") {
    const removed = await clearExpiredAssets();
    console.log(JSON.stringify({ removed }, null, 2));
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port") {
      options.port = Number(args[++i]);
    } else if (arg === "--host") {
      options.host = args[++i];
    } else if (arg === "--provider") {
      options.provider = args[++i];
    } else if (arg === "--idle-seconds") {
      options.idleSeconds = Number(args[++i]);
    } else if (arg === "--ttl-seconds") {
      options.ttlSeconds = Number(args[++i]);
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(args[++i]);
    } else if (arg === "--public-base-url") {
      options.publicBaseUrl = args[++i];
    } else if (arg === "--local-url") {
      options.localUrl = args[++i];
    } else if (arg === "--no-install-cloudflared") {
      options.installCloudflared = false;
    }
  }
  return options;
}

function printHelp() {
  console.log(`
agnes-bridge - Local image to URL bridge for Agnes AI

Usage:
  agnes-bridge ensure              Start server + tunnel (auto-install cloudflared)
  agnes-bridge expose <file>       Expose a local file and get public URL
  agnes-bridge serve               Start asset server only
  agnes-bridge tunnel              Start tunnel only (requires serve first)
  agnes-bridge daemon              Run server + tunnel in background
  agnes-bridge stop                Stop background daemon
  agnes-bridge status              Show server/tunnel status
  agnes-bridge doctor              Check dependencies
  agnes-bridge cleanup             Remove expired asset registrations

Options:
  --port <number>                  Server port (default: 8787)
  --host <string>                  Server host (default: 127.0.0.1)
  --provider <name>                Tunnel provider: cloudflared, ngrok, localtunnel
  --idle-seconds <number>          Daemon idle timeout (default: 3600)
  --ttl-seconds <number>           Asset TTL (default: 3600)
  --public-base-url <url>          Override public URL
  --no-install-cloudflared         Skip auto-install

Environment variables:
  AGNES_BRIDGE_STATE_DIR           State directory (default: ~/.agnes-local-bridge)
  AGNES_BRIDGE_PORT                Server port
  AGNES_PUBLIC_BASE_URL            Public tunnel URL override
`);
}