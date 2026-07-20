// Start an interactive instance and open it as a cmux workspace:
//
//   npm run morph:cmux -- --name pin-experiments
//   npm run morph:cmux -- --issue 42        # name becomes issue-42
//   npm run morph:cmux -- --name big-thing --ttl 240
//
// Same launch sequence as morph:task (fresh instance, sandbox branch, dev
// server, per-run secrets), but the agent tmux session runs the opencode
// TUI instead of a scripted `opencode run` - you steer, and nothing is
// committed or pushed unless you (or the agent, on your instruction) do
// it; gh is available and authenticated for PRs and issues. The tmux
// session outlives the workspace pane: detach or close cmux freely and
// reattach later with `npm run morph:attach -- <id> --cmux`.

import { parseArgs } from "node:util";
import { REPO_PATH, AGENT_SESSION, createClient, hostAlias, shellQuote, syncSshConfig, execStep } from "./client.mjs";
import {
  catchUp,
  injectSecrets,
  readOpencodeAuth,
  requireGitToken,
  resolveSnapshot,
  startDevServer,
  startInstance,
  taskSlug,
} from "./launch.mjs";
import { openCmuxWorkspace, agentAttachCommand } from "./workspace.mjs";

const { values: flags } = parseArgs({
  options: {
    name: { type: "string" },
    issue: { type: "string" },
    ttl: { type: "string", default: "120" }, // minutes
    snapshot: { type: "string" },
  },
});

const name = flags.name ?? (flags.issue && /^\d+$/.test(flags.issue) ? `issue-${flags.issue}` : undefined);
if (!name) {
  console.error("Usage: npm run morph:cmux -- --name <name> | --issue <number>  [--ttl <minutes>] [--snapshot <id>]");
  process.exit(1);
}

const gitToken = requireGitToken();
const opencodeAuth = readOpencodeAuth();
const slug = taskSlug(name);
const branch = `sandbox/${slug}`;

const client = createClient();
const snapshot = await resolveSnapshot(client, flags.snapshot);
const instance = await startInstance(client, {
  snapshot,
  role: "interactive",
  slug,
  ttlMinutes: Number(flags.ttl),
});

await catchUp(instance, branch);
await injectSecrets(instance, { gitToken, opencodeAuth });
const service = await startDevServer(instance);

// The session survives opencode exiting (drops to a shell) and detaches -
// that's what makes the workspace resumable.
await execStep(
  instance,
  "start-opencode",
  `tmux new-session -d -s ${AGENT_SESSION} ${shellQuote(
    `bash -c 'source /root/.task-env && cd ${REPO_PATH} && opencode; exec bash'`,
  )}`,
);

await syncSshConfig(client);
const alias = hostAlias(instance);

console.log(`
Interactive instance ${instance.id}
  branch:   ${branch}
  preview:  ${service?.url ?? "(exposing failed - check morph:status)"}
  ssh:      ssh ${alias}
  resume:   npm run morph:attach -- ${instance.id} --cmux
  terminal: ${agentAttachCommand(alias)}
`);

await openCmuxWorkspace(instance, { alias, preview: service?.url });
