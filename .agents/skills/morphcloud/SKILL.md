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
./morph warm                              # build/refresh the warm snapshot (manual, resumable)
./morph hot [--name <n>]         # hot snapshot: warm + secrets + open TUI, for phone devboxes
./morph task --name <name> "task description"   # fresh instance, opencode runs the task
./morph task --issue 42          # name issue-42 + generated work-this-issue prompt
./morph cmux --name <name>       # interactive opencode TUI in a cmux workspace
./morph attach                            # newest instance: connect info
./morph attach <id> --zed        # open repo in Zed over SSH
./morph attach <id> --cmux       # cmux workspace: agent session + preview
./morph status                            # list this project's instances
./morph snapshots list
./morph sleep                    # pause ALL project boxes (dry-run: --dry-run)
./morph reap                     # stop boxes whose done signal exists; skip the rest
./morph reap --force <id>...     # kill specific boxes unconditionally
./morph reap --force --all       # kill everything
./morph sweep                    # keep latest warm snapshot, delete superseded + debris
./morph sweep --all              # delete the latest warm snapshot too
```

## Workflow: run a task remotely

1. `./morph task --issue <n>` for issue work, or
   `--name <name> "<task>"` otherwise — the name is required (pick it,
   usually the issue number; it becomes the `sandbox/<name>` branch). A
   fresh instance starts every time (never reuse a running one — parallel
   tasks each get their own), the dev server comes up, and `opencode run`
   works in the `agent` tmux session. If it reports no warm snapshot, run
   `./morph warm` first (minutes, resumable).
2. Report the printed branch, preview URL, and attach commands to the
   user. The task runs unattended from here.
3. To check on it: `./morph attach <id>` for connect info, or
   `ssh <alias> 'tail -f /root/task.log'` for the live log. Detach from
   tmux with `Ctrl-b d` — `exit` kills the run.
4. Follow-ups and PR review feedback go to the *same* box through attach
   (a new `opencode run --continue` in the agent session), never a second
   `morph:task` for the same piece of work. The box has `gh` authenticated
   via the injected token, so the agent can read review comments and
   manage PRs/issues itself — e.g. `opencode run --continue "Read the
   review comments on our PR with gh, address them, commit and push."`
5. The remote agent finishes like a developer: it commits, pushes, opens
   a draft PR with `gh`, and touches `/root/.task-done` (the **done
   signal**) as its last action. The user reviews the PR; don't mark it
   ready yourself.

Done means: the task is running (or its draft PR exists), and the user
has the instance ID, preview URL, and attach commands.

## Cleanup

- `./morph sleep` pauses every project box immediately (busy or not).
- `./morph reap` stops boxes whose done signal exists — that file is the
  only test. No signal (agent failed, never pushed, or interactive box)
  means the box is left alone for inspection; after post-mortem, finish
  it with `./morph reap --force <id>`.
- `./morph sweep` keeps the latest ready warm snapshot and deletes
  superseded warm snapshots, ALL hot snapshots (they carry secrets),
  and all purpose-less snapshots (build debris). Never sweep while a
  warm build is running.
- All three take `--dry-run`; reap's dry-run briefly resumes paused
  boxes to check the signal, then re-pauses them.

## Rules

- Never put secrets in `morph:warm`'s snapshot layers or snapshot a task
  instance — task disks carry per-run credentials. The one deliberate
  exception is `./morph hot`: it bakes credentials into a snapshot so a
  dashboard devbox works from a phone. Hot snapshots are never shared
  and are all deleted by the next sweep.
- Every instance start goes through the scripts (they set TTLs); don't
  start instances via the SDK ad hoc.
- Reference: `docs/morphcloud-cheatsheet.md` (vocabulary, workflow),
  ADR-0006 (why instance-layer), `scripts/morph/` (implementation).
