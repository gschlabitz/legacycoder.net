---
name: morphcloud
description: Run coding tasks on Morph Cloud VMs via this repo's morph:* npm scripts. Use when the user wants to run a coding agent on a remote instance, parallelize tasks across cloud VMs, or mentions morph, warm snapshots, or task instances.
---

# Morph task instances

This repo runs coding agents on Morph Cloud VMs at the instance layer —
no devbox service, no Python CLI (ADR-0006). One **task instance** per
task, started fresh from a **warm snapshot** (toolchain + repo +
`node_modules`), driven by **opencode**, TTL'd so nothing runs forever.

Requires `MORPH_API_KEY` and `MORPH_GIT_TOKEN` in the environment and a
logged-in local opencode. If a command fails on a missing key, ask the
user to set it — never handle the values yourself.

## Commands

```sh
npm run morph:warm                        # build/refresh the warm snapshot (manual, resumable)
npm run morph:task -- "task description"  # fresh instance, opencode runs the task
npm run morph:task -- --ttl 240 "task"    # longer TTL (minutes)
npm run morph:cmux                        # interactive opencode TUI in a cmux workspace
npm run morph:attach                      # newest instance: connect info
npm run morph:attach -- <id> --zed        # open repo in Zed over SSH
npm run morph:attach -- <id> --cmux       # cmux workspace: agent session + preview
npm run morph:status                      # list this project's instances
npm run snapshots:list
```

## Workflow: run a task remotely

1. `npm run morph:task -- "<task>"`. It starts a fresh instance (never
   reuse a running one — parallel tasks each get their own), cuts a
   `sandbox/` branch, starts the dev server, and leaves `opencode run`
   working in the `agent` tmux session. If it reports no warm snapshot,
   run `npm run morph:warm` first (minutes, resumable).
2. Report the printed branch, preview URL, and attach commands to the
   user. The task runs unattended from here.
3. To check on it: `npm run morph:attach -- <id>` for connect info, or
   `ssh <alias> 'tail -f /root/task.log'` for the live log. Detach from
   tmux with `Ctrl-b d` — `exit` kills the run.
4. Follow-ups and PR review feedback go to the *same* box through attach
   (a new `opencode run --continue` in the agent session), never a second
   `morph:task` for the same piece of work. The box has `gh` authenticated
   via the injected token, so the agent can read review comments and
   manage PRs/issues itself — e.g. `opencode run --continue "Read the
   review comments on our PR with gh, address them, commit and push."`
5. When the agent finishes with commits, a draft PR opens automatically —
   the user reviews it; don't mark it ready yourself.

Done means: the task is running (or its draft PR exists), and the user
has the instance ID, preview URL, and attach commands.

## Rules

- Never put secrets in `morph:warm`'s snapshot layers or snapshot a task
  instance — task disks carry per-run credentials.
- Every instance start goes through the scripts (they set TTLs); don't
  start instances via the SDK ad hoc.
- Reference: `docs/morphcloud-cheatsheet.md` (vocabulary, workflow),
  ADR-0006 (why instance-layer), `scripts/morph/` (implementation).
