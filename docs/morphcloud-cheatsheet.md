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
- One-time: `Include ~/.ssh/morph_config` at the **top** of
  `~/.ssh/config`, above any `Host` block — an Include after a Host line
  only applies inside that block. (The scripts print the line if it's
  missing.)

## Vocabulary

- **Warm snapshot** — the prebuilt VM image tasks start from: toolchain
  (node, git, tmux, opencode) + repo clone + `node_modules`. No secrets,
  no running dev server. Found by metadata (`purpose: warm-dev`), latest
  ready one wins.
- **Hot box** — a paused, wake-on-SSH instance made by `./morph hot` for
  working from a phone: caught up to main, credentials on disk, dev
  server running, opencode TUI open in the agent session. An SSH app
  connecting to it wakes it; it re-pauses after the TTL. Reap always
  skips it (no done signal) — finish it with `reap --force <id>` when
  back at the laptop. (Not a devbox: the devbox service can't start from
  personal snapshots, it's templates-only.) Phone setup:
  [iphone-hot-box-runbook.md](./iphone-hot-box-runbook.md) — set
  `MORPH_PHONE_PUBKEY` once and the phone's own key rides along on every
  hot box.
- **Task instance** — a fresh VM started from the warm snapshot for one
  task, TTL'd (default 2 h, then pause). Never reused, never snapshotted;
  its disk carries per-run secrets.
- **Catch-up** — the startup delta on a task instance: fetch `origin/main`,
  cut a `sandbox/<name>` branch (the name is required and yours to pick —
  usually an issue number), `npm install`.
- **Attach** — connecting to a live task instance: plain SSH, the agent's
  tmux session, Zed remote, or a cmux workspace.
- **Interactive instance** — same box, no scripted task: `morph:cmux`
  starts the opencode TUI in the agent tmux session and opens a cmux
  workspace on it. You steer; nothing pushes unless you make it. Detach or
  close cmux freely — the session survives, resume via
  `morph:attach -- <id> --cmux`.
- **Done signal** — `/root/.task-done`, touched by the task agent as its
  *last* action, after it pushed and opened its draft PR. Its presence is
  the only thing that makes a box reapable; a box without it is left alone
  (inspect, then targeted `reap --force`). Interactive boxes never have
  one.
- **Debris** — any snapshot with no `purpose` metadata field. Setup layers
  and bases never get metadata, so purpose-less means reproducible build
  leftovers; `sweep` deletes them account-wide.

## Commands

```sh
./morph warm                              # build/refresh the warm snapshot (manual, resumable)
./morph hot [--name <n>]         # paused wake-on-SSH box for phone sessions (secrets on disk!)
./morph task --name fix-pins "Implement X"   # fresh instance, opencode runs the task
./morph task --issue 42                      # name issue-42 + generated "work this issue" prompt
./morph task --issue 42 "guidance..."        # extra text appended to the generated prompt
./morph cmux --name experiments  # interactive: opencode TUI in a cmux workspace
./morph cmux --issue 42          # same, named issue-42
./morph attach                            # newest instance: print connect info
./morph attach <id> --zed        # open the repo in Zed over SSH
./morph attach <id> --cmux       # cmux workspace: agent session + preview pane
./morph status                            # what's running/burning money
./morph snapshots list
./morph sleep                    # pause ALL project boxes, busy or not
./morph reap                     # stop boxes with the done signal; skip the rest
./morph reap <id>...             # same rule, only these boxes
./morph reap --force <id>...     # kill these unconditionally
./morph reap --force --all       # kill everything (deliberate double flag)
./morph sweep                    # keep latest warm snapshot; delete superseded + hot-dev + debris
./morph sweep --all              # delete the latest warm snapshot too
```

`sleep`, `reap`, and `sweep` all take `--dry-run`. Reap's dry-run still
briefly resumes paused boxes to check the done signal (then re-pauses);
it stops nothing. Don't sweep while a `./morph warm` build is running —
its unfinished layers look like debris.

## Typical workflow

1. `./morph task --issue 42` — prints branch, preview URL, SSH
   alias, and attach commands, then returns; the agent keeps working on
   the box (it reads the issue itself with gh).
2. Watch or steer: `./morph attach <id> --cmux` (or `--zed`).
   Detach from tmux with `Ctrl-b d` — `exit` kills the run.
3. The agent finishes like a developer: commits, pushes, opens a
   **draft PR** with `gh`, verifies with `git status`, and touches the
   done signal as its last action (all auditable in `/root/task.log`).
   Review the PR, then mark ready or close.
4. Review feedback goes back to the *same* box: attach, then in the agent
   session run `opencode run --continue "Read the review comments on our
   PR with gh, address them, commit and push."` — gh is on the box and
   already authenticated via the injected token.
5. Boxes pause themselves at TTL. At the end of a session: `./morph
   sleep` to pause everything now, `./morph reap` to stop the done boxes,
   `./morph sweep` to delete stale snapshots. A box that failed or never
   pushed has no done signal — reap leaves it for post-mortem; finish
   with a targeted `./morph reap --force <id>`.

The agent-facing version lives at `.agents/skills/morphcloud/SKILL.md`
(symlinked from `.claude/skills/`). Decisions and rationale: ADR-0006 and
issue #11.
