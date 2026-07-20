// Attach to a running instance (issue #11):
//
//   npm run morph:attach                     # newest task/interactive instance, print connect info
//   npm run morph:attach -- <instance-id>
//   npm run morph:attach -- <instance-id> --zed
//   npm run morph:attach -- <instance-id> --cmux
//
// Always rewrites ~/.ssh/morph_config (aliases for all live project
// instances, dead ones pruned) so Zed, cmux, ssh, and git all resolve the
// same lc-<id> aliases. --zed opens the repo remotely in Zed; --cmux
// opens a workspace with the agent tmux session beside the dev-server
// preview.

import { parseArgs } from "node:util";
import {
  PROJECT,
  REPO_PATH,
  createClient,
  hostAlias,
  previewUrl,
  projectInstances,
  syncSshConfig,
} from "./client.mjs";
import { agentAttachCommand, openCmuxWorkspace, run } from "./workspace.mjs";

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
  const candidates = (await projectInstances(client))
    .filter((i) => ["task", "interactive"].includes(i.metadata?.role))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  instance = candidates[0];
  if (!instance) {
    console.error(`No ${PROJECT} instances found. Start one with: npm run morph:task -- "..."`);
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

if (flags.zed) {
  if (!includeOk) {
    console.error("Add the Include line above first - Zed resolves hosts through ~/.ssh/config.");
    process.exit(1);
  }
  const target = `ssh://${alias}${REPO_PATH}`;
  console.log(`Opening ${target} in Zed...`);
  await run("zed", [target]);
} else if (flags.cmux) {
  await openCmuxWorkspace(instance, { alias, preview });
} else {
  console.log(`
Instance ${instance.id} (${instance.metadata?.task ?? "unnamed"}, ${instance.status})
  ssh:      ssh ${alias}
  agent:    ${agentAttachCommand(alias)}   (detach: Ctrl-b d)
  log:      ssh ${alias} 'tail -f /root/task.log'
  preview:  ${preview ?? "(no dev service exposed)"}
  zed:      npm run morph:attach -- ${instance.id} --zed
  cmux:     npm run morph:attach -- ${instance.id} --cmux`);
}
