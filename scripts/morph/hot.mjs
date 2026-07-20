// Build a HOT snapshot: the warm snapshot caught up to origin/main, with
// secrets injected and the opencode TUI already open in the agent tmux
// session. Start a dashboard devbox from it (cloud.morph.so -> Devboxes ->
// new -> pick the snapshot) and you have a working, authenticated session
// from a phone - TUI on screen, gh and pushes working.
//
//   ./morph hot                # branch sandbox/hot
//   ./morph hot --name errand  # branch sandbox/errand
//
// This deliberately bakes MORPH_GIT_TOKEN and the opencode credentials into
// the snapshot - the exception to the warm rule. Hot snapshots must never
// be shared, and ./morph sweep deletes ALL of them: make one when heading
// out, sweep when back at the laptop.

import { parseArgs } from "node:util";
import {
  AGENT_SESSION,
  HOT_PURPOSE,
  PROJECT,
  REPO_PATH,
  createClient,
  execStep,
  shellQuote,
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
    ttl: { type: "string", default: "30" }, // builder safety net, minutes
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
  role: "hot-builder",
  slug,
  ttlMinutes: Number(flags.ttl),
});

await catchUp(instance, branch);
await injectSecrets(instance, { gitToken, opencodeAuth });
await startDevServer(instance);

// Bake the TUI in open: it snapshots idle at its prompt and resumes there.
// The trailing shell keeps the session alive if opencode ever exits.
await execStep(
  instance,
  "start-opencode",
  `tmux new-session -d -s ${AGENT_SESSION} ${shellQuote(
    `bash -c 'source /root/.task-env && cd ${REPO_PATH} && opencode; exec bash'`,
  )}`,
);

console.log("Snapshotting (memory state included - the TUI stays open)...");
const snapshot = await instance.snapshot();
await snapshot.setMetadata({
  ...snapshot.metadata,
  project: PROJECT,
  purpose: HOT_PURPOSE,
  name: slug,
});

console.log("Stopping builder instance...");
await instance.stop();

console.log(`
Hot snapshot ready: ${snapshot.id}  (branch ${branch}, secrets on board - do not share)

From the phone: cloud.morph.so -> Devboxes -> new -> pick ${snapshot.id}.
The agent tmux session has the opencode TUI open; the dev server runs in
the dev session (expose its port via the devbox UI for a preview).

Back at the laptop: ./morph sweep deletes all hot snapshots.`);
