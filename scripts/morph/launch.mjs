// Shared launch sequence for commands that put a working instance on its
// feet (task.mjs, cmux.mjs): resolve the warm snapshot, start a TTL'd
// instance, catch the clone up to origin/main on a sandbox branch, inject
// per-run secrets, and start the dev server. Secrets touch only the
// instance's ephemeral disk - never a snapshot layer (ADR-0006).

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEV_PORT,
  DEV_SESSION,
  PROJECT,
  REPO_PATH,
  ageInDays,
  execStep,
  latestWarmSnapshot,
  shellQuote,
} from "./client.mjs";

export function requireGitToken() {
  const token = process.env.MORPH_GIT_TOKEN;
  if (!token) {
    console.error("MORPH_GIT_TOKEN is not set (fine-grained PAT for this repo). Add it to ~/.zshenv.");
    process.exit(1);
  }
  return token;
}

export function readOpencodeAuth() {
  const path = join(homedir(), ".local", "share", "opencode", "auth.json");
  try {
    return readFileSync(path, "utf8");
  } catch {
    console.error(`No opencode credentials at ${path} - run \`opencode auth login\` first.`);
    process.exit(1);
  }
}

/** Sanitize a user-picked name into a slug usable as branch suffix and metadata. */
export function taskSlug(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!slug || slug === "main") {
    console.error(`"${text}" does not reduce to a usable name.`);
    process.exit(1);
  }
  return slug;
}

/** The generated prompt for --issue N: the box has gh, so the agent self-serves. */
export function issuePrompt(issueNumber) {
  return (
    `Work on GitHub issue #${issueNumber} in this repository. ` +
    `Start with \`gh issue view ${issueNumber} --comments\` to read the issue and its discussion, ` +
    `then implement what it asks, respecting any acceptance criteria it lists. ` +
    `When you are done, add a short comment to the issue summarizing what you changed.`
  );
}

export async function resolveSnapshot(client, snapshotId) {
  const snapshot = snapshotId ? await client.snapshots.get({ snapshotId }) : await latestWarmSnapshot(client);
  if (!snapshot) {
    console.error('No warm snapshot found - run "npm run morph:warm" first.');
    process.exit(1);
  }
  const age = ageInDays(snapshot.created);
  console.log(
    `Warm snapshot: ${snapshot.id}${age !== undefined ? ` (${age} days old${age > 30 ? " - consider npm run morph:warm" : ""})` : ""}`,
  );
  return snapshot;
}

export async function startInstance(client, { snapshot, role, slug, ttlMinutes }) {
  console.log("Starting instance...");
  const instance = await client.instances.start({
    snapshotId: snapshot.id,
    metadata: { project: PROJECT, role, task: slug, name: slug },
    ttlSeconds: ttlMinutes * 60,
    ttlAction: "pause",
  });
  await instance.waitUntilReady();
  console.log(`Instance ${instance.id} ready (TTL ${ttlMinutes} min, then pause).`);
  return instance;
}

export async function catchUp(instance, branch) {
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
}

/**
 * Write per-run secrets and any extra files, 0600/0700, root-only. The PAT
 * doubles as GITHUB_TOKEN (git credential helper, curl) and GH_TOKEN (gh).
 * Git identity and the credential helper are configured here so both the
 * scripted runner and interactive sessions can push.
 */
export async function injectSecrets(instance, { gitToken, opencodeAuth, extraFiles = {} }) {
  const lines = [
    "umask 077",
    `printf 'export GITHUB_TOKEN=%s\\nexport GH_TOKEN=%s\\n' ${shellQuote(gitToken)} ${shellQuote(gitToken)} > /root/.task-env`,
    "mkdir -p /root/.local/share/opencode",
    `cat > /root/.local/share/opencode/auth.json <<'EOF_AUTH'\n${opencodeAuth}\nEOF_AUTH`,
    `cd ${REPO_PATH}`,
    'git config user.name "opencode agent"',
    `git config user.email "agent@${PROJECT}"`,
    `git config credential.helper '!f() { echo "username=x-access-token"; echo "password=\${GITHUB_TOKEN}"; }; f'`,
  ];
  Object.entries(extraFiles).forEach(([path, { content, executable }], index) => {
    lines.push(`cat > ${path} <<'EOF_FILE_${index}'\n${content}\nEOF_FILE_${index}`);
    if (executable) lines.push(`chmod 700 ${path}`);
  });
  await execStep(instance, "inject-secrets", lines.join("\n"));
}

export async function startDevServer(instance) {
  await execStep(
    instance,
    "start-dev-server",
    `tmux new-session -d -s ${DEV_SESSION} ${shellQuote(`cd ${REPO_PATH} && npm run dev -- --host`)}`,
  );
  return await instance.exposeHttpService("dev", DEV_PORT);
}
