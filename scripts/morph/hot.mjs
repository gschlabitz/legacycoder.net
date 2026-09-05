// Build a HOT box: an instance from the warm snapshot, caught up to
// origin/main, secrets injected, dev server running, opencode TUI open in
// the agent tmux session - then paused with wake-on-SSH. From a phone, an
// SSH app (Termius, Blink) connecting to it wakes it and `tmux attach -t
// agent` puts the TUI on screen. Instance-native on purpose: the devbox
// service cannot start from personal snapshots (its service key can't see
// them - verified 2026-07), so the dashboard/devbox route is a dead end.
//
//   npm run morph:hot                # branch sandbox/hot
//   npm run morph:hot -- --name errand  # branch sandbox/errand
//
// The box carries secrets on its paused disk - the same exposure as any
// task box, just longer-lived. Phone auth is a one-time ACCOUNT setting,
// not per-box: Morph's ssh.cloud.morph.so terminates SSH itself and never
// consults the VM's authorized_keys (verified 2026-07), so the phone key
// must be registered as the account's user SSH key instead - see
// docs/iphone-hot-box-runbook.md. No done signal ever appears here: reap
// skips hot boxes; finish one with npm run morph:reap -- --force <id>.

import { parseArgs } from "node:util";
import {
  AGENT_SESSION,
  REPO_PATH,
  createClient,
  execStep,
  shellQuote,
  sshAccess,
  syncSshConfig,
} from "./client.mjs";
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

const { values: flags } = parseArgs({
  options: {
    name: { type: "string", default: "hot" },
    snapshot: { type: "string" },
    ttl: { type: "string", default: "120" }, // minutes awake per wake-up, then pause again
  },
});

const gitToken = requireGitToken();
const opencodeAuth = readOpencodeAuth();
const slug = taskSlug(flags.name);
const branch = `sandbox/${slug}`;

const client = createClient();
const warm = await resolveSnapshot(client, flags.snapshot);
const instance = await startInstance(client, {
  snapshot: warm,
  role: "hot",
  slug,
  ttlMinutes: Number(flags.ttl),
});

await catchUp(instance, branch);
await injectSecrets(instance, { gitToken, opencodeAuth });
const service = await startDevServer(instance);

// The TUI is left open so a wake resumes straight into it; the trailing
// shell keeps the session alive if opencode ever exits.
await execStep(
  instance,
  "start-opencode",
  `tmux new-session -d -s ${AGENT_SESSION} ${shellQuote(
    `bash -c 'source /root/.task-env && cd ${REPO_PATH} && opencode; exec bash'`,
  )}`,
);

await instance.setWakeOn(true, true); // SSH wakes it; so does hitting the preview URL
const access = await sshAccess(instance);
await syncSshConfig(client);

console.log("Pausing (wake-on-SSH armed)...");
await instance.pause();

console.log(`
Hot box ready (paused): ${instance.id}  branch ${branch}

Phone (auth is your account key - one-time setup in docs/iphone-hot-box-runbook.md):
  host:     ssh.cloud.morph.so
  user:     ${instance.id}   <- set this in the SSH app, it's the only per-outing step

Connecting wakes the box; then: tmux attach -t ${AGENT_SESSION}
Preview (also wakes it): ${service?.url ?? "(exposing failed)"}
Laptop: ${access.sshCommand}

It re-pauses ${flags.ttl} min after each wake. Secrets are on its disk -
when back at the laptop, finish it with: npm run morph:reap -- --force ${instance.id}`);
