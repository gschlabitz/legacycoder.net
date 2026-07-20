// cmux workspace plumbing, shared by attach.mjs and cmux.mjs. Layout: the
// agent tmux session on the left (new-session -A reattaches to the live
// session instead of spawning a duplicate), the dev-server preview on the
// right. Ported from the reclaim monorepo's cmux integration.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { AGENT_SESSION, shellQuote } from "./client.mjs";

export function agentAttachCommand(alias) {
  return `ssh -t ${alias} ${shellQuote(`tmux new-session -A -s ${AGENT_SESSION}`)}`;
}

export async function openCmuxWorkspace(instance, { alias, preview }) {
  const cmuxBinary = await ensureCmuxRunning();

  const layout = {
    direction: "horizontal",
    split: 0.5,
    children: [
      { pane: { surfaces: [{ type: "terminal", command: agentAttachCommand(alias) }] } },
      preview
        ? { pane: { surfaces: [{ type: "browser", url: preview }] } }
        : { pane: { surfaces: [{ type: "terminal", command: `ssh ${alias}` }] } },
    ],
  };

  const name = instance.metadata?.task ? `morph ${instance.metadata.task}` : `morph ${instance.id}`;
  const result = await run(cmuxBinary, [
    "new-workspace",
    "--name",
    name,
    "--description",
    `Morph instance ${instance.id}`,
    "--cwd",
    process.cwd(),
    "--layout",
    JSON.stringify(layout),
    "--focus",
    "true",
  ]);
  if (result !== 0) {
    throw new Error("cmux new-workspace failed.");
  }
  console.log(`Opened cmux workspace "${name}".`);
}

export function run(command, args, quiet = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: quiet ? "ignore" : "inherit" });
    child.on("error", quiet ? () => resolve(1) : reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const CMUX_APP = "/Applications/cmux.app";

function resolveCmux() {
  if (process.env.CMUX_BIN?.trim()) return process.env.CMUX_BIN.trim();
  const appBinary = `${CMUX_APP}/Contents/Resources/bin/cmux`;
  if (existsSync(appBinary)) return appBinary;
  return "cmux";
}

/**
 * Make sure the cmux app is up, launching it if needed; returns the CLI
 * binary. Idempotent and cheap when cmux is already running - call it
 * early, before slow work, so a cold app start overlaps with the rest.
 */
const ACCESS_DENIED_HELP =
  'cmux is running but refuses control from outside cmux (socketControlMode "cmuxOnly", the default).\n' +
  "One-time fix: in cmux Settings (or ~/.config/cmux/cmux.json under \"automation\") set\n" +
  '  socketControlMode: "password"  and a  socketPassword,\n' +
  "then run `cmux reload-config`. The CLI picks the saved password up automatically;\n" +
  "set CMUX_SOCKET_PASSWORD only if you keep the password out of Settings.";

export async function ensureCmuxRunning() {
  const cmuxBinary = resolveCmux();
  const first = await ping(cmuxBinary);
  if (first.ok) return cmuxBinary;
  if (first.denied) throw new Error(ACCESS_DENIED_HELP);

  console.log("cmux is not running - launching it...");
  // Open the bundle by path when we know it; `-a cmux` depends on Launch
  // Services knowing the name and can fail silently.
  const opened = existsSync(CMUX_APP) ? await run("open", [CMUX_APP], true) : await run("open", ["-a", "cmux"], true);
  if (opened !== 0) {
    throw new Error("Could not launch cmux. Open it manually, then retry (or set CMUX_BIN).");
  }
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((r) => setTimeout(r, 500));
    const probe = await ping(cmuxBinary);
    if (probe.ok) return cmuxBinary;
    if (probe.denied) throw new Error(ACCESS_DENIED_HELP);
  }
  throw new Error("cmux launched but its control socket did not come up within 60s. Retry once it is open.");
}

function ping(cmuxBinary) {
  return new Promise((resolve) => {
    const child = spawn(cmuxBinary, ["ping"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", () => resolve({ ok: false, denied: false }));
    child.on("exit", (code) => resolve({ ok: code === 0, denied: /access denied/i.test(output) }));
  });
}
