# Morph task instances

Coding agents run on Morph Cloud VMs at the instance layer — no devbox
service, no Python CLI. One **task instance** per task, started fresh from
a **warm snapshot** (toolchain + repo + `node_modules`), driven by
**opencode**, TTL'd so nothing runs forever.

Requires `MORPH_API_KEY` and `MORPH_GIT_TOKEN` in the environment and a
logged-in local opencode.

## Commands

Run `npm run` to list commands. Put `--` before arguments passed to a script.

```sh
npm run morph:warm  # build/refresh the warm snapshot (manual, resumable)
npm run morph:hot -- [--name <n>]  # paused wake-on-SSH box (secrets + open TUI) for phone sessions
npm run morph:task -- --name <name> "task description"  # fresh instance, opencode runs the task
npm run morph:task -- --issue 42  # name issue-42 + generated work-this-issue prompt
npm run morph:cmux -- --name <name>  # interactive opencode TUI in a cmux workspace
npm run morph:attach  # newest instance: connect info
npm run morph:attach -- <id> --zed  # open repo in Zed over SSH
npm run morph:attach -- <id> --cmux  # cmux workspace: agent session + preview
npm run morph:status  # list this project's instances
npm run snapshots:list
npm run morph:sleep  # pause ALL project boxes (dry-run: --dry-run)
npm run morph:reap  # stop boxes whose done signal exists; skip the rest
npm run morph:reap -- --force <id>...  # kill specific boxes unconditionally
npm run morph:reap -- --force --all  # kill everything
npm run morph:sweep  # keep latest warm snapshot, delete superseded + debris
npm run morph:sweep -- --all  # delete the latest warm snapshot too
```

## Running a task

1. `npm run morph:task -- --issue <n>` for issue work, or `--name <name> "<task>"`
   otherwise — the name becomes the `sandbox/<name>` branch. A fresh
   instance starts every time (never reuse a running one — parallel tasks
   each get their own), the dev server comes up, and `opencode run` works
   in the `agent` tmux session. If it reports no warm snapshot, run
   `npm run morph:warm` first (minutes, resumable).
2. Check on it with `npm run morph:attach -- <id>` for connect info, or
   `ssh <alias> 'tail -f /root/task.log'` for the live log. Detach from
   tmux with `Ctrl-b d` — `exit` kills the run.
3. Follow-ups and PR review feedback go to the *same* box through attach
   (a new `opencode run --continue` in the agent session), never a second
   task instance for the same piece of work. The box has `gh`
   authenticated via the injected token, so the agent can read review
   comments and manage PRs/issues itself.
4. The remote agent finishes like a developer: it commits, pushes, opens a
   draft PR with `gh`, and touches `/root/.task-done` (the **done
   signal**) as its last action. Review the PR before marking it ready.

## Cleanup

- `npm run morph:sleep` pauses every project box immediately (busy or not).
- `npm run morph:reap` stops boxes whose done signal exists — that file is the
  only test. No signal (agent failed, never pushed, or interactive box)
  means the box is left alone for inspection; after post-mortem, finish
  it with `npm run morph:reap -- --force <id>`.
- `npm run morph:sweep` keeps the latest ready warm snapshot and deletes
  superseded warm snapshots, any hot-dev snapshots (they carry secrets),
  and all purpose-less snapshots (build debris). Never sweep while a warm
  build is running.
- Hot boxes (`npm run morph:hot`) are paused wake-on-SSH instances for phone
  sessions; reap always skips them — finish one with
  `npm run morph:reap -- --force <id>`.
- All three take `--dry-run`; reap's dry-run briefly resumes paused boxes
  to check the signal, then re-pauses them.

## Rules

- Never put secrets in the warm snapshot's layers, and never snapshot a
  task instance — task disks carry per-run credentials. Hot boxes carry
  the same per-run secrets on a paused disk, deliberately longer-lived;
  never snapshot one either.
- Every instance start goes through these scripts (they set TTLs); don't
  start instances via the SDK ad hoc.
- Reference: [`docs/morphcloud-cheatsheet.md`](../../docs/morphcloud-cheatsheet.md)
  (vocabulary, workflow).
