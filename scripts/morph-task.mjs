// Send a task to a coding agent on a MorphCloud devbox and detach.
//
//   npm run morph:task -- "Implement issue 42"
//
// Finds a READY devbox for this project (metadata project=legacycoder.net)
// or starts a fresh one from MORPH_TEMPLATE, then runs the agent inside a
// tmux session on the devbox so the work survives the SSH disconnect. The
// agent command is configurable via MORPH_AGENT (default `claude`). Prints
// the devbox ID and the connect command for human follow-up.
//
// Requires the `morphcloud` CLI (pipx install morphcloud) and MORPH_API_KEY.

import { execFileSync } from "node:child_process";

const PROJECT = "legacycoder.net";
const task = process.argv.slice(2).join(" ").trim();
if (!task) {
  console.error('Usage: npm run morph:task -- "Implement issue X"');
  process.exit(1);
}

const agent = process.env.MORPH_AGENT ?? "claude";

function morph(args, opts = {}) {
  return execFileSync("morphcloud", args, { encoding: "utf8", ...opts });
}

// Reuse a running devbox tagged for this project before paying for a new one.
const devboxes = JSON.parse(morph(["devbox", "list", "--json"]));
let devbox = devboxes.find(
  (d) => d.status === "READY" && d.metadata?.project === PROJECT
);

if (devbox) {
  console.log(`Reusing devbox ${devbox.id} (${devbox.name ?? "unnamed"})`);
} else {
  const template = process.env.MORPH_TEMPLATE;
  if (!template) {
    console.error(
      `No READY devbox tagged project=${PROJECT} and MORPH_TEMPLATE is unset.\n` +
        "Set MORPH_TEMPLATE to a template ID (morphcloud devbox template list)."
    );
    process.exit(1);
  }
  console.log(`Starting devbox from template ${template}…`);
  devbox = JSON.parse(
    morph([
      "devbox",
      "start",
      template,
      "--name",
      `${PROJECT} task`,
      "--metadata",
      `project=${PROJECT}`,
      "--json",
    ])
  );
  console.log(`Started devbox ${devbox.id}`);
}

// One session per run; tmux keeps the agent alive after we detach.
const session = `task-${Date.now().toString(36)}`;
morph(["devbox", "terminal", "start", devbox.id, "--name", session], {
  stdio: "inherit",
});

// Send the task into the session and hand the keys back to the human.
const remote = `tmux send-keys -t ${session} ${shellQuote(
  `${agent} ${shellQuote(task)}`
)} Enter`;
morph(["devbox", "ssh", devbox.id, remote], { stdio: "inherit" });

console.log(`\nTask sent to ${agent} on devbox ${devbox.id}.`);
console.log("Follow along with:");
console.log(`  morphcloud devbox terminal connect ${devbox.id} ${session}`);
console.log(`Or SSH in directly:`);
console.log(`  morphcloud devbox ssh ${devbox.id}`);

function shellQuote(s) {
  return `'${s.replaceAll("'", `'\\''`)}'`;
}
