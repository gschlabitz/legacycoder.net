// Snapshot management via the SDK.
//
//   ./morph snapshots list
//   npm run snapshots:create -- <instance-id> <name>
//
// Note: task instances are meant to stay unsnapshotted (their disks carry
// per-run secrets); snapshots:create exists for deliberate exceptions.

import { WARM_PURPOSE, ageInDays, createClient } from "./client.mjs";

const [command, ...rest] = process.argv.slice(2);
const client = createClient();

if (command === "list" || command === undefined) {
  const snapshots = (await client.snapshots.list()).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  for (const snapshot of snapshots) {
    const warm = snapshot.metadata?.purpose === WARM_PURPOSE ? ` [${WARM_PURPOSE}]` : "";
    const name = snapshot.metadata?.name ? ` ${snapshot.metadata.name}` : "";
    const age = ageInDays(snapshot.created);
    console.log(`${snapshot.id}  ${(snapshot.status ?? "?").padEnd(8)}  ${age !== undefined ? `${age}d` : "-"}${warm}${name}`);
  }
} else if (command === "create") {
  const [instanceId, name] = rest;
  if (!instanceId || !name) {
    console.error("Usage: ./morph snapshots create <instance-id> <name>");
    process.exit(1);
  }
  console.warn("Heads up: task instances carry per-run secrets on disk - only snapshot boxes you provisioned clean.");
  const instance = await client.instances.get({ instanceId });
  const snapshot = await instance.snapshot();
  await snapshot.setMetadata({ ...snapshot.metadata, name });
  console.log(`Snapshot ${snapshot.id} ("${name}") created from ${instanceId}.`);
} else {
  console.error(`Unknown command "${command}". Use: list | create`);
  process.exit(1);
}
