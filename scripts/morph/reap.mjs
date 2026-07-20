// Stop (terminate) project boxes that are done. The only test is the done
// signal the agent touches after pushing and opening its PR - a box without
// the file is not reaped, full stop (issue #16). Interactive boxes never
// have the signal; clean those up with a targeted --force.
//
//   ./morph reap                     # whole fleet, done boxes only
//   ./morph reap <id> [<id>...]      # same rule, only these boxes
//   ./morph reap --force <id> ...    # kill these, no questions asked
//   ./morph reap --force --all       # kill everything (deliberate double flag)
//   ./morph reap --dry-run           # verdicts only; inspects paused boxes
//                                    # (briefly resumes them) but stops nothing
//
// Paused boxes are resumed to check the signal and re-paused when skipped -
// reap never leaves a box in a more expensive state than it found it.

import { parseArgs } from "node:util";
import { DONE_SIGNAL, createClient, projectInstances } from "./client.mjs";

const { values: flags, positionals: ids } = parseArgs({
  options: {
    force: { type: "boolean", default: false },
    all: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
  allowPositionals: true,
});
const dryRun = flags["dry-run"];

if (flags.force && !ids.length && !flags.all) {
  console.error("reap --force needs explicit targets: instance ids, or --all for the whole fleet.");
  process.exit(1);
}

const client = createClient();
const instances = await projectInstances(client);

let targets = instances;
if (ids.length) {
  targets = ids.map((id) => {
    const match = instances.find((i) => i.id === id);
    if (!match) {
      console.error(`${id} is not one of this project's instances (see ./morph status).`);
      process.exit(1);
    }
    return match;
  });
}

if (!targets.length) {
  console.log("No instances - nothing to reap.");
  process.exit(0);
}

async function hasDoneSignal(instance) {
  const result = await instance.exec(`test -f ${DONE_SIGNAL}`);
  return result.exit_code === 0;
}

async function stop(instance, reason) {
  if (dryRun) {
    console.log(`${instance.id}  would stop (${reason})`);
    return false; // not stopped - caller may need to re-pause
  }
  await instance.stop();
  console.log(`${instance.id}  stopped (${reason})`);
  return true;
}

for (const instance of targets) {
  const label = instance.metadata?.task ?? instance.metadata?.name ?? "-";

  if (flags.force) {
    await stop(instance, `forced, was ${instance.status}, ${label}`);
    continue;
  }

  if (instance.status !== "ready" && instance.status !== "paused") {
    console.log(`${instance.id}  skipped: status ${instance.status} (${label})`);
    continue;
  }

  const wasPaused = instance.status === "paused";
  if (wasPaused) {
    console.log(`${instance.id}  resuming to inspect...`);
    await instance.resume();
    await instance.waitUntilReady();
  }

  const done = await hasDoneSignal(instance);
  let stopped = false;
  if (done) {
    stopped = await stop(instance, `done signal present, ${label}`);
  } else {
    const role = instance.metadata?.role;
    const why =
      role === "interactive" || role === "hot"
        ? `no done signal (${role} box - use ./morph reap --force <id> when finished)`
        : "no done signal (agent not finished, or work never pushed)";
    console.log(`${instance.id}  skipped: ${why} (${label})`);
  }

  // Never leave a box more expensive than we found it.
  if (wasPaused && !stopped) {
    await instance.pause();
    console.log(`${instance.id}  re-paused`);
  }
}
