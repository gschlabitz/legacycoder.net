// Pause ALL project instances, unconditionally - "stepping away from the
// desk" (issue #16). Busy boxes are paused too; memory state survives, and
// a mid-run agent that errors on resume is recoverable via morph:attach.
//
//   ./morph sleep
//   ./morph sleep --dry-run

import { parseArgs } from "node:util";
import { createClient, projectInstances } from "./client.mjs";

const { values: flags } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
  },
});
const dryRun = flags["dry-run"];

const client = createClient();
const instances = await projectInstances(client);

if (!instances.length) {
  console.log("No instances - nothing to pause.");
  process.exit(0);
}

for (const instance of instances) {
  const label = instance.metadata?.task ?? instance.metadata?.name ?? "-";
  if (instance.status === "paused") {
    console.log(`${instance.id}  ${label}  already paused`);
    continue;
  }
  if (dryRun) {
    console.log(`${instance.id}  ${label}  would pause (status: ${instance.status})`);
    continue;
  }
  await instance.pause();
  console.log(`${instance.id}  ${label}  paused`);
}
