# iPhone runbook: work on a hot box from the phone

Goal: `./morph hot` before heading out, then from the phone an SSH app
wakes the paused box and drops you into the opencode TUI. One-time setup
gives the phone a permanent key, so per-outing setup is just updating a
username.

## One-time setup

### 1. Create the phone's key

**Termius (preferred — SSH ID):** Settings → **SSH ID** → follow the
guided setup and pick a handle. This creates a device-bound passkey:
the private key is generated on the phone, can't be exported, and each
use is gated by Face ID — no passphrase needed. Your public keys are
published at `https://sshid.io/<handle>` (public keys are not secrets;
that's the point of the page).

**Termius (manual alternative):** Keychain → **+** → **Generate Key** →
type **ED25519**, name it `morph-phone` → Generate → copy the public
key.

**Blink:** Settings → Keys → **+** → Generate New Key → ED25519, name
`morph-phone` → Copy Public Key.

### 2. Get the public key to the Mac

**With SSH ID:** fetch it straight from the key page:

```sh
curl -fs https://sshid.io/<handle>
```

(One line per device you enabled SSH ID on — include the line(s) you
want the boxes to trust.)

**Manual key:** any channel is fine — AirDrop a note, iMessage it to
yourself, Universal Clipboard. It's one line that looks like:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... morph-phone
```

### 3. Add it to `~/.zshenv` next to the other morph variables

```sh
export MORPH_PHONE_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... morph-phone"
```

New shells pick it up; for the current one, `source ~/.zshenv`. (Paste
the key line itself, not the curl command — `~/.zshenv` runs on every
shell start, and a network call there would slow all of them down.
Multiple lines from sshid.io are fine inside the quotes.)

### 4. Create the host entry in the SSH app

**Termius:** Hosts → **+** → New Host:

- Label: `morph hot`
- Hostname: `ssh.cloud.morph.so`, port `22`
- Username: *(leave blank for now — it's per-box, see below)*
- Key: the SSH ID passkey (or `morph-phone` if you generated manually)

**Blink:** Settings → Hosts → **+**, same values.

## Per outing

### 5. Build the hot box (laptop, before heading out)

```sh
./morph hot
```

It prints the instance id (e.g. `morphvm_2vrcn62h`) and confirms the
phone key is on the box. The box is left **paused** — costing storage,
not compute.

### 6. Update the username on the phone

Edit the `morph hot` host entry and set **Username** to the printed
instance id. That's the only per-outing step on the phone.

### 7. Connect

Open the host. The connection itself wakes the box (allow ~5–10 s for
the first prompt). Then:

```sh
tmux attach -t agent
```

The opencode TUI is already open. The `dev` session runs the dev server;
the preview URL printed by `hot` also wakes the box and works in mobile
Safari.

Useful in Termius: the on-screen key bar has Ctrl — detach from tmux
with `Ctrl-b` then `d`. Detaching (or losing signal) is safe; the box
re-pauses on its own after the TTL (default 120 min after each wake).

## Back at the laptop

```sh
./morph reap --force <instance-id>   # the box (secrets on its disk)
./morph sweep                        # any stale snapshots
```

Reap always *skips* hot boxes (they never have a done signal), so the
targeted `--force` is the intended way to finish one.

## Troubleshooting

- **Permission denied (publickey):** the box was built without
  `MORPH_PHONE_PUBKEY` in the environment — rebuild with `./morph hot`,
  or fall back to importing the per-instance key it printed
  (`~/.ssh/morph/<instance-id>.pem`).
- **Connection times out:** paused boxes take a few seconds to wake;
  retry once. Check `./morph status` from a laptop if it persists.
- **TUI looks garbled:** resize the terminal once (rotate the phone or
  toggle the keyboard) — tmux redraws.
