// Build a HOT box: an instance from the warm snapshot, caught up to
// origin/main, secrets injected, dev server running, opencode TUI open in
// the agent tmux session - then paused with wake-on-SSH. From a phone, an
// SSH app (Termius, Blink) connecting to it wakes it and `tmux attach -t
// agent` puts the TUI on screen. Instance-native on purpose: the devbox
// service cannot start from personal snapshots (its service key can't see
// them - verified 2026-07), so the dashboard/devbox route is a dead end.
//
//   ./morph hot                # branch sandbox/hot
//   ./morph hot --name errand  # branch sandbox/errand
//
// The box carries secrets on its paused disk - the same exposure as any
// task box, just longer-lived. Set SSHID (a Termius SSH ID handle - see
// docs/iphone-hot-box-runbook.md) and the public keys published at
// https://sshid.io/<handle> are fetched fresh at build time and added to
// the box's authorized_keys, so the phone never needs the per-instance
// key; without it, the printed per-instance .pem must be installed on the
// phone each build. No done signal ever appears here: reap skips hot
// boxes; finish one with ./morph reap --force <id>.

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

// The phone's SSH ID public keys (not secrets) let the phone keep one
// permanent identity instead of importing each box's per-instance key.
// Fetched fresh each build, so newly enrolled SSH ID devices just work -
// and fetched before any box gets billed, so a bad handle fails free.
const sshid = process.env.SSHID?.trim();
let phoneKeys;
if (sshid) {
  const response = await fetch(`https://sshid.io/${encodeURIComponent(sshid)}`);
  phoneKeys = response.ok ? (await response.text()).trim() : "";
  // Unknown handles answer 200 with an empty body - only a non-empty key
  // list proves the handle is right.
  if (!phoneKeys) {
    console.error(`https://sshid.io/${sshid} has no published keys - check the SSHID handle.`);
    process.exit(1);
  }
}

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

if (phoneKeys) {
  await execStep(
    instance,
    "install-phone-keys",
    [
      "mkdir -p /root/.ssh",
      "chmod 700 /root/.ssh",
      `printf '%s\\n' ${shellQuote(phoneKeys)} >> /root/.ssh/authorized_keys`,
      "chmod 600 /root/.ssh/authorized_keys",
    ].join(" && "),
  );
}

await instance.setWakeOn(true, true); // SSH wakes it; so does hitting the preview URL
const access = await sshAccess(instance);
await syncSshConfig(client);

console.log("Pausing (wake-on-SSH armed)...");
await instance.pause();

const phoneLines = phoneKeys
  ? `Phone (SSH ID keys for "${sshid}" are on the box - just set the username in the SSH app):
  host:     ssh.cloud.morph.so
  user:     ${instance.id}
  auth:     SSH ID`
  : `Phone setup (no SSHID set - install the per-instance key):
  host:     ssh.cloud.morph.so
  user:     ${instance.id}
  key:      ${access.keyPath}   (install this in the SSH app)
  Tip: docs/iphone-hot-box-runbook.md sets up a permanent SSH ID instead.`;

console.log(`
Hot box ready (paused): ${instance.id}  branch ${branch}

${phoneLines}

Connecting wakes the box; then: tmux attach -t ${AGENT_SESSION}
Preview (also wakes it): ${service?.url ?? "(exposing failed)"}
Laptop: ${access.sshCommand}

It re-pauses ${flags.ttl} min after each wake. Secrets are on its disk -
when back at the laptop, finish it with: ./morph reap --force ${instance.id}`);
