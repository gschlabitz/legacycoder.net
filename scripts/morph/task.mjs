// Run a coding task on a fresh Morph instance (issue #11):
//
//   npm run morph:task -- "Fix the timeline pin overlap"
//   npm run morph:task -- --ttl 240 "Bigger task"
//
// Fresh instance per task, always - follow-ups go through morph:attach, not a
// second task on the same box. The flow: start from the latest warm snapshot,
// catch the clone up to origin/main on its own sandbox/ branch, start the dev
// server (per-task, never baked warm - decision #4), inject secrets at exec
// time (never into snapshot layers - decision #3), then leave `opencode run`
// working in a tmux session. A scripted post-step - not the LLM - commits,
// pushes, and opens a draft PR as gschlabitz via the fine-grained PAT.
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
  branchTimestamp,
  catchUp,
  injectSecrets,
  readOpencodeAuth,
  requireGitToken,
  resolveSnapshot,
  startDevServer,
  startInstance,
  taskSlug,
} from "./launch.mjs";

const { values: flags, positionals } = parseArgs({
  options: {
    ttl: { type: "string", default: "120" }, // minutes
    snapshot: { type: "string" },
  },
  allowPositionals: true,
});

const task = positionals.join(" ").trim();
if (!task) {
  console.error('Usage: npm run morph:task -- [--ttl <minutes>] [--snapshot <id>] "task description"');
  process.exit(1);
}

const gitToken = requireGitToken();
const opencodeAuth = readOpencodeAuth();
const slug = taskSlug(task, "task");
const branch = `sandbox/${slug}-${branchTimestamp()}`;

const client = createClient();
const snapshot = await resolveSnapshot(client, flags.snapshot);
const instance = await startInstance(client, { snapshot, role: "task", slug, ttlMinutes: Number(flags.ttl) });

await catchUp(instance, branch);

const prBody = JSON.stringify({
  title: `agent: ${task.slice(0, 80)}`,
  head: branch,
  base: "main",
  draft: true,
  body: `Opened automatically by \`morph:task\`.\n\n**Task:** ${task}\n\nInstance: \`${instance.id}\``,
});
const runner = `#!/bin/bash
set -uo pipefail
source /root/.task-env
cd /root/legacycoder.net

opencode run ${shellQuote(task)}
echo "--- opencode run finished (exit $?) ---"

git add -A
git diff --cached --quiet || git commit -m ${shellQuote(`agent: ${task.slice(0, 72)}`)}

if [ "$(git rev-list --count origin/main..HEAD)" -gt 0 ]; then
  git push -u origin ${shellQuote(branch)}
  curl -sS -X POST "https://api.github.com/repos/${REPO_SLUG}/pulls" \\
    -H "Authorization: Bearer \${GITHUB_TOKEN}" \\
    -H "Accept: application/vnd.github+json" \\
    -d @/root/.task-pr.json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.html_url ? "Draft PR: "+j.html_url : "PR creation failed: "+JSON.stringify(j));})'
else
  echo "No commits produced - nothing to push."
fi
`;

await injectSecrets(instance, {
  gitToken,
  opencodeAuth,
  extraFiles: {
    "/root/.task-pr.json": { content: prBody },
    "/root/run-task.sh": { content: runner, executable: true },
  },
});

const service = await startDevServer(instance);

await execStep(
  instance,
  "start-agent",
  `tmux new-session -d -s ${AGENT_SESSION} ${shellQuote("/root/run-task.sh 2>&1 | tee /root/task.log")}`,
);

await syncSshConfig(client);

const alias = hostAlias(instance);
console.log(`
Task launched on ${instance.id}
  branch:   ${branch}
  preview:  ${service?.url ?? "(exposing failed - check morph:status)"}
  ssh:      ssh ${alias}
  watch:    ssh -t ${alias} 'tmux attach -t ${AGENT_SESSION}'   (detach: Ctrl-b d)
  attach:   npm run morph:attach -- ${instance.id} [--zed|--cmux]
  compare:  https://github.com/${REPO_SLUG}/compare/main...${encodeURIComponent(branch)}

A draft PR opens automatically when the agent finishes and has commits.`);
