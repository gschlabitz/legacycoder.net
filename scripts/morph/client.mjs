// Shared plumbing for the morph:* scripts (ADR-0006: instance layer, no
// devbox service). Centralizes client construction, the warm-snapshot
// metadata convention, SSH access material, and the managed SSH include
// file that Zed, cmux, and plain ssh all resolve aliases through.

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MorphCloudClient } from "morphcloud";

export const PROJECT = "legacycoder.net";
export const WARM_PURPOSE = "warm-dev";
export const REPO_PATH = "/root/legacycoder.net";
export const REPO_URL = "https://github.com/gschlabitz/legacycoder.net.git";
export const REPO_SLUG = "gschlabitz/legacycoder.net";
export const DEV_PORT = 4321;
export const AGENT_SESSION = "agent";
export const DEV_SESSION = "dev";

// Morph exposes sshd directly on :22; the username is the instance id and
// each instance has its own key pair.
const SSH_HOSTNAME = process.env.MORPH_SSH_HOSTNAME ?? "ssh.cloud.morph.so";
const SSH_PORT = process.env.MORPH_SSH_PORT ?? "22";
const SSH_DIR = join(homedir(), ".ssh");
const KEY_DIR = join(SSH_DIR, "morph");
export const MORPH_SSH_CONFIG = join(SSH_DIR, "morph_config");

export function createClient() {
  const apiKey = process.env.MORPH_API_KEY;
  if (!apiKey) {
    console.error("MORPH_API_KEY is not set. Add it to ~/.zshenv (non-login shells read only that file).");
    process.exit(1);
  }
  return new MorphCloudClient({ apiKey });
}

export async function latestWarmSnapshot(client) {
  const snapshots = await client.snapshots.list();
  const warm = snapshots
    .filter(
      (s) => s.metadata?.purpose === WARM_PURPOSE && s.metadata?.project === PROJECT && s.status === "ready",
    )
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  return warm[0];
}

export async function projectInstances(client) {
  const instances = await client.instances.list();
  return instances.filter((i) => i.metadata?.project === PROJECT);
}

// "lc-" (legacycoder) rather than "morph-": shorter, can't collide with
// other projects' morph aliases, and the redundant morphvm_ prefix goes.
export function hostAlias(instance) {
  return `lc-${instance.id.replace(/^morphvm_/, "")}`.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function previewUrl(instance) {
  return instance.networking?.httpServices?.find((s) => s.name === "dev")?.url;
}

/** Fetch the instance's key, store it under ~/.ssh/morph/, return connect details. */
export async function sshAccess(instance) {
  const key = await instance.sshKey();
  mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  const keyPath = join(KEY_DIR, `${instance.id}.pem`);
  writeFileSync(keyPath, key.private_key, { mode: 0o600 });
  chmodSync(keyPath, 0o600);

  const alias = hostAlias(instance);
  return {
    alias,
    keyPath,
    sshCommand: `ssh ${alias}`,
    configEntry: [
      `Host ${alias}`,
      `  HostName ${SSH_HOSTNAME}`,
      `  User ${instance.id}`,
      `  Port ${SSH_PORT}`,
      `  IdentityFile ${keyPath}`,
      "  IdentitiesOnly yes",
      "  StrictHostKeyChecking accept-new",
    ].join("\n"),
  };
}

/**
 * Rewrite ~/.ssh/morph_config from the live project instances — the file is
 * fully owned by these scripts, so dead instances are pruned by omission.
 * Never touches ~/.ssh/config itself; returns false when the one-time
 * Include line is still missing there so callers can print it.
 */
export async function syncSshConfig(client) {
  const instances = (await projectInstances(client)).filter((i) => i.status !== "error");
  const entries = [];
  for (const instance of instances) {
    const access = await sshAccess(instance);
    entries.push(access.configEntry);
  }
  const header = "# Managed by scripts/morph/client.mjs (legacycoder.net) - do not edit, entries are rewritten.";
  mkdirSync(SSH_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(MORPH_SSH_CONFIG, [header, ...entries].join("\n\n") + "\n", { mode: 0o600 });

  const mainConfig = join(SSH_DIR, "config");
  const includeLine = `Include ${MORPH_SSH_CONFIG}`;
  const hasInclude =
    existsSync(mainConfig) && readFileSync(mainConfig, "utf8").split("\n").some((l) => l.trim() === includeLine);
  if (!hasInclude) {
    console.error(
      `\nSSH aliases won't resolve yet - add this line at the TOP of ${mainConfig} (above any Host block; an Include after a Host line only applies inside that block):\n\n  ${includeLine}\n`,
    );
  }
  return hasInclude;
}

/** Run a command on the instance, streaming output; throw on non-zero exit. */
export async function execStep(instance, step, command) {
  console.log(`[${instance.id}] ${step}...`);
  const result = await instance.exec(command, {
    onStdout: (chunk) => process.stdout.write(chunk),
    onStderr: (chunk) => process.stderr.write(chunk),
  });
  if (result.exit_code !== 0) {
    throw new Error(`Step "${step}" failed on ${instance.id} with exit code ${result.exit_code}.`);
  }
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

export function ageInDays(createdSeconds) {
  if (!createdSeconds) return undefined;
  return Math.floor((Date.now() / 1000 - createdSeconds) / 86400);
}
