# Drive Morph at the instance layer, not the devbox service

The `morph:*` scripts talk to Morph Cloud exclusively through the
`morphcloud` npm SDK's VM primitives — images, snapshots, instances — and
never through the devbox service (templates, managed terminals, dashboard
workspaces). Morph markets devboxes as *the* way to run coding agents, so
a future reader will wonder why this repo bypasses them: everything the
workflow needs exists on the primitives (tmux over SSH replaces managed
terminals, `exposeHttpService` replaces previews, `sshKey()` feeds the SSH
config that Zed and cmux attach through), and the devbox layer's actual
value — the web dashboard, org share links — duplicates what cmux and Zed
already provide for a solo developer. Staying instance-native keeps one
toolchain (Node) with no pipx/Python CLI prerequisite, and unlocks the two
SDK features the devbox surface hides: `snapshot.setup()` layer-cached
builds and `instance.branch()` fan-out. The alternative — devboxes started
from a template bridged to an SDK-built snapshot — was designed first and
rejected as two toolchains for zero added capability.

The same review settled how work leaves a box: the instance pushes a
`sandbox/<name>` branch and opens a draft PR, authorized by a
fine-grained PAT (`MORPH_GIT_TOKEN`, contents + pull-requests on this repo
only) injected at exec time. Pull-based review (fetching from the box over
SSH, no credential on the box at all) was the safer alternative and was
rejected for workflow friction.

Consequences worth knowing:

- Secrets (the PAT, opencode credentials) reach a box only at task launch
  and only onto its ephemeral disk. Nothing secret may enter a
  `snapshot.setup()` layer — warm snapshots must stay shareable — and task
  instances are never snapshotted by default for the same reason.
- The warm snapshot is toolchain + repo + `node_modules` only; the dev
  server starts per task. Rebuilds are manual (`morph:warm`), and every
  instance start sets a TTL (`pause`), so no box outlives its usefulness
  by more than the TTL.
- SSH aliases live in `~/.ssh/morph_config`, a file the scripts fully own
  and rewrite; the user's `~/.ssh/config` gets a single manual `Include`
  line and is never edited by code.
- If team-style sharing or the dashboard UX ever matters, the devbox
  service can be layered back on top — devboxes are views over these same
  instances — without discarding the snapshot build.
