// Run a coding task on a fresh Morph instance (issue #11):
//
//   ./morph task --name pin-overlap "Fix the timeline pin overlap"
//   ./morph task --issue 42
//   ./morph task --issue 42 "Prefer the SDK over the CLI throughout"
//
// The name is yours to pick (it becomes the sandbox/<name> branch and the
// instance label); --issue N derives name issue-N and generates a prompt
// telling the agent to read the issue with gh and work it. Extra positional
// text is appended to the generated prompt as guidance.
//
// Fresh instance per task, always - follow-ups go through morph:attach, not a
// second task on the same box. The flow: start from the latest warm snapshot,
// catch the clone up to origin/main on its own sandbox/ branch, start the dev
// server (per-task, never baked warm - decision #4), inject secrets at exec
// time (never into snapshot layers - decision #3), then leave `opencode run`
// working in a tmux session. The agent itself commits, pushes, and opens a
// draft PR via gh (finishInstructions), then touches the done signal as its
// last action - the runner is bare orchestration, not part of the dev flow
// (issue #16).
//
// Requires MORPH_API_KEY and MORPH_GIT_TOKEN (PAT: contents, pull-requests,
// issues - read/write on this repo) in the local environment, and a
// logged-in local opencode (its auth.json is copied to the box for the run).

import { parseArgs } from "node:util";
import {
  AGENT_SESSION,
  REPO_SLUG,
  createClient,
  execStep,
  hostAlias,
  shellQuote,
  syncSshConfig,
} from "./client.mjs";
import {
  catchUp,
  finishInstructions,
  injectSecrets,
  issuePrompt,
  readOpencodeAuth,
  requireGitToken,
  resolveSnapshot,
  startDevServer,
  startInstance,
  taskSlug,
} from "./launch.mjs";

const { values: flags, positionals } = parseArgs({
  options: {
    name: { type: "string" },
    issue: { type: "string" },
    model: { type: "string" }, // opencode model override, e.g. opencode/gpt-5-nano
    ttl: { type: "string", default: "120" }, // minutes
    snapshot: { type: "string" },
  },
  allowPositionals: true,
});

const usage =
  'Usage: ./morph task --name <name> "task description"\n' +
  '       ./morph task --issue <number> ["extra guidance"]\n' +
  "Options: --ttl <minutes> --snapshot <id>";

let task = positionals.join(" ").trim();
let name = flags.name;
if (flags.issue) {
  if (!/^\d+$/.test(flags.issue)) {
    console.error(`--issue expects a number, got "${flags.issue}".`);
    process.exit(1);
  }
  name ??= `issue-${flags.issue}`;
  task = task ? `${issuePrompt(flags.issue)}\n\nAdditional guidance: ${task}` : issuePrompt(flags.issue);
}
if (!task || !name) {
  console.error(usage);
  process.exit(1);
}

const gitToken = requireGitToken();
const opencodeAuth = readOpencodeAuth();
const slug = taskSlug(name);
const branch = `sandbox/${slug}`;

const client = createClient();
const snapshot = await resolveSnapshot(client, flags.snapshot);
const instance = await startInstance(client, { snapshot, role: "task", slug, ttlMinutes: Number(flags.ttl) });

await catchUp(instance, branch);

// Bare orchestration: run the agent and log. Committing, pushing, the draft
// PR, and the done signal are all the agent's job (finishInstructions).
const prompt = task + finishInstructions({ branch, instanceId: instance.id, issue: flags.issue });
const runner = `#!/bin/bash
set -uo pipefail
source /root/.task-env
cd /root/legacycoder.net

opencode run ${flags.model ? `--model ${shellQuote(flags.model)} ` : ""}${shellQuote(prompt)}
echo "--- opencode run finished (exit $?) ---"
`;

await injectSecrets(instance, {
  gitToken,
  opencodeAuth,
  extraFiles: {
    "/root/run-task.sh": { content: runner, executable: true },
  },
});

const service = await startDevServer(instance);

// The trailing shell keeps the session alive after the runner exits, so
// "watch" works post-hoc and follow-ups can reuse the session.
await execStep(
  instance,
  "start-agent",
  `tmux new-session -d -s ${AGENT_SESSION} ${shellQuote(
    "bash -c '/root/run-task.sh 2>&1 | tee /root/task.log; exec bash'",
  )}`,
);

await syncSshConfig(client);

const alias = hostAlias(instance);
console.log(`
Task launched on ${instance.id}
  branch:   ${branch}
  preview:  ${service?.url ?? "(exposing failed - check morph:status)"}
  ssh:      ssh ${alias}
  watch:    ssh -t ${alias} 'tmux attach -t ${AGENT_SESSION}'   (detach: Ctrl-b d)
  attach:   ./morph attach ${instance.id} [--zed|--cmux]
  compare:  https://github.com/${REPO_SLUG}/compare/main...${encodeURIComponent(branch)}

The agent commits, pushes, and opens a draft PR itself, then touches the
done signal that makes the box reapable (./morph reap).`);
