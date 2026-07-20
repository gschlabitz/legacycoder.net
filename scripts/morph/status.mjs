// List this project's Morph instances - the "what's burning money" view.
//
//   ./morph status

import { ageInDays, createClient, hostAlias, previewUrl, projectInstances } from "./client.mjs";

const client = createClient();
const instances = (await projectInstances(client)).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

if (!instances.length) {
  console.log("No instances. Start one with: ./morph task --issue <n>");
  process.exit(0);
}

for (const instance of instances) {
  const age = ageInDays(instance.created);
  console.log(
    [
      instance.id,
      (instance.status ?? "?").padEnd(8),
      (instance.metadata?.task ?? instance.metadata?.name ?? "-").padEnd(24),
      age !== undefined ? `${age}d` : "-",
      previewUrl(instance) ?? "",
    ].join("  "),
  );
  console.log(`  ssh ${hostAlias(instance)}`);
}
