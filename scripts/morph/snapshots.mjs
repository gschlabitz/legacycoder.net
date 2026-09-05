// List account snapshots.
//
//   npm run snapshots:list
//
// `snapshots create` was removed (issue #16): it produced purpose-less
// snapshots that npm run morph:sweep's debris rule would delete, and task disks
// carry per-run secrets so snapshotting them was never safe anyway.

import { ageInDays, createClient } from "./client.mjs";

const [command] = process.argv.slice(2);
if (command !== "list" && command !== undefined) {
  console.error(`Unknown command "${command}". Use: list`);
  process.exit(1);
}

const client = createClient();
const snapshots = (await client.snapshots.list()).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
for (const snapshot of snapshots) {
  const purpose = snapshot.metadata?.purpose ? ` [${snapshot.metadata.purpose}]` : "";
  const name = snapshot.metadata?.name ? ` ${snapshot.metadata.name}` : "";
  const age = ageInDays(snapshot.created);
  console.log(`${snapshot.id}  ${(snapshot.status ?? "?").padEnd(8)}  ${age !== undefined ? `${age}d` : "-"}${purpose}${name}`);
}
