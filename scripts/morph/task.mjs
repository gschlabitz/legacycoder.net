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
// Requires MORPH_API_KEY and MORPH_GIT_TOKEN (PAT: contents + pull-requests
// read/write on this repo) in the local environment, and a logged-in local
// opencode (its auth.json is copied to the box for the run).

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  AGENT_SESSION,
  DEV_PORT,
  DEV_SESSION,
  PROJECT,
  REPO_PATH,
  REPO_SLUG,
  ageInDays,
  createClient,
  execStep,
  hostAlias,
  latestWarmSnapshot,
  shellQuote,
  syncSshConfig,
} from "./client.mjs";

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

const gitToken = process.env.MORPH_GIT_TOKEN;
if (!gitToken) {
  console.error("MORPH_GIT_TOKEN is not set (fine-grained PAT for this repo). Add it to ~/.zshenv.");
  process.exit(1);
}

const opencodeAuthPath = join(homedir(), ".local", "share", "opencode", "auth.json");
let opencodeAuth;
try {
  opencodeAuth = readFileSync(opencodeAuthPath, "utf8");
} catch {
  console.error(`No opencode credentials at ${opencodeAuthPath} - run \`opencode auth login\` first.`);
  process.exit(1);
}

const slug =
  task
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "task";
const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replaceAll(":", "").replaceAll("-", "");
const branch = `sandbox/${slug}-${timestamp}`;

const client = createClient();
const snapshot = flags.snapshot ? await client.snapshots.get({ snapshotId: flags.snapshot }) : await latestWarmSnapshot(client);
if (!snapshot) {
  console.error('No warm snapshot found - run "npm run morph:warm" first.');
  process.exit(1);
}
const age = ageInDays(snapshot.created);
console.log(`Warm snapshot: ${snapshot.id}${age !== undefined ? ` (${age} days old${age > 30 ? " - consider npm run morph:warm" : ""})` : ""}`);

console.log("Starting instance...");
const instance = await client.instances.start({
  snapshotId: snapshot.id,
  metadata: { project: PROJECT, role: "task", task: slug, name: slug },
  ttlSeconds: Number(flags.ttl) * 60,
  ttlAction: "pause",
});
await instance.waitUntilReady();
console.log(`Instance ${instance.id} ready (TTL ${flags.ttl} min, then pause).`);

await execStep(
  instance,
  "catch-up",
  [
    `cd ${REPO_PATH}`,
    "git fetch origin main",
    `git checkout -B ${shellQuote(branch)} origin/main`,
    "npm install",
  ].join(" && "),
);

// Secrets land only on this ephemeral, TTL'd instance (0600, root-only) -
// task boxes are never snapshotted, so nothing here can outlive the box.
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
cd ${REPO_PATH}
git config user.name "opencode agent"
git config user.email "agent@${PROJECT}"
git config credential.helper '!f() { echo "username=x-access-token"; echo "password=\${GITHUB_TOKEN}"; }; f'

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

await execStep(
  instance,
  "inject-secrets",
  [
    "umask 077",
    `printf 'export GITHUB_TOKEN=%s\\nexport GH_TOKEN=%s\\n' ${shellQuote(gitToken)} ${shellQuote(gitToken)} > /root/.task-env`,
    "mkdir -p /root/.local/share/opencode",
    `cat > /root/.local/share/opencode/auth.json <<'EOF_AUTH'\n${opencodeAuth}\nEOF_AUTH`,
    `cat > /root/.task-pr.json <<'EOF_PR'\n${prBody}\nEOF_PR`,
    `cat > /root/run-task.sh <<'EOF_RUNNER'\n${runner}\nEOF_RUNNER`,
    "chmod 700 /root/run-task.sh",
  ].join("\n"),
);

await execStep(
  instance,
  "start-dev-server",
  `tmux new-session -d -s ${DEV_SESSION} ${shellQuote(`cd ${REPO_PATH} && npm run dev -- --host`)}`,
);

await execStep(
  instance,
  "start-agent",
  `tmux new-session -d -s ${AGENT_SESSION} ${shellQuote("/root/run-task.sh 2>&1 | tee /root/task.log")}`,
);

const service = await instance.exposeHttpService("dev", DEV_PORT);
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
