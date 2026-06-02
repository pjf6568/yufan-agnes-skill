import { assetUrl } from "./server.js";
import { registerAsset } from "./assets.js";
import { ensureBridgeRunning } from "./daemon.js";
import { readServerState } from "./state.js";
import { getPublicBaseUrl } from "./tunnel.js";

export async function exposeLocalFile(filePath, options = {}) {
  if (!options.publicBaseUrl && options.autoBridge !== false) {
    await ensureBridgeRunning({
      provider: options.tunnelProvider,
      port: options.port,
      host: options.host,
      idleSeconds: options.idleSeconds,
      installCloudflared: options.installCloudflared
    });
  }

  const asset = await registerAsset(filePath, { ttlSeconds: options.ttlSeconds });
  const publicBaseUrl = options.publicBaseUrl || await getPublicBaseUrl();
  const serverState = await readServerState();
  const localBaseUrl = options.localBaseUrl || process.env.AGNES_LOCAL_BASE_URL || serverState?.baseUrl || "http://127.0.0.1:8787";

  return {
    token: asset.token,
    path: asset.path,
    mimeType: asset.mimeType,
    size: asset.size,
    expiresAt: asset.expiresAt,
    localUrl: assetUrl(localBaseUrl, asset.token),
    publicUrl: publicBaseUrl ? assetUrl(publicBaseUrl, asset.token) : null
  };
}

export async function exposeLocalFiles(filePaths = [], options = {}) {
  const results = [];
  for (const filePath of filePaths) {
    results.push(await exposeLocalFile(filePath, options));
  }
  return results;
}