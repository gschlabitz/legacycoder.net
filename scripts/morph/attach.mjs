// Attach to a running task instance (issue #11):
//
//   npm run morph:attach                     # newest task instance, print connect info
//   npm run morph:attach -- <instance-id>
//   npm run morph:attach -- <instance-id> --zed
//   npm run morph:attach -- <instance-id> --cmux
//
// Always rewrites ~/.ssh/morph_config (aliases for all live project
// instances, dead ones pruned) so Zed, cmux, ssh, and git all resolve the
// same morph-<id> aliases. --zed opens the repo remotely in Zed; --cmux
// opens a workspace with the agent tmux session beside the dev-server
// preview (layout ported from the reclaim monorepo's cmux integration).

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  AGENT_SESSION,
  PROJECT,
  REPO_PATH,
  createClient,
  hostAlias,
  previewUrl,
  projectInstances,
  shellQuote,
  syncSshConfig,
} from "./client.mjs";

const { values: flags, positionals } = parseArgs({
  options: {
    zed: { type: "boolean", default: false },
    cmux: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const client = createClient();

let instance;
if (positionals[0]) {
  instance = await client.instances.get({ instanceId: positionals[0] });
} else {
  const tasks = (await projectInstances(client))
    .filter((i) => i.metadata?.role === "task")
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  instance = tasks[0];
  if (!instance) {
    console.error(`No ${PROJECT} task instances found. Start one with: npm run morph:task -- "..."`);
    process.exit(1);
  }
}

if (instance.status === "paused") {
  console.log(`Instance ${instance.id} is paused - resuming...`);
  await instance.resume();
  await instance.waitUntilReady();
}

const includeOk = await syncSshConfig(client);
const alias = hostAlias(instance);
const preview = previewUrl(instance);
const attachAgent = `ssh -t ${alias} ${shellQuote(`tmux new-session -A -s ${AGENT_SESSION}`)}`;

if (flags.zed) {
  if (!includeOk) {
    console.error("Add the Include line above first - Zed resolves hosts through ~/.ssh/config.");
    process.exit(1);
  }
  const target = `ssh://${alias}${REPO_PATH}`;
  console.log(`Opening ${target} in Zed...`);
  await run("zed", [target]);
} else if (flags.cmux) {
  await openCmuxWorkspace();
} else {
  console.log(`
Instance ${instance.id} (${instance.metadata?.task ?? "unnamed"}, ${instance.status})
  ssh:      ssh ${alias}
  agent:    ${attachAgent}   (detach: Ctrl-b d)
  log:      ssh ${alias} 'tail -f /root/task.log'
  preview:  ${preview ?? "(no dev service exposed)"}
  zed:      npm run morph:attach -- ${instance.id} --zed
  cmux:     npm run morph:attach -- ${instance.id} --cmux`);
}

async function openCmuxWorkspace() {
  const cmuxBinary = await resolveCmux();
  await ensureCmuxRunning(cmuxBinary);

  // Left: the agent's tmux session (new-session -A reattaches to the live
  // run instead of spawning a duplicate). Right: the dev-server preview.
  const layout = {
    direction: "horizontal",
    split: 0.5,
    children: [
      { pane: { surfaces: [{ type: "terminal", command: attachAgent }] } },
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

async function resolveCmux() {
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

function run(command, args, quiet = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: quiet ? "ignore" : "inherit" });
    child.on("error", quiet ? () => resolve(1) : reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
