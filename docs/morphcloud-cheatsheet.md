# MorphCloud cheat sheet

Remote devboxes for running coding agents in parallel, off the local machine.

## Prerequisites

- CLI: `pipx install morphcloud`
- Auth: `MORPH_API_KEY` in `~/.zprofile`
- New devbox from scratch: a template ID in `MORPH_TEMPLATE`
  (`morphcloud devbox template list` — first-time setup for this project is TBD)

## Concepts

- **Devbox** — a cloud VM started from a template or snapshot. Statuses:
  READY (billing, usable), PAUSED (state kept, no billing).
- **Snapshot** — a saved VM state; restartable later, the unit of "save my work".
- **Template** — a base definition new devboxes start from.
- **Terminal** — a tmux session on the devbox; long-running agent work lives
  here so it survives SSH disconnects.

## npm shortcuts (this repo)

```sh
npm run morph:status                     # list devboxes
npm run snapshots:list                   # list snapshots
npm run snapshots:create -- <id> <name>  # snapshot a devbox
npm run morph:task -- "Implement issue X"  # start/reuse devbox, send task to agent
```

`morph:task` reuses a READY devbox tagged `project=legacycoder.net`, or starts
one from `MORPH_TEMPLATE`. The agent it launches defaults to `claude`;
override with `MORPH_AGENT=codex npm run morph:task -- "…"`.

## Raw CLI

```sh
morphcloud devbox list
morphcloud devbox start <template-id> --name <name>
morphcloud devbox ssh <devbox-id>                # interactive
morphcloud devbox ssh <devbox-id> <command>      # one-shot remote command
morphcloud devbox save <devbox-id> <name>        # snapshot
morphcloud devbox pause <devbox-id>              # stop billing, keep state
morphcloud devbox resume <devbox-id>
morphcloud devbox delete <devbox-id>

morphcloud snapshot list

morphcloud devbox terminal start <devbox-id> --name <session>
morphcloud devbox terminal list <devbox-id>
morphcloud devbox terminal connect <devbox-id> <session>
```

## Typical workflow

1. `npm run morph:task -- "Implement issue X"` — prints the devbox ID and
   connect command.
2. Check in: `morphcloud devbox terminal connect <id> <session>`;
   detach with `Ctrl-b d` (not `exit`, which kills the run).
3. Happy with the state? `npm run snapshots:create -- <id> issue-x-done`.
4. Done for the day: `morphcloud devbox pause <id>`.

The agent-facing version of this lives at `.agents/skills/morphcloud/SKILL.md`
in this repo (symlinked from `.claude/skills/`); extract it to the dotfiles
repo later if it proves universal.
