// Delete stale snapshots (issue #16). Keeps the latest ready warm snapshot;
// deletes superseded warm snapshots, any hot-dev snapshots (secrets on
// board; hot boxes are instances now, but early ones were snapshots), and
// all debris.
// Debris = any snapshot with no `purpose` metadata field, account-wide:
// setup() layers and bases never get metadata, so purpose-less means
// reproducible build leftovers (single-operator account - anything worth
// keeping carries a purpose).
//
//   ./morph sweep
//   ./morph sweep --all        # delete the latest warm snapshot too
//   ./morph sweep --dry-run
//
// Convention, not enforced: don't sweep while a ./morph warm build is
// running - its unfinished layers look like debris.

import { parseArgs } from "node:util";
import { HOT_PURPOSE, PROJECT, WARM_PURPOSE, ageInDays, createClient } from "./client.mjs";

const { values: flags } = parseArgs({
  options: {
    all: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});
const dryRun = flags["dry-run"];

const client = createClient();
const snapshots = (await client.snapshots.list()).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

const isProjectWarm = (s) => s.metadata?.purpose === WARM_PURPOSE && s.metadata?.project === PROJECT;
const survivor = flags.all ? undefined : snapshots.find((s) => isProjectWarm(s) && s.status === "ready");

let kept = 0;
for (const snapshot of snapshots) {
  const purpose = snapshot.metadata?.purpose;
  const name = snapshot.metadata?.name ? ` "${snapshot.metadata.name}"` : "";
  const age = ageInDays(snapshot.created);
  const desc = `${snapshot.id}${name}  ${purpose ?? "no purpose"}  ${age !== undefined ? `${age}d` : "-"}`;

  let reason;
  if (snapshot.id === survivor?.id) {
    console.log(`${desc}  kept (latest ready ${WARM_PURPOSE})`);
    kept++;
    continue;
  } else if (isProjectWarm(snapshot)) {
    reason = flags.all ? `${WARM_PURPOSE} (--all)` : `superseded ${WARM_PURPOSE}`;
  } else if (purpose === HOT_PURPOSE && snapshot.metadata?.project === PROJECT) {
    reason = `${HOT_PURPOSE} (secrets on board, always swept)`;
  } else if (!purpose) {
    reason = "debris (no purpose field)";
  } else {
    kept++;
    continue; // has a purpose, not ours to touch
  }

  if (snapshot.status === "deleting" || snapshot.status === "deleted") continue;
  if (snapshot.status === "pending") {
    console.log(`${desc}  skipped: still pending (a warm build may be running)`);
    kept++;
    continue;
  }

  if (dryRun) {
    console.log(`${desc}  would delete: ${reason}`);
  } else {
    await snapshot.delete();
    console.log(`${desc}  deleted: ${reason}`);
  }
}

console.log(`\n${kept} snapshot(s) kept.`);
if (flags.all && !dryRun) console.log(`No warm snapshot remains - the next ./morph task needs a ./morph warm first.`);
