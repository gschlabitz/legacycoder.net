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
  const cmuxBinary = resolveCmux();
  await ensureCmuxRunning(cmuxBinary);

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

function resolveCmux() {
  if (process.env.CMUX_BIN?.trim()) return process.env.CMUX_BIN.trim();
  const appBinary = "/Applications/cmux.app/Contents/Resources/bin/cmux";
  if (existsSync(appBinary)) return appBinary;
  return "cmux";
}

async function ensureCmuxRunning(cmuxBinary) {
  if ((await run(cmuxBinary, ["ping"], true)) === 0) return;
  await run("open", ["-a", "cmux"], true);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((r) => setTimeout(r, 500));
    if ((await run(cmuxBinary, ["ping"], true)) === 0) return;
  }
  throw new Error("cmux is not responding on its control socket. Open cmux, then retry.");
}
