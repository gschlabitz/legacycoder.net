---
name: morphcloud
description: Manage MorphCloud remote devboxes with the morphcloud CLI. Use when the user wants to run a coding agent on a remote devbox, parallelize tasks across devboxes, or mentions morphcloud, devboxes, or snapshots.
---

# MorphCloud devboxes

MorphCloud provides remote **devboxes** — cloud VMs for running coding agents in parallel, isolated from the local machine. A devbox is started from a **template** (or a saved **snapshot**), worked in over SSH, and saved back as a snapshot to preserve its state.

Requires the `morphcloud` CLI (`pipx install morphcloud`) and a `MORPH_API_KEY` environment variable. If a command fails with an auth error, ask the user to set the key — never enter or store it yourself.

## Prefer project wrappers

If the current project's `package.json` has `morph:*` or `snapshots:*` scripts, use those (`npm run morph:status`, `npm run morph:task -- "…"`) — they encode project defaults like the template ID. Fall back to the raw CLI below otherwise.

## Core commands

```sh
morphcloud devbox list                          # all devboxes + status
morphcloud devbox start <template-id> --name <name>
morphcloud devbox ssh <devbox-id>               # interactive session
morphcloud devbox ssh <devbox-id> <command...>  # run one remote command
morphcloud devbox save <devbox-id> <name>       # snapshot current state
morphcloud snapshot list                        # saved snapshots
morphcloud devbox pause <devbox-id>             # stop billing, keep state
morphcloud devbox resume <devbox-id>
morphcloud devbox delete <devbox-id>
```

Long-running work belongs in a **terminal** (a tmux session on the devbox) so it survives SSH disconnects:

```sh
morphcloud devbox terminal start <devbox-id> --name <session>
morphcloud devbox terminal list <devbox-id>
morphcloud devbox terminal connect <devbox-id> <session>
```

Add `--json` to `list`/`start`/`save` when you need to parse the output.

## Workflow: run an agent task remotely

1. **Find or start a devbox.** `morphcloud devbox list` — reuse a READY devbox for the project if one exists; otherwise `morphcloud devbox start <template-id>`. Template IDs are project-specific; look in the project's npm scripts or docs, and ask the user if none is recorded.
2. **Start a terminal** on the devbox named after the task, so the run is detachable and inspectable later.
3. **Send the task** to the coding agent inside that terminal, e.g. `claude -p "<task>"` (or the agent the user names).
4. **Check on it** with `terminal connect`; detach with the tmux detach key (`Ctrl-b d`) — never `exit`, which kills the run.
5. **Save a snapshot** (`devbox save <devbox-id> <descriptive-name>`) once the work reaches a state worth keeping, and report the devbox ID and connect command to the user.

Done means: the task is running (or finished) on the devbox, and the user has the devbox ID plus the exact command to attach to it.
