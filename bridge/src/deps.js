import { spawn } from "node:child_process";

export async function commandExists(command) {
  const isWindows = process.platform === "win32";
  const shellCommand = isWindows
    ? `where ${cmdQuote(command)}`
    : `command -v ${shQuote(command)}`;

  return new Promise((resolve) => {
    const child = spawn(isWindows ? "cmd.exe" : "sh", [isWindows ? "/d" : "-lc", isWindows ? "/s" : shellCommand, isWindows ? "/c" : undefined, isWindows ? shellCommand : undefined].filter(Boolean), { stdio: "ignore" });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export async function ensureCloudflared(options = {}) {
  if (await commandExists("cloudflared")) {
    return { ok: true, installed: true, action: "already-installed" };
  }

  const install = options.install ?? true;
  if (!install) {
    return { ok: false, installed: false, action: "missing" };
  }

  const installer = await pickCloudflaredInstaller();
  if (!installer) {
    throw new Error(cloudflaredInstallHelp());
  }

  await runInherit(installer.command, installer.args);
  if (!(await commandExists("cloudflared"))) {
    throw new Error(`${installer.name} finished, but cloudflared is still not on PATH. Restart your terminal or install cloudflared manually.`);
  }

  return { ok: true, installed: true, action: `installed-with-${installer.name}` };
}

async function pickCloudflaredInstaller() {
  if (process.platform === "darwin") {
    if (await commandExists("brew")) return { name: "homebrew", command: "brew", args: ["install", "cloudflared"] };
    return null;
  }

  if (process.platform === "win32") {
    if (await commandExists("winget")) return { name: "winget", command: "winget", args: ["install", "--id", "Cloudflare.cloudflared", "--exact", "--accept-source-agreements", "--accept-package-agreements"] };
    if (await commandExists("choco")) return { name: "chocolatey", command: "choco", args: ["install", "cloudflared", "-y"] };
    if (await commandExists("scoop")) return { name: "scoop", command: "scoop", args: ["install", "cloudflared"] };
    return null;
  }

  if (process.platform === "linux") {
    if (await commandExists("brew")) return { name: "homebrew", command: "brew", args: ["install", "cloudflared"] };
    if (await commandExists("snap")) return { name: "snap", command: "sudo", args: ["snap", "install", "cloudflared"] };
    if (await commandExists("apt-get")) return { name: "apt", command: "sh", args: ["-lc", "curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null && echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null && sudo apt-get update && sudo apt-get install -y cloudflared"] };
    if (await commandExists("dnf")) return { name: "dnf", command: "sh", args: ["-lc", "sudo dnf install -y 'dnf-command(config-manager)' && sudo dnf config-manager --add-repo https://pkg.cloudflare.com/cloudflared-ascii.repo && sudo dnf install -y cloudflared"] };
    if (await commandExists("yum")) return { name: "yum", command: "sh", args: ["-lc", "sudo yum install -y yum-utils && sudo yum-config-manager --add-repo https://pkg.cloudflare.com/cloudflared-ascii.repo && sudo yum install -y cloudflared"] };
  }

  return null;
}

function cloudflaredInstallHelp() {
  if (process.platform === "win32") {
    return "cloudflared is missing. Install it with `winget install --id Cloudflare.cloudflared --exact`, Chocolatey, Scoop, or from https://developers.cloudflare.com/tunnel/downloads/.";
  }
  if (process.platform === "linux") {
    return "cloudflared is missing and no supported installer was found. Install it from https://developers.cloudflare.com/tunnel/downloads/ or install curl plus apt/dnf/yum/snap.";
  }
  if (process.platform === "darwin") {
    return "cloudflared is missing and Homebrew was not found. Install Homebrew or download cloudflared from https://developers.cloudflare.com/tunnel/downloads/.";
  }
  return "cloudflared is missing. Install it from https://developers.cloudflare.com/tunnel/downloads/.";
}

export function platformInstallSummary() {
  return {
    platform: process.platform,
    supportedAutoInstallers: {
      darwin: ["brew install cloudflared"],
      win32: ["winget install --id Cloudflare.cloudflared --exact", "choco install cloudflared -y", "scoop install cloudflared"],
      linux: ["brew install cloudflared", "snap install cloudflared", "apt-get install cloudflared", "dnf/yum install cloudflared"]
    }
  };
}

function runInherit(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function shQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function cmdQuote(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}