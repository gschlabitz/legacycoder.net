// Build (or refresh) the warm snapshot: toolchain + repo clone + node_modules,
// nothing else. The dev server starts per task, not here, and no secret ever
// enters a setup() layer - snapshots must stay shareable (issue #11).
//
//   npm run morph:warm
//   npm run morph:warm -- --vcpus 4 --memory 8192 --disk 32768
//
// Each setup() layer is cached by a chain hash: re-running after a failure
// resumes from the last completed layer instead of rebuilding. Rebuilds are
// manual and create a new snapshot; morph:task always picks the latest ready
// one (metadata purpose=warm-dev). Old ones linger until a future morph:sweep.

import { parseArgs } from "node:util";
import { PROJECT, REPO_PATH, REPO_URL, WARM_PURPOSE, createClient } from "./client.mjs";

const { values: flags } = parseArgs({
  options: {
    vcpus: { type: "string", default: "2" },
    memory: { type: "string", default: "4096" },
    disk: { type: "string", default: "16384" },
    image: { type: "string", default: "morphvm-minimal" },
  },
});

const client = createClient();

console.log(`Creating base snapshot from ${flags.image} (${flags.vcpus} vCPU, ${flags.memory} MB, ${flags.disk} MB disk)...`);
const base = await client.snapshots.create({
  imageId: flags.image,
  vcpus: Number(flags.vcpus),
  memory: Number(flags.memory),
  diskSize: Number(flags.disk),
});

function commandBlock(lines) {
  return ["set -euo pipefail", ...lines].join("\n");
}

console.log("Layer 1/3: node LTS, git, tmux, opencode (slowest layer)...");
const provisioned = await base.setup(
  commandBlock([
    "export DEBIAN_FRONTEND=noninteractive",
    "apt-get update",
    "apt-get install -y --no-install-recommends git curl ca-certificates tmux",
    "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
    "apt-get install -y nodejs",
    "node --version && npm --version",
    // gh so agents can read/manage PRs and issues; it auths via the GH_TOKEN
    // env var injected per run - no login, no credential in this layer.
    "mkdir -p -m 755 /etc/apt/keyrings",
    "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg",
    "chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg",
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list',
    "apt-get update",
    "apt-get install -y gh",
    "gh --version",
    "npm install -g opencode-ai",
    "opencode --version",
  ]),
);
console.log(`  -> ${provisioned.id}`);

console.log("Layer 2/3: clone repo (public, no credentials)...");
const cloned = await provisioned.setup(
  commandBlock([`rm -rf ${REPO_PATH}`, `git clone ${REPO_URL} ${REPO_PATH}`]),
);
console.log(`  -> ${cloned.id}`);

console.log("Layer 3/3: npm install...");
const installed = await cloned.setup(commandBlock([`cd ${REPO_PATH}`, "npm install"]));
console.log(`  -> ${installed.id}`);

// Merge, never replace: setup() keeps its chain hash in metadata, and
// clobbering it would break layer-cache resume for the next rebuild.
await installed.setMetadata({
  ...installed.metadata,
  project: PROJECT,
  purpose: WARM_PURPOSE,
});

console.log(`\nWarm snapshot ready: ${installed.id}`);
console.log(`morph:task will pick it up automatically (latest ready ${WARM_PURPOSE} for ${PROJECT}).`);
