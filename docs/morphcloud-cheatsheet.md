# Morph cheat sheet

Fresh cloud VMs per coding task, driven by opencode, attached via cmux or
Zed. Instance-native — no devbox service, no Python CLI (ADR-0006).

## Prerequisites

- `MORPH_API_KEY` and `MORPH_GIT_TOKEN` in `~/.zshenv` (non-login shells —
  npm scripts, agents — read only that file, not `.zprofile`).
  `MORPH_GIT_TOKEN` is a fine-grained PAT for this repo: contents,
  pull-requests, and issues — read/write. (It doubles as `GH_TOKEN` on the
  box, so agents can run `gh` to read reviews and manage PRs/tickets.)
- Local opencode logged in (`opencode auth login`) — its credentials are
  copied to the box per run.
- One-time: `Include ~/.ssh/morph_config` in `~/.ssh/config` (the scripts
  print the line if it's missing).

## Vocabulary

- **Warm snapshot** — the prebuilt VM image tasks start from: toolchain
  (node, git, tmux, opencode) + repo clone + `node_modules`. No secrets,
  no running dev server. Found by metadata (`purpose: warm-dev`), latest
  ready one wins.
- **Task instance** — a fresh VM started from the warm snapshot for one
  task, TTL'd (default 2 h, then pause). Never reused, never snapshotted;
  its disk carries per-run secrets.
- **Catch-up** — the startup delta on a task instance: fetch `origin/main`,
  cut a `sandbox/<slug>-<timestamp>` branch, `npm install`.
- **Attach** — connecting to a live task instance: plain SSH, the agent's
  tmux session, Zed remote, or a cmux workspace.
- **Interactive instance** — same box, no scripted task: `morph:cmux`
  starts the opencode TUI in the agent tmux session and opens a cmux
  workspace on it. You steer; nothing pushes unless you make it. Detach or
  close cmux freely — the session survives, resume via
  `morph:attach -- <id> --cmux`.

## Commands

```sh
npm run morph:warm                        # build/refresh the warm snapshot (manual, resumable)
npm run morph:task -- "Implement X"       # fresh instance, opencode runs the task
npm run morph:task -- --ttl 240 "Big X"   # longer TTL (minutes)
npm run morph:cmux                        # interactive: opencode TUI in a cmux workspace
npm run morph:cmux -- --name experiments  # names the box and its sandbox/ branch
npm run morph:attach                      # newest instance: print connect info
npm run morph:attach -- <id> --zed        # open the repo in Zed over SSH
npm run morph:attach -- <id> --cmux       # cmux workspace: agent session + preview pane
npm run morph:status                      # what's running/burning money
npm run snapshots:list
npm run snapshots:create -- <id> <name>   # deliberate exception only (see vocabulary)
```

## Typical workflow

1. `npm run morph:task -- "Implement issue X"` — prints branch, preview
   URL, SSH alias, and attach commands, then returns; the agent keeps
   working on the box.
2. Watch or steer: `npm run morph:attach -- <id> --cmux` (or `--zed`).
   Detach from tmux with `Ctrl-b d` — `exit` kills the run.
3. When the agent finishes with commits, a **draft PR** opens
   automatically as gschlabitz. Review, then mark ready or close.
4. Review feedback goes back to the *same* box: attach, then in the agent
   session run `opencode run --continue "Read the review comments on our
   PR with gh, address them, commit and push."` — gh is on the box and
   already authenticated via the injected token.
5. Boxes pause themselves at TTL. Cleanup of stale instances/snapshots is
   manual for now (`morph:status`, dashboard) — a `morph:sweep` command is
   planned.

The agent-facing version lives at `.agents/skills/morphcloud/SKILL.md`
(symlinked from `.claude/skills/`). Decisions and rationale: ADR-0006 and
issue #11.
